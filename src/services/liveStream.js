const BINANCE_WS = 'wss://stream.binance.com:9443'

export function createBinanceLiveConnection(symbol, timeframe, { onKline, onTrade, onStatus }) {
  const sym = String(symbol || '').toLowerCase()
  if (!sym) return { close: () => {} }

  const streams = `${sym}@kline_${timeframe}/${sym}@aggTrade`
  let ws = null
  let closed = false
  let retryTimer = null

  const connect = () => {
    if (closed) return
    onStatus?.('connecting')

    ws = new WebSocket(`${BINANCE_WS}/stream?streams=${streams}`)

    ws.onopen = () => onStatus?.('live')

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        const data = msg.data
        if (!data) return

        if (data.e === 'kline' && data.k) {
          const k = data.k
          onKline?.({
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            isClosed: k.x
          })
        } else if (data.e === 'aggTrade') {
          onTrade?.({
            price: parseFloat(data.p),
            time: Math.floor(data.T / 1000)
          })
        }
      } catch (e) { /* ignore */ }
    }

    ws.onerror = () => onStatus?.('error')

    ws.onclose = () => {
      ws = null
      if (closed) return
      onStatus?.('reconnecting')
      retryTimer = setTimeout(connect, 2000)
    }
  }

  connect()

  return {
    close: () => {
      closed = true
      if (retryTimer) clearTimeout(retryTimer)
      if (ws) ws.close()
    }
  }
}
