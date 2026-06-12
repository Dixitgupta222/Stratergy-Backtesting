export const LAYOUT_PRESETS = [
  { id: '1', label: 'Single', icon: '1', count: 1, cols: 1 },
  { id: '2h', label: '2 Col', icon: '2', count: 2, cols: 2 },
  { id: '2v', label: '2 Row', icon: '2', count: 2, cols: 1 },
  { id: '4', label: '2×2', icon: '4', count: 4, cols: 2 },
  { id: '6', label: '3×2', icon: '6', count: 6, cols: 3 },
  { id: '4a', label: '3+1', icon: '4', count: 4, cols: 2, variant: '3top1bottom' }
]

export function getPreset(id) {
  return LAYOUT_PRESETS.find((p) => p.id === id) || LAYOUT_PRESETS[1]
}
