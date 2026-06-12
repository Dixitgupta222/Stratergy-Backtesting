"""NSE equities + major Indian indices for yfinance."""

import io
from typing import List, Dict

import pandas as pd
import requests

INDIAN_INDICES: List[Dict[str, str]] = [
    {"symbol": "NIFTY", "yf": "^NSEI", "name": "Nifty 50"},
    {"symbol": "SENSEX", "yf": "^BSESN", "name": "BSE Sensex"},
    {"symbol": "BANKNIFTY", "yf": "^NSEBANK", "name": "Nifty Bank"},
    {"symbol": "FINNIFTY", "yf": "^CNXFIN", "name": "Nifty Financial Services"},
    {"symbol": "NIFTYIT", "yf": "^CNXIT", "name": "Nifty IT"},
    {"symbol": "NIFTYPHARMA", "yf": "^CNXPHARMA", "name": "Nifty Pharma"},
    {"symbol": "NIFTYAUTO", "yf": "^CNXAUTO", "name": "Nifty Auto"},
    {"symbol": "NIFTYFMCG", "yf": "^CNXFMCG", "name": "Nifty FMCG"},
    {"symbol": "NIFTYMETAL", "yf": "^CNXMETAL", "name": "Nifty Metal"},
    {"symbol": "NIFTYREALTY", "yf": "^CNXREALTY", "name": "Nifty Realty"},
    {"symbol": "NIFTYENERGY", "yf": "^CNXENERGY", "name": "Nifty Energy"},
    {"symbol": "NIFTYINFRA", "yf": "^CNXINFRA", "name": "Nifty Infra"},
    {"symbol": "NIFTYPSUBANK", "yf": "^CNXPSUBANK", "name": "Nifty PSU Bank"},
    {"symbol": "NIFTYMIDCAP50", "yf": "^NSEMDCP50", "name": "Nifty Midcap 50"},
    {"symbol": "NIFTYNEXT50", "yf": "NIFTY_NEXT50.NS", "name": "Nifty Next 50"},
    {"symbol": "INDIAVIX", "yf": "^INDIAVIX", "name": "India VIX"},
]

FALLBACK_STOCKS: List[Dict[str, str]] = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd.", "type": "stock"},
    {"symbol": "TCS", "name": "Tata Consultancy Services Ltd.", "type": "stock"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd.", "type": "stock"},
    {"symbol": "INFY", "name": "Infosys Ltd.", "type": "stock"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd.", "type": "stock"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd.", "type": "stock"},
    {"symbol": "ITC", "name": "ITC Ltd.", "type": "stock"},
    {"symbol": "SBIN", "name": "State Bank of India", "type": "stock"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd.", "type": "stock"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd.", "type": "stock"},
    {"symbol": "LT", "name": "Larsen & Toubro Ltd.", "type": "stock"},
    {"symbol": "AXISBANK", "name": "Axis Bank Ltd.", "type": "stock"},
    {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd.", "type": "stock"},
    {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd.", "type": "stock"},
    {"symbol": "TITAN", "name": "Titan Company Ltd.", "type": "stock"},
    {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries Ltd.", "type": "stock"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd.", "type": "stock"},
    {"symbol": "WIPRO", "name": "Wipro Ltd.", "type": "stock"},
    {"symbol": "ULTRACEMCO", "name": "UltraTech Cement Ltd.", "type": "stock"},
    {"symbol": "ONGC", "name": "Oil & Natural Gas Corporation Ltd.", "type": "stock"},
]

INDEX_BY_SYMBOL = {i["symbol"]: i for i in INDIAN_INDICES}
INDEX_BY_YF = {i["yf"]: i for i in INDIAN_INDICES}


def to_yfinance_symbol(symbol: str) -> str:
    s = (symbol or "").upper().strip()
    if not s:
        raise ValueError("Symbol required")
    if s in INDEX_BY_SYMBOL:
        return INDEX_BY_SYMBOL[s]["yf"]
    if s.startswith("^"):
        return s
    if s.endswith(".NS") or s.endswith(".BO"):
        return s
    return f"{s}.NS"


def display_symbol(yf_symbol: str) -> str:
    if yf_symbol in INDEX_BY_YF:
        return INDEX_BY_YF[yf_symbol]["symbol"]
    if yf_symbol.endswith(".NS"):
        return yf_symbol[:-3]
    if yf_symbol.endswith(".BO"):
        return yf_symbol[:-3]
    return yf_symbol.lstrip("^")


def fetch_nse_equity_list() -> List[Dict[str, str]]:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/csv,application/json,text/html",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.nseindia.com/",
        }
    )
    urls = [
        "https://archives.nseindia.com/content/equities/EQUITY_L.csv",
        "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv",
    ]
    for url in urls:
        try:
            session.get("https://www.nseindia.com", timeout=12)
            resp = session.get(url, timeout=30)
            if resp.status_code != 200 or len(resp.text) < 100:
                continue
            df = pd.read_csv(io.StringIO(resp.text))
            sym_col = next((c for c in df.columns if str(c).upper() == "SYMBOL"), None)
            name_col = next(
                (c for c in df.columns if "NAME" in str(c).upper() and "COMPANY" in str(c).upper()),
                None,
            )
            if not sym_col:
                continue
            rows = []
            for _, row in df.iterrows():
                sym = str(row[sym_col]).strip().upper()
                if not sym or sym == "NAN":
                    continue
                name = str(row[name_col]).strip() if name_col else sym
                rows.append({"symbol": sym, "name": name, "type": "stock"})
            if rows:
                return rows
        except Exception:
            continue
    return FALLBACK_STOCKS.copy()


def build_symbol_universe() -> List[Dict[str, str]]:
    stocks = fetch_nse_equity_list()
    indices = [
        {"symbol": i["symbol"], "name": i["name"], "type": "index", "yf": i["yf"]}
        for i in INDIAN_INDICES
    ]
    return indices + stocks


def search_symbols(universe: List[Dict[str, str]], query: str, limit: int = 50) -> List[Dict[str, str]]:
    q = (query or "").strip().upper()
    if not q:
        indices = [s for s in universe if s.get("type") == "index"]
        popular = [s for s in universe if s["symbol"] in {x["symbol"] for x in FALLBACK_STOCKS}]
        seen = set()
        out = []
        for item in indices + popular:
            if item["symbol"] in seen:
                continue
            seen.add(item["symbol"])
            out.append(item)
            if len(out) >= limit:
                return out
        return out

    results = []
    for item in universe:
        sym = item.get("symbol", "")
        name = (item.get("name") or "").upper()
        if q in sym or q in name or sym.startswith(q):
            results.append(item)
            if len(results) >= limit:
                break
    results.sort(
        key=lambda x: (
            0 if x.get("symbol", "").startswith(q) else 1,
            0 if x.get("type") == "index" else 1,
            x.get("symbol", ""),
        )
    )
    return results[:limit]
