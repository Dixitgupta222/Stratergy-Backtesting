from datetime import datetime, timedelta, timezone
from typing import List

import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

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
    return {"ok": True, "symbols": len(SYMBOL_UNIVERSE)}


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
