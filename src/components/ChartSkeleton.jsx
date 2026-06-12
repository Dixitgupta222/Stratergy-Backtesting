import React from 'react'
import { BACKTEST_MONTHS, candlesNeededForMonths } from '../utils/backtestConfig'
import { detectSymbolMarket } from '../utils/symbolType'

export default function ChartSkeleton({ progress, symbol, timeframe }) {
  const market = detectSymbolMarket(symbol)
  const pct = progress
    ? Math.min(99, Math.round((progress.loaded / Math.max(progress.total, 1)) * 100))
    : 0

  const status = progress?.cached
    ? 'Loaded from cache'
    : progress
      ? `Loading… ${pct}% (${progress.candles?.toLocaleString() ?? 0} candles)`
      : market === 'crypto'
        ? `Fetching ${BACKTEST_MONTHS} months of ${timeframe} data…`
        : market === 'stocks'
          ? `Loading NSE data for ${timeframe}… (run npm run api if stuck)`
          : 'Loading chart data…'

  const estimated = timeframe ? candlesNeededForMonths(timeframe).toLocaleString() : ''

  return (
    <div className="chart-skeleton">
      <div className="skeleton-shimmer" />
      {progress && !progress.cached && (
        <div className="skeleton-progress-bar">
          <div className="skeleton-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="skeleton-bars">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="skeleton-bar" style={{ height: `${30 + (i * 7) % 50}%` }} />
        ))}
      </div>
      <div className="skeleton-status">{status}</div>
      {estimated && market === 'crypto' && !progress?.cached && (
        <div className="skeleton-sub">~{estimated} candles for backtest</div>
      )}
    </div>
  )
}
