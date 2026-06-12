import React from 'react'
import { TIMEFRAMES } from '../utils/chartHelpers'

export default function TimeframePills({ value, onChange, disabled = false, size = 'md' }) {
  return (
    <div className={`tf-pills tf-pills--${size} ${disabled ? 'disabled' : ''}`}>
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          type="button"
          className={`tf-pill ${value === tf ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(tf)}
        >
          {tf}
        </button>
      ))}
    </div>
  )
}
