from typing import Dict, List

FOREX_UNIVERSE: List[Dict[str, str]] = [
    {"symbol": "EURUSD", "name": "Euro / US Dollar", "base": "EUR", "quote": "USD", "type": "major"},
    {"symbol": "GBPUSD", "name": "British Pound / US Dollar", "base": "GBP", "quote": "USD", "type": "major"},
    {"symbol": "USDJPY", "name": "US Dollar / Japanese Yen", "base": "USD", "quote": "JPY", "type": "major"},
    {"symbol": "USDCHF", "name": "US Dollar / Swiss Franc", "base": "USD", "quote": "CHF", "type": "major"},
    {"symbol": "AUDUSD", "name": "Australian Dollar / US Dollar", "base": "AUD", "quote": "USD", "type": "major"},
    {"symbol": "USDCAD", "name": "US Dollar / Canadian Dollar", "base": "USD", "quote": "CAD", "type": "major"},
    {"symbol": "NZDUSD", "name": "New Zealand Dollar / US Dollar", "base": "NZD", "quote": "USD", "type": "major"},
    {"symbol": "EURGBP", "name": "Euro / British Pound", "base": "EUR", "quote": "GBP", "type": "cross"},
    {"symbol": "EURJPY", "name": "Euro / Japanese Yen", "base": "EUR", "quote": "JPY", "type": "cross"},
    {"symbol": "GBPJPY", "name": "British Pound / Japanese Yen", "base": "GBP", "quote": "JPY", "type": "cross"},
    {"symbol": "EURCHF", "name": "Euro / Swiss Franc", "base": "EUR", "quote": "CHF", "type": "cross"},
    {"symbol": "EURAUD", "name": "Euro / Australian Dollar", "base": "EUR", "quote": "AUD", "type": "cross"},
    {"symbol": "EURNZD", "name": "Euro / New Zealand Dollar", "base": "EUR", "quote": "NZD", "type": "cross"},
    {"symbol": "EURCAD", "name": "Euro / Canadian Dollar", "base": "EUR", "quote": "CAD", "type": "cross"},
    {"symbol": "GBPAUD", "name": "British Pound / Australian Dollar", "base": "GBP", "quote": "AUD", "type": "cross"},
    {"symbol": "GBPCAD", "name": "British Pound / Canadian Dollar", "base": "GBP", "quote": "CAD", "type": "cross"},
    {"symbol": "GBPCHF", "name": "British Pound / Swiss Franc", "base": "GBP", "quote": "CHF", "type": "cross"},
    {"symbol": "GBPNZD", "name": "British Pound / New Zealand Dollar", "base": "GBP", "quote": "NZD", "type": "cross"},
    {"symbol": "AUDJPY", "name": "Australian Dollar / Japanese Yen", "base": "AUD", "quote": "JPY", "type": "cross"},
    {"symbol": "AUDCAD", "name": "Australian Dollar / Canadian Dollar", "base": "AUD", "quote": "CAD", "type": "cross"},
    {"symbol": "AUDCHF", "name": "Australian Dollar / Swiss Franc", "base": "AUD", "quote": "CHF", "type": "cross"},
    {"symbol": "AUDNZD", "name": "Australian Dollar / New Zealand Dollar", "base": "AUD", "quote": "NZD", "type": "cross"},
    {"symbol": "CADJPY", "name": "Canadian Dollar / Japanese Yen", "base": "CAD", "quote": "JPY", "type": "cross"},
    {"symbol": "CADCHF", "name": "Canadian Dollar / Swiss Franc", "base": "CAD", "quote": "CHF", "type": "cross"},
    {"symbol": "CHFJPY", "name": "Swiss Franc / Japanese Yen", "base": "CHF", "quote": "JPY", "type": "cross"},
    {"symbol": "NZDJPY", "name": "New Zealand Dollar / Japanese Yen", "base": "NZD", "quote": "JPY", "type": "cross"},
    {"symbol": "NZDCAD", "name": "New Zealand Dollar / Canadian Dollar", "base": "NZD", "quote": "CAD", "type": "cross"},
    {"symbol": "NZDCHF", "name": "New Zealand Dollar / Swiss Franc", "base": "NZD", "quote": "CHF", "type": "cross"},
    {"symbol": "USDINR", "name": "US Dollar / Indian Rupee", "base": "USD", "quote": "INR", "type": "exotic"},
    {"symbol": "USDSGD", "name": "US Dollar / Singapore Dollar", "base": "USD", "quote": "SGD", "type": "exotic"},
    {"symbol": "USDHKD", "name": "US Dollar / Hong Kong Dollar", "base": "USD", "quote": "HKD", "type": "exotic"},
    {"symbol": "USDCNH", "name": "US Dollar / Chinese Yuan", "base": "USD", "quote": "CNH", "type": "exotic"},
    {"symbol": "USDMXN", "name": "US Dollar / Mexican Peso", "base": "USD", "quote": "MXN", "type": "exotic"},
    {"symbol": "USDZAR", "name": "US Dollar / South African Rand", "base": "USD", "quote": "ZAR", "type": "exotic"},
    {"symbol": "USDTRY", "name": "US Dollar / Turkish Lira", "base": "USD", "quote": "TRY", "type": "exotic"},
    {"symbol": "USDSEK", "name": "US Dollar / Swedish Krona", "base": "USD", "quote": "SEK", "type": "exotic"},
    {"symbol": "USDNOK", "name": "US Dollar / Norwegian Krone", "base": "USD", "quote": "NOK", "type": "exotic"},
    {"symbol": "USDDKK", "name": "US Dollar / Danish Krone", "base": "USD", "quote": "DKK", "type": "exotic"},
    {"symbol": "USDPLN", "name": "US Dollar / Polish Zloty", "base": "USD", "quote": "PLN", "type": "exotic"},
    {"symbol": "USDBRL", "name": "US Dollar / Brazilian Real", "base": "USD", "quote": "BRL", "type": "exotic"},
    {"symbol": "XAUUSD", "name": "Gold / US Dollar (COMEX)", "base": "XAU", "quote": "USD", "type": "metal"},
    {"symbol": "XAGUSD", "name": "Silver / US Dollar (COMEX)", "base": "XAG", "quote": "USD", "type": "metal"},
    {"symbol": "XPTUSD", "name": "Platinum / US Dollar (COMEX)", "base": "XPT", "quote": "USD", "type": "metal"},
    {"symbol": "XPDUSD", "name": "Palladium / US Dollar (COMEX)", "base": "XPD", "quote": "USD", "type": "metal"},
]

