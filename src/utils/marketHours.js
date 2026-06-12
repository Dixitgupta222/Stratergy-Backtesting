/** @typedef {'crypto' | 'stocks' | 'forex'} SymbolMarket */

export function formatHMS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function getIstNow(now = new Date()) {
  const istStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  return new Date(istStr)
}

/** NSE cash session: Mon–Fri 09:15–15:30 IST */
export function getNseSession(now = new Date()) {
  const ist = getIstNow(now)
  const day = ist.getDay()
  const openDay = day >= 1 && day <= 5

  const openTime = new Date(ist)
  openTime.setHours(9, 15, 0, 0)
  const closeTime = new Date(ist)
  closeTime.setHours(15, 30, 0, 0)

  if (openDay && ist >= openTime && ist <= closeTime) {
    return {
      open: true,
      label: 'NSE · Open',
      countdownSec: Math.floor((closeTime - ist) / 1000),
      countdownPrefix: 'Closes in'
    }
  }

  let nextOpen = new Date(ist)
  if (ist > closeTime || !openDay) nextOpen.setDate(nextOpen.getDate() + 1)
  while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
    nextOpen.setDate(nextOpen.getDate() + 1)
  }
  nextOpen.setHours(9, 15, 0, 0)

  return {
    open: false,
    label: 'NSE · Closed',
    countdownSec: Math.floor((nextOpen - ist) / 1000),
    countdownPrefix: 'Opens in'
  }
}

/**
 * @param {SymbolMarket} market
 * @param {Date} [now]
 */
export function getMarketSession(market, now = new Date()) {
  if (market === 'crypto') {
    return { open: true, is24x7: true, label: 'Crypto · 24/7', countdownSec: null, countdownPrefix: null }
  }

  if (market === 'forex') {
    const day = now.getUTCDay()
    const open = day >= 1 && day <= 5
    return {
      open,
      is24x7: false,
      label: open ? 'Forex · Open' : 'Forex · Weekend',
      countdownSec: null,
      countdownPrefix: null
    }
  }

  if (market === 'stocks') {
    const nse = getNseSession(now)
    return { is24x7: false, ...nse }
  }

  return { open: false, is24x7: false, label: 'Unknown', countdownSec: null, countdownPrefix: null }
}

export function isMarketOpen(market, now = new Date()) {
  return getMarketSession(market, now).open
}
