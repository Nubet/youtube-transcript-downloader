export function positionPanel(panel: HTMLElement, anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect()
  const top = Math.max(12, Math.min(rect.bottom + 8, innerHeight - 400))
  panel.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - 340))}px`
  panel.style.top = `${top}px`
  panel.style.maxHeight = `calc(100dvh - ${top + 12}px)`
}
