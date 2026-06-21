from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List

import yfinance as yf
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from server.dukascopy_forex import fetch_dukascopy_candles, fetch_dukascopy_quotes
from server.finnhub_forex import (
    fetch_finnhub_candles,
    fetch_finnhub_quotes,
    finnhub_api_key,
)
from server.forex_precision import is_metal_symbol, normalize_forex_candles, round_forex_price
from server.forex_symbols import (
    FOREX_UNIVERSE,
    search_symbols as search_forex_symbols,
    to_yfinance_symbol as to_yfinance_forex_symbol,
)
from server.india_symbols import (
    build_symbol_universe,
    search_symbols,
    to_yfinance_symbol,
)

app = FastAPI(title="Trading Panel India API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYMBOL_UNIVERSE: List[dict] = []

INTERVAL_MAP = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "1h": "1h",
    "4h": "1h",
    "1d": "1d",
    "1w": "1wk",
    "1M": "1mo",
}

# yfinance intraday limits — use period that fits interval
PERIOD_BY_INTERVAL = {
    "1m": "7d",
    "5m": "60d",
    "15m": "60d",
    "1h": "730d",
    "4h": "730d",
    "1d": "5y",
    "1w": "10y",
    "1M": "max",
}


@app.on_event("startup")
def load_symbols():
    global SYMBOL_UNIVERSE
    SYMBOL_UNIVERSE = build_symbol_universe()
    print(f"Loaded {len(SYMBOL_UNIVERSE)} India symbols (NSE stocks + indices)")


@app.get("/api/health")
def health():
    return {"ok": True, "symbols": len(SYMBOL_UNIVERSE), "forex": len(FOREX_UNIVERSE)}


@app.get("/api/forex/symbols")
def forex_symbols(q: str = Query("", alias="q"), limit: int = 50):
    return search_forex_symbols(FOREX_UNIVERSE, q, min(limit, 100))


@app.get("/api/forex/history")
def forex_history(
    symbol: str = Query(..., min_length=1),
    interval: str = Query("1d"),
):
    candles: List[dict] = []
    api_key = finnhub_api_key()

    if api_key:
        try:
            candles = fetch_finnhub_candles(symbol, interval, api_key)
        except Exception as exc:
            print(f"finnhub forex history error: {exc}")

    if not candles:
        try:
            candles = fetch_dukascopy_candles(symbol, interval)
        except Exception as exc:
            print(f"dukascopy forex history error: {exc}")

    if not candles and not is_metal_symbol(symbol):
        yf_sym = to_yfinance_forex_symbol(symbol)
        yf_interval = INTERVAL_MAP.get(interval, "1d")
        period = PERIOD_BY_INTERVAL.get(interval, "2y")
        try:
            ticker = yf.Ticker(yf_sym)
            df = ticker.history(period=period, interval=yf_interval, auto_adjust=False)
            if df is not None and not df.empty:
                cutoff = datetime.now(timezone.utc) - timedelta(days=124)
                for idx, row in df.iterrows():
                    ts = idx.to_pydatetime()
                    if ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)
                    else:
                        ts = ts.astimezone(timezone.utc)
                    if ts < cutoff and interval not in ("1w", "1M"):
                        continue
                    candles.append(
                        {
                            "time": int(ts.timestamp()),
                            "open": float(row["Open"]),
                            "high": float(row["High"]),
                            "low": float(row["Low"]),
                            "close": float(row["Close"]),
                            "volume": float(row.get("Volume", 0) or 0),
                        }
                    )
                if interval == "4h" and candles:
                    candles = _resample_4h(candles)
        except Exception as exc:
            print(f"yahoo forex history error: {exc}")

    if not candles:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")

    return normalize_forex_candles(symbol, candles)


