import React, { useState } from 'react'
import ChartGrid from './components/ChartGrid'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import { useWatchlist } from './hooks/useWatchlist'

export default function App() {
  const [layoutId, setLayoutId] = useState('2h')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [focusedChartId, setFocusedChartId] = useState(null)

  const [sharedSymbol, setSharedSymbol] = useState('BTCUSDT')
  const [sharedTimeframe, setSharedTimeframe] = useState('15m')
  const [sharedDateRange, setSharedDateRange] = useState(null)
  const [syncSymbol, setSyncSymbol] = useState(false)
  const [syncInterval, setSyncInterval] = useState(false)
  const [syncCrosshair, setSyncCrosshair] = useState(false)
  const [syncTime, setSyncTime] = useState(false)
  const [syncDateRange, setSyncDateRange] = useState(false)
  const [syncDrawings, setSyncDrawings] = useState(false)
  const [sharedDrawings, setSharedDrawings] = useState([])

  const [watchlistApply, setWatchlistApply] = useState(null)
  const [symbolApplyTick, setSymbolApplyTick] = useState(0)

  const watchlist = useWatchlist()

  const applySharedSymbol = (sym) => {
    const next = String(sym).trim().toUpperCase()
    if (!next) return
    setSharedSymbol(next)
    setSymbolApplyTick((t) => t + 1)
  }

  const handleWatchlistSelect = (sym) => {
    const next = String(sym).trim().toUpperCase()
    setSharedSymbol(next)
    if (syncSymbol) {
      setSymbolApplyTick((t) => t + 1)
    } else {
      setWatchlistApply({ symbol: next, chartId: focusedChartId ?? 0, ts: Date.now() })
    }
    setFocusedChartId(null)
  }

  return (
    <div className={`dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        layoutId={layoutId}
        onLayoutChange={(id) => { setLayoutId(id); setFocusedChartId(null) }}
        watchlist={watchlist}
        onWatchlistSelect={handleWatchlistSelect}
        activeSymbol={sharedSymbol}
      />

      <div className="dashboard-main">
        <TopBar
          sharedSymbol={sharedSymbol}
          onApplySymbol={applySharedSymbol}
          sharedTimeframe={sharedTimeframe}
          setSharedTimeframe={setSharedTimeframe}
          sharedDateRange={sharedDateRange}
          setSharedDateRange={setSharedDateRange}
          syncSymbol={syncSymbol}
          setSyncSymbol={setSyncSymbol}
          syncInterval={syncInterval}
          setSyncInterval={setSyncInterval}
          syncCrosshair={syncCrosshair}
          setSyncCrosshair={setSyncCrosshair}
          syncTime={syncTime}
          setSyncTime={setSyncTime}
          syncDateRange={syncDateRange}
          setSyncDateRange={setSyncDateRange}
          syncDrawings={syncDrawings}
          setSyncDrawings={setSyncDrawings}
        />

        <div className="chart-area">
          <ChartGrid
            layoutId={layoutId}
            sharedSymbol={sharedSymbol}
            sharedTimeframe={sharedTimeframe}
            setSharedSymbol={setSharedSymbol}
            setSharedTimeframe={setSharedTimeframe}
            sharedDateRange={sharedDateRange}
            setSharedDateRange={setSharedDateRange}
            syncSymbol={syncSymbol}
            syncInterval={syncInterval}
            syncCrosshair={syncCrosshair}
            syncTime={syncTime}
            syncDateRange={syncDateRange}
            syncDrawings={syncDrawings}
            sharedDrawings={sharedDrawings}
            setSharedDrawings={setSharedDrawings}
            focusedChartId={focusedChartId}
            setFocusedChartId={setFocusedChartId}
            watchlistTickers={watchlist.tickers}
            watchlistApply={watchlistApply}
            symbolApplyTick={symbolApplyTick}
          />
        </div>
      </div>
    </div>
  )
}
