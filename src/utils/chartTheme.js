export function readCssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function getChartOptions() {
  return {
    layout: {
      background: { color: readCssVar('--chart-bg', '#161b22') },
      textColor: readCssVar('--text-secondary', '#8b949e')
    },
    grid: {
      vertLines: { color: readCssVar('--chart-grid', '#21262d') },
      horzLines: { color: readCssVar('--chart-grid', '#21262d') }
    },
    crosshair: { mode: 0 },
    rightPriceScale: {
      borderColor: readCssVar('--border', '#30363d'),
      autoScale: true
    },
    timeScale: {
      borderColor: readCssVar('--border', '#30363d'),
      timeVisible: true,
      secondsVisible: false,
      shiftVisibleRangeOnNewBar: true,
      rightOffset: 20,
      barSpacing: 8
    }
  }
}

export const CANDLE_OPTIONS = {
  upColor: '#089981',
  downColor: '#f23645',
  borderUpColor: '#089981',
  borderDownColor: '#f23645',
  wickUpColor: '#089981',
  wickDownColor: '#f23645',
  lastValueVisible: false,
  priceLineVisible: true,
  priceLineWidth: 1,
  priceLineStyle: 2
}
