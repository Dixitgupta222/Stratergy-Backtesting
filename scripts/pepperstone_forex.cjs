#!/usr/bin/env node
/** CLI for Python server — node scripts/pepperstone_forex.cjs history XAUUSD 15m [days] */
const {
  fetchPepperstoneCandles,
  fetchPepperstoneQuotes,
  isPepperstoneConfigured
} = require('../lib/pepperstoneForex')

async function main() {
  const [mode, symbol, interval, daysArg, ...rest] = process.argv.slice(2)
  const days = daysArg && !Number.isNaN(Number(daysArg)) ? Number(daysArg) : undefined

  if (!isPepperstoneConfigured()) {
    throw new Error('CTRADER_* credentials missing — see .env.example')
  }

  if (mode === 'history') {
    const candles = await fetchPepperstoneCandles(symbol, interval || '15m', { days })
    process.stdout.write(JSON.stringify(candles))
    return
  }
  if (mode === 'quotes') {
    const symbols = [symbol, ...rest].filter(Boolean)
    const quotes = await fetchPepperstoneQuotes(symbols)
    process.stdout.write(JSON.stringify(quotes))
    return
  }
  throw new Error(`Unknown mode: ${mode}`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
