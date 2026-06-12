# Trading Panel — Lightweight Charts (MVP)

This is a demo trading charting platform built with Vite + React and `lightweight-charts`. It supports crypto (via Binance public API), and has hooks to add Alpha Vantage for stocks/forex (API key required).

Features:
- Multi-chart layouts (1 - 7)
- Full-width single-chart layout
- Symbol autocomplete/suggestions (Binance + AlphaVantage)
- Timeframe selection
- Basic indicators (SMA, EMA, RSI, MACD, Bollinger Bands)
- Replay/backtest demo (per-chart replay control)
- Responsive layout for desktop/tablet

Requirements:
- Node.js v18+

Setup:
1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and add `VITE_ALPHA_VANTAGE_KEY` if you want stocks/forex.

3. Run dev server:

```bash
npm run dev
```

Notes and next steps:
- Stocks/Forex require Alpha Vantage API key; add it to `.env` as `VITE_ALPHA_VANTAGE_KEY`.
- Indicators are implemented in `src/utils/indicators.js` and overlaid as additional series in `ChartCard`.
- Replay uses public Binance klines for crypto. For production, proxy APIs to avoid CORS/rate limits and add caching.

This is a minimal but extendable MVP; I can continue adding symbol search, per-chart independent controls, optimized data caching, and strategy backtest engine on request.
