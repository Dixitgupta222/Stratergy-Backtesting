"""Spot forex + metals via Finnhub OANDA feed (broker-style prices)."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import httpx

FINNHUB_BASE = "https://finnhub.io/api/v1"
BACKTEST_DAYS = 124

RESOLUTION_MAP = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "1h": "60",
    "4h": "60",
    "1d": "D",
    "1w": "W",
    "1M": "M",
}

LOOKBACK_SECONDS = {
    "1m": 60 * 24 * 3600,
    "5m": 60 * 24 * 3600,
    "15m": 60 * 24 * 3600,
    "1h": 730 * 24 * 3600,
    "4h": 730 * 24 * 3600,
    "1d": 5 * 365 * 24 * 3600,
    "1w": 10 * 365 * 24 * 3600,
    "1M": 20 * 365 * 24 * 3600,
}


def finnhub_api_key() -> Optional[str]:
    return os.environ.get("FINNHUB_API_KEY") or None


def to_finnhub_symbol(symbol: str) -> str:
    s = str(symbol or "").upper().strip().replace("=X", "")
    if len(s) != 6:
        raise ValueError(f"Invalid forex symbol: {symbol}")
    return f"OANDA:{s[:3]}_{s[3:]}"


def _resample_4h(candles: List[dict]) -> List[dict]:
    if not candles:
        return candles
    bucket_seconds = 4 * 3600
    buckets: Dict[int, dict] = {}
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


def fetch_finnhub_quotes(symbols: List[str], api_key: str) -> Dict[str, dict]:
    out: Dict[str, dict] = {}
    with httpx.Client(timeout=20.0) as client:
        for sym in symbols:
            try:
                fh = to_finnhub_symbol(sym)
                resp = client.get(
                    f"{FINNHUB_BASE}/quote",
                    params={"symbol": fh, "token": api_key},
                )
                resp.raise_for_status()
                q = resp.json()
                if not q or q.get("c") in (None, 0):
                    out[sym] = {"price": None, "changePct": None, "high": None, "low": None}
                    continue
                last = float(q["c"])
                prev = float(q.get("pc") or last)
                change_pct = ((last - prev) / prev * 100) if prev else 0
                out[sym] = {
                    "price": last,
                    "changePct": change_pct,
                    "high": float(q.get("h") or last),
                    "low": float(q.get("l") or last),
                }
            except Exception:
                out[sym] = {"price": None, "changePct": None, "high": None, "low": None}
    return out


def fetch_finnhub_candles(symbol: str, interval: str, api_key: str) -> List[dict]:
    resolution = RESOLUTION_MAP.get(interval, "D")
    lookback = LOOKBACK_SECONDS.get(interval, LOOKBACK_SECONDS["1d"])
    now = int(datetime.now(timezone.utc).timestamp())
    fh = to_finnhub_symbol(symbol)

    with httpx.Client(timeout=30.0) as client:
        resp = client.get(
            f"{FINNHUB_BASE}/forex/candle",
            params={
                "symbol": fh,
                "resolution": resolution,
                "from": now - lookback,
                "to": now,
                "token": api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    if data.get("s") != "ok" or not data.get("t"):
        return []

    candles = [
        {
            "time": int(data["t"][i]),
            "open": float(data["o"][i]),
            "high": float(data["h"][i]),
            "low": float(data["l"][i]),
            "close": float(data["c"][i]),
            "volume": float(data.get("v", [0] * len(data["t"]))[i] or 0),
        }
        for i in range(len(data["t"]))
    ]

    skip_cutoff = interval in ("1w", "1M")
    cutoff = datetime.now(timezone.utc) - timedelta(days=BACKTEST_DAYS)
    if not skip_cutoff:
        cutoff_ts = int(cutoff.timestamp())
        candles = [c for c in candles if c["time"] >= cutoff_ts]

    if interval == "4h" and candles:
        candles = _resample_4h(candles)

    return candles
