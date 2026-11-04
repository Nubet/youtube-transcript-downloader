export const SEGMENTS = 'ytd-transcript-segment-renderer, transcript-segment-view-model'

export function queryPanelElements(selector: string, root: ParentNode = document): Element[] {
  const matches = [...root.querySelectorAll(selector)]
  for (const element of root.querySelectorAll('*')) {
    if (element.shadowRoot) matches.push(...queryPanelElements(selector, element.shadowRoot))
  }
  return matches
}

export function visible(element: Element): boolean {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
}

export function composedParent(element: Element): Element | null {
  if (element.parentElement) return element.parentElement
  const root = element.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}

export function panelRoot(): Element | null {
  for (const segment of queryPanelElements(SEGMENTS)) {
    if (!visible(segment)) continue
    for (let parent = composedParent(segment); parent; parent = composedParent(parent)) {
      if (parent.matches('ytd-engagement-panel-section-list-renderer, ytd-transcript-renderer')) return parent
    }
  }
  return null
}

export function clickPanelButton(pattern: RegExp, root: ParentNode = document): boolean {
  const button = queryPanelElements('button, [role="button"]', root)
    .find((element) => visible(element) && pattern.test(element.getAttribute('aria-label') ?? element.textContent?.trim() ?? ''))
  if (!(button instanceof HTMLElement)) return false
  button.click()
  return true
}
