/** Seconds per candle during replay playback */
export const REPLAY_SPEEDS_SEC = [0.1, 0.5, 1, 2, 5]

export const DEFAULT_REPLAY_SPEED_SEC = 1

export function nextReplaySpeed(current, direction) {
  const speeds = REPLAY_SPEEDS_SEC
  const idx = speeds.indexOf(current)
  const i = idx === -1 ? speeds.indexOf(DEFAULT_REPLAY_SPEED_SEC) : idx
  if (direction < 0) return speeds[Math.max(0, i - 1)]
  return speeds[Math.min(speeds.length - 1, i + 1)]
}

export function formatSpeedLabel(sec) {
  if (sec < 1) return `${sec}s`
  return `${sec % 1 === 0 ? sec : sec}s`
}

/** Exclusive end index for last candle on or before unix time */
export function findEndIndexUntilTime(data, targetTime) {
  if (!data?.length || targetTime == null) return 1
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].time <= targetTime) return Math.max(1, i + 1)
  }
  return 1
}

export function windowProgressFromIndex(index, startIndex, endIndex) {
  const span = endIndex - startIndex
  if (span <= 0) return 0
  return Math.max(0, Math.min(100, ((index - startIndex) / span) * 100))
}

export function indexFromWindowProgress(pct, startIndex, endIndex) {
  const span = endIndex - startIndex
  if (span <= 0) return startIndex
  const clamped = Math.max(0, Math.min(100, pct))
  return Math.max(startIndex, Math.min(endIndex, startIndex + Math.round((clamped / 100) * span)))
}
