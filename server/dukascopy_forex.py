"""Broker-grade forex via Dukascopy (Node subprocess — dukascopy-node)."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent.parent
CLI = ROOT / "scripts" / "dukascopy_forex.cjs"


def _run_node(mode: str, *args: str) -> str:
    proc = subprocess.run(
        ["node", str(CLI), mode, *args],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=str(ROOT),
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "Dukascopy fetch failed")
    return proc.stdout


def fetch_dukascopy_candles(symbol: str, interval: str = "15m") -> List[dict]:
    out = _run_node("history", symbol.upper(), interval)
    return json.loads(out)


def fetch_dukascopy_quotes(symbols: List[str]) -> Dict[str, dict]:
    if not symbols:
        return {}
    out = _run_node("quotes", *symbols)
    return json.loads(out)
