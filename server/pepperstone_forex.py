"""Pepperstone metals via cTrader Open API (Node subprocess)."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent.parent
CLI = ROOT / "scripts" / "pepperstone_forex.cjs"


def pepperstone_configured() -> bool:
    return bool(
        os.getenv("CTRADER_CLIENT_ID")
        and os.getenv("CTRADER_CLIENT_SECRET")
        and os.getenv("CTRADER_ACCESS_TOKEN")
        and os.getenv("CTRADER_ACCOUNT_ID")
    )


def _run_node(mode: str, *args: str) -> str:
    proc = subprocess.run(
        ["node", str(CLI), mode, *args],
        capture_output=True,
        text=True,
        timeout=180,
        cwd=str(ROOT),
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "Pepperstone fetch failed")
    return proc.stdout


def fetch_pepperstone_candles(symbol: str, interval: str = "15m", days: int | None = None) -> List[dict]:
    args = ["history", symbol.upper(), interval]
    if days is not None:
        args.append(str(days))
    out = _run_node(*args)
    return json.loads(out)


def fetch_pepperstone_quotes(symbols: List[str]) -> Dict[str, dict]:
    if not symbols:
        return {}
    out = _run_node("quotes", *symbols)
    return json.loads(out)
