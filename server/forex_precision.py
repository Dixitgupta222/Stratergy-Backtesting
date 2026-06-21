from typing import List, Optional

METAL_SYMBOLS = frozenset({"XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"})

METAL_DECIMALS = {
    "XAUUSD": 2,
    "XAGUSD": 3,
    "XPTUSD": 2,
    "XPDUSD": 2,
}

EXOTIC_QUOTE_DECIMALS = {
    "INR": 4,
    "TRY": 4,
    "ZAR": 4,
    "MXN": 4,
    "BRL": 4,
    "PLN": 4,
    "SEK": 4,
    "NOK": 4,
    "DKK": 4,
    "CNH": 4,
    "HKD": 4,
    "SGD": 4,
}


def normalize_forex_symbol(symbol: str) -> str:
    return str(symbol or "").upper().strip().replace("=X", "")


def is_metal_symbol(symbol: str) -> bool:
    return normalize_forex_symbol(symbol) in METAL_SYMBOLS


def requires_finnhub_for_spot(symbol: str) -> bool:
    return is_metal_symbol(symbol)


def get_forex_price_decimals(symbol: str) -> int:
    s = normalize_forex_symbol(symbol)
    if not s or len(s) != 6:
        return 2

    if s in METAL_DECIMALS:
        return METAL_DECIMALS[s]

    base = s[:3]
    quote = s[3:]

    if quote == "JPY" or base == "JPY":
        return 3
    if quote in EXOTIC_QUOTE_DECIMALS:
        return EXOTIC_QUOTE_DECIMALS[quote]

    return 5


def round_forex_price(symbol: str, price: Optional[float]) -> Optional[float]:
    if price is None:
        return None
    decimals = get_forex_price_decimals(symbol)
    return round(float(price), decimals)


def normalize_forex_candles(symbol: str, candles: List[dict]) -> List[dict]:
    if not candles:
        return candles
    out = []
    for c in candles:
        out.append(
            {
                **c,
                "open": round_forex_price(symbol, c["open"]),
                "high": round_forex_price(symbol, c["high"]),
                "low": round_forex_price(symbol, c["low"]),
                "close": round_forex_price(symbol, c["close"]),
            }
        )
    return out
