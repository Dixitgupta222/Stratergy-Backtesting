// Basic indicator implementations

export function sma(data, period = 14) {
  // data: [{time, value}]
  const res = []
  for (let i = 0; i < data.length; i++) {
    if (i + 1 >= period) {
      const slice = data.slice(i + 1 - period, i + 1)
      const avg = slice.reduce((s, d) => s + d.value, 0) / period
      res.push({ time: data[i].time, value: Number(avg.toFixed(8)) })
    }
  }
  return res
}

export function ema(data, period = 14) {
  const res = []
  const k = 2 / (period + 1)
  let prev = data[0] ? data[0].value : 0
  for (let i = 0; i < data.length; i++) {
    const val = data[i].value
    prev = i === 0 ? val : val * k + prev * (1 - k)
    if (i + 1 >= period) res.push({ time: data[i].time, value: Number(prev.toFixed(8)) })
  }
  return res
}

export function rsi(data, period = 14) {
  const res = []
  let gains = 0
  let losses = 0
  for (let i = 1; i < data.length; i++) {
    const change = data[i].value - data[i - 1].value
    if (i <= period) {
      if (change >= 0) gains += change
      else losses += Math.abs(change)
      if (i === period) {
        const avgG = gains / period
        const avgL = losses / period
        const rs = avgG / (avgL || 1)
        res.push({ time: data[i].time, value: Number((100 - 100 / (1 + rs)).toFixed(2)) })
      }
    } else {
      const prevG = gains
      const prevL = losses
      const change = data[i].value - data[i - 1].value
      const gain = change > 0 ? change : 0
      const loss = change < 0 ? Math.abs(change) : 0
      gains = (prevG * (period - 1) + gain) / period
      losses = (prevL * (period - 1) + loss) / period
      const rs = gains / (losses || 1)
      res.push({ time: data[i].time, value: Number((100 - 100 / (1 + rs)).toFixed(2)) })
    }
  }
  return res
}

export function macd(data, fast = 12, slow = 26, signal = 9) {
  const fastE = ema(data, fast)
  const slowE = ema(data, slow)
  const macdLine = []
  // align by time
  const slowMap = new Map(slowE.map((d) => [d.time, d.value]))
  for (const f of fastE) {
    if (slowMap.has(f.time)) macdLine.push({ time: f.time, value: f.value - slowMap.get(f.time) })
  }
  const signalLine = ema(macdLine, signal)
  return { macdLine, signalLine }
}

export function bollingerBands(data, period = 20, mult = 2) {
  const smaVals = sma(data, period)
  const res = []
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i + 1 - period, i + 1)
    const mean = slice.reduce((s, d) => s + d.value, 0) / period
    const variance = slice.reduce((s, d) => s + Math.pow(d.value - mean, 2), 0) / period
    const sd = Math.sqrt(variance)
    res.push({ time: data[i].time, upper: Number((mean + mult * sd).toFixed(8)), lower: Number((mean - mult * sd).toFixed(8)), middle: Number(mean.toFixed(8)) })
  }
  return res
}
