import axios from 'axios'
import { BACKTEST_MS } from '../utils/backtestConfig'

const BINANCE_BASE = 'https://api.binance.com'

/** Quick fetch — latest N candles only (max 1000 per Binance rules) */
export async function fetchCryptoKlines(symbol = 'BTCUSDT', interval = '1m', limit = 500) {
  const sym = symbol.replace('/', '').replace('-', '').toUpperCase()
  const capped = Math.min(limit, 1000)
  const params = new URLSearchParams({ symbol: sym, interval, limit: String(capped) })
  const url = `${BINANCE_BASE}/api/v3/klines?${params.toString()}`
  const resp = await axios.get(url)
  return resp.data.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5])
  }))
}

export async function fetchAlphaVantage(symbol = 'RELIANCE', timeframe = '1d') {
  const key = import.meta.env.VITE_ALPHA_VANTAGE_KEY || ''
  if (!key) throw new Error('Alpha Vantage API key missing. Set VITE_ALPHA_VANTAGE_KEY in .env')
  const functionMap = {
    '1m': 'TIME_SERIES_INTRADAY', '5m': 'TIME_SERIES_INTRADAY', '15m': 'TIME_SERIES_INTRADAY',
    '1h': 'TIME_SERIES_INTRADAY', '4h': 'TIME_SERIES_INTRADAY',
    '1d': 'TIME_SERIES_DAILY', '1w': 'TIME_SERIES_WEEKLY', '1M': 'TIME_SERIES_MONTHLY'
  }
  const func = functionMap[timeframe] || 'TIME_SERIES_DAILY'
  const interval = timeframe.includes('m') || timeframe.includes('h') ? timeframe : undefined
  const params = new URLSearchParams({ function: func, symbol, apikey: key, outputsize: 'full' })
  if (interval) params.append('interval', interval)
  const url = `https://www.alphavantage.co/query?${params.toString()}`
  const resp = await axios.get(url)
  const tsKey = Object.keys(resp.data).find((k) => k.includes('Time Series'))
  if (!tsKey) throw new Error('AlphaVantage: unexpected response')
  const series = resp.data[tsKey]
  const cutoff = Date.now() - BACKTEST_MS
  const data = Object.keys(series)
    .map((k) => ({
      time: Math.floor(new Date(k).getTime() / 1000),
      open: parseFloat(series[k]['1. open']),
      high: parseFloat(series[k]['2. high']),
      low: parseFloat(series[k]['3. low']),
      close: parseFloat(series[k]['4. close'])
    }))
    .filter((c) => c.time * 1000 >= cutoff)
    .sort((a, b) => a.time - b.time)
  return data
}
