import { TickMarkType } from 'lightweight-charts'

export const CHART_TIMEZONE = 'Asia/Kolkata'
export const CHART_LOCALE = 'en-IN'

function resolveTimestamp(time) {
  if (typeof time === 'number') return time
  if (time && typeof time === 'object' && 'year' in time) {
    const { year, month, day } = time
    return Math.floor(Date.UTC(year, month - 1, day) / 1000)
  }
  return null
}

function formatInIst(date, options) {
  return new Intl.DateTimeFormat(CHART_LOCALE, {
    timeZone: CHART_TIMEZONE,
    ...options
  }).format(date)
}

export function formatChartDateTime(ts) {
  if (!ts) return '—'
  return formatInIst(new Date(ts * 1000), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function formatChartDate(tsOrDate) {
  const date = typeof tsOrDate === 'number' ? new Date(tsOrDate * 1000) : tsOrDate
  return formatInIst(date, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** YYYY-MM-DD in IST for <input type="date"> */
export function timestampToDateInput(ts) {
  if (!ts) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CHART_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(ts * 1000))
}

export function dateInputToTimestamp(value, endOfDay = false) {
  if (!value) return null
  const timePart = endOfDay ? '23:59:59' : '00:00:00'
  return Math.floor(new Date(`${value}T${timePart}+05:30`).getTime() / 1000)
}

export function chartCrosshairTimeFormatter(time) {
  const ts = resolveTimestamp(time)
  if (ts == null) return ''
  return formatChartDateTime(ts)
}

export function chartTickMarkFormatter(time, tickMarkType) {
  const ts = resolveTimestamp(time)
  if (ts == null) return null
  const date = new Date(ts * 1000)

  switch (tickMarkType) {
    case TickMarkType.Year:
      return formatInIst(date, { year: '2-digit' })
    case TickMarkType.Month:
      return formatInIst(date, { month: 'short' })
    case TickMarkType.DayOfMonth:
      return formatInIst(date, { day: 'numeric' })
    case TickMarkType.Time:
      return formatInIst(date, { hour: '2-digit', minute: '2-digit', hour12: false })
    case TickMarkType.TimeWithSeconds:
      return formatInIst(date, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    default:
      return null
  }
}

export function getChartLocalization() {
  return {
    locale: CHART_LOCALE,
    timeFormatter: chartCrosshairTimeFormatter
  }
}

export function getChartTimeScaleOptions() {
  return {
    timeVisible: true,
    secondsVisible: false,
    shiftVisibleRangeOnNewBar: true,
    rightOffset: 20,
    barSpacing: 8,
    tickMarkFormatter: chartTickMarkFormatter
  }
}
