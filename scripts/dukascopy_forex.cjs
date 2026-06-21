#!/usr/bin/env node
/** CLI for Python server — node scripts/dukascopy_forex.cjs history EURUSD 15m */
const {
  fetchDukascopyCandles,
  fetchDukascopyQuotes
} = require('../api/lib/dukascopyForex')

async function main() {
  const [mode, symbol, interval, ...rest] = process.argv.slice(2)
  if (mode === 'history') {
    const candles = await fetchDukascopyCandles(symbol, interval || '15m')
    process.stdout.write(JSON.stringify(candles))
    return
  }
  if (mode === 'quotes') {
    const symbols = [symbol, ...rest].filter(Boolean)
    const quotes = await fetchDukascopyQuotes(symbols)
    process.stdout.write(JSON.stringify(quotes))
    return
  }
  throw new Error(`Unknown mode: ${mode}`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