TYPE_ORDER = {"major": 0, "metal": 1, "cross": 2, "exotic": 3}

# Yahoo chart API uses COMEX futures for metals (spot XAUUSD=X returns 404).
YAHOO_METAL_MAP = {
    "XAUUSD": "GC=F",
    "XAGUSD": "SI=F",
    "XPTUSD": "PL=F",
    "XPDUSD": "PA=F",
}


def to_yfinance_symbol(symbol: str) -> str:
    s = str(symbol or "").upper().strip().replace("=X", "")
    if not s:
        raise ValueError("Symbol required")
    if s.startswith("^"):
        return s
    if s in YAHOO_METAL_MAP:
        return YAHOO_METAL_MAP[s]
    return f"{s}=X"


def search_symbols(universe: List[Dict[str, str]], query: str, limit: int = 50) -> List[Dict[str, str]]:
    q = str(query).strip().upper()
    cap = min(max(limit, 1), 100)

    if not q:
        return sorted(universe, key=lambda x: TYPE_ORDER.get(x.get("type", ""), 9))[:cap]

    results = [
        item
        for item in universe
        if q in item["symbol"]
        or item["symbol"].startswith(q)
        or q in (item.get("name") or "").upper()
        or q in (item.get("base") or "").upper()
        or q in (item.get("quote") or "").upper()
        or q in f"{item.get('base', '')}{item.get('quote', '')}"
    ]

    results.sort(
        key=lambda x: (
            0 if x["symbol"].startswith(q) else 1,
            TYPE_ORDER.get(x.get("type", ""), 9),
        )
    )
    return results[:cap]