@app.get("/api/forex/quotes")
def forex_quotes(symbols: str = Query(..., min_length=1)):
    sym_list = [s.strip().upper().replace("=X", "") for s in symbols.split(",") if s.strip()][:40]
    api_key = finnhub_api_key()
    out: dict = {}

    if api_key:
        try:
            out = fetch_finnhub_quotes(sym_list, api_key)
            if not any(q.get("price") for q in out.values()):
                out = {}
        except Exception as exc:
            print(f"finnhub forex quotes error: {exc}")

    if not out:
        try:
            out = fetch_dukascopy_quotes(sym_list)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Forex quote error: {exc}") from exc

    return {
        sym: {
            **q,
            "price": round_forex_price(sym, q.get("price")),
            "high": round_forex_price(sym, q.get("high")),
            "low": round_forex_price(sym, q.get("low")),
        }
        for sym, q in out.items()
    }


@app.get("/api/india/symbols")
def india_symbols(q: str = Query("", alias="q"), limit: int = 50):
    return search_symbols(SYMBOL_UNIVERSE, q, min(limit, 100))


@app.get("/api/india/history")
def india_history(
    symbol: str = Query(..., min_length=1),
    interval: str = Query("1d"),
):
    yf_sym = to_yfinance_symbol(symbol)
    yf_interval = INTERVAL_MAP.get(interval, "1d")
    period = PERIOD_BY_INTERVAL.get(interval, "2y")

    try:
        ticker = yf.Ticker(yf_sym)
        df = ticker.history(period=period, interval=yf_interval, auto_adjust=False)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"yfinance error: {exc}") from exc

    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")

    # 4-month backtest window (align with crypto panel)
    cutoff = datetime.now(timezone.utc) - timedelta(days=124)
    candles = []
    for idx, row in df.iterrows():
        ts = idx.to_pydatetime()
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        else:
            ts = ts.astimezone(timezone.utc)
        if ts < cutoff and interval not in ("1w", "1M"):
            continue
        candles.append(
            {
                "time": int(ts.timestamp()),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row.get("Volume", 0) or 0),
            }
        )

    if interval == "4h" and candles:
        candles = _resample_4h(candles)

    if not candles:
        raise HTTPException(status_code=404, detail=f"No candles in range for {symbol}")

    return candles


def _resample_4h(candles: List[dict]) -> List[dict]:
    """Bucket 1h candles into 4h bars."""
    if not candles:
        return candles
    bucket_seconds = 4 * 3600
    buckets = {}
    for c in candles:
        key = (c["time"] // bucket_seconds) * bucket_seconds
        b = buckets.get(key)
        if not b:
            buckets[key] = {**c, "time": key}
        else:
            b["high"] = max(b["high"], c["high"])
            b["low"] = min(b["low"], c["low"])
            b["close"] = c["close"]
            b["volume"] = b.get("volume", 0) + c.get("volume", 0)
    return [buckets[k] for k in sorted(buckets.keys())]


@app.get("/api/india/quotes")
def india_quotes(symbols: str = Query(..., min_length=1)):
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    out = {}
    for sym in sym_list[:40]:
        try:
            yf_sym = to_yfinance_symbol(sym)
            ticker = yf.Ticker(yf_sym)
            info = ticker.fast_info
            last = float(getattr(info, "last_price", None) or getattr(info, "previous_close", 0) or 0)
            prev = float(getattr(info, "previous_close", None) or last or 0)
            change_pct = ((last - prev) / prev * 100) if prev else 0
            out[sym] = {
                "price": last,
                "changePct": change_pct,
                "high": float(getattr(info, "day_high", None) or last),
                "low": float(getattr(info, "day_low", None) or last),
            }
        except Exception:
            out[sym] = {"price": None, "changePct": None, "high": None, "low": None}
    return out


@app.post("/api/india/reload-symbols")
def reload_symbols():
    global SYMBOL_UNIVERSE
    SYMBOL_UNIVERSE = build_symbol_universe()
    return {"count": len(SYMBOL_UNIVERSE)}
