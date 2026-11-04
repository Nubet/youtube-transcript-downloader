import type {Transcript} from '../../../domain/transcript.ts'
import {VideoInspectionError, type VideoContext} from '../../../domain/video.ts'
import {getVideoId} from '../video-context.ts'
import {estimatePanelCues, parsePanelTimestamp, type PanelRow} from './panel-cues.ts'
import {clickPanelButton, composedParent, panelRoot, queryPanelElements, SEGMENTS, visible} from './panel-dom.ts'

export async function loadPanelTranscript(video: VideoContext, signal: AbortSignal): Promise<Transcript> {
  const deadline = Date.now() + 50_000
  let opened = false
  let expanded = false
  let userInteracted = false
  let root: Element | null = null
  let scroller: HTMLElement | null = null
  let originalScroll = 0
  const interacted = (event: Event) => { if (event.isTrusted) userInteracted = true }
  const events = ['pointerdown', 'keydown', 'wheel', 'touchstart']
  const originalPanels = new Set(queryPanelElements('ytd-engagement-panel-section-list-renderer').filter(visible))
  for (const event of events) document.addEventListener(event, interacted, {passive: true})

  function check() {
    if (getVideoId(location.href) !== video.videoId) throw new VideoInspectionError('video-changed')
    if (signal.aborted) throw new VideoInspectionError('cancelled')
    if (Date.now() >= deadline) throw new VideoInspectionError('panel-incomplete')
  }

  async function pause(ms = 150) {
    check()
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer)
        reject(new VideoInspectionError('cancelled'))
      }
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
      signal.addEventListener('abort', abort, {once: true})
    })
    check()
  }

  try {
    check()
    root = panelRoot()
    if (!root) {
      const show = /^(?:show transcript|pokaż transkrypcję)$/iu
      if (!clickPanelButton(show)) {
        const description = document.querySelector('ytd-watch-metadata #description')
        if (description instanceof HTMLElement) {
          description.click()
          expanded = true
          await pause()
        }
        if (!clickPanelButton(show)) throw new VideoInspectionError('panel-unavailable')
      }
      opened = true
      const openingDeadline = Date.now() + 12_000
      while (!(root = panelRoot())) {
        if (Date.now() >= openingDeadline) throw new VideoInspectionError('panel-unavailable')
        await pause()
      }
    }

    const first = queryPanelElements(SEGMENTS, root)[0]
    for (let ancestor = first ? composedParent(first) : null; ancestor; ancestor = composedParent(ancestor)) {
      if (ancestor instanceof HTMLElement && /auto|scroll/u.test(getComputedStyle(ancestor).overflowY)) {
        scroller = ancestor
        break
      }
      if (ancestor === root) break
    }
    originalScroll = scroller?.scrollTop ?? 0
    if (scroller) scroller.scrollTop = 0
    const rows = new Map<string, PanelRow>()
    let previous = new Set<string>()
    let stableBottom = 0
    let lastSize = -1
    while (stableBottom < 3) {
      await pause()
      if (userInteracted) throw new VideoInspectionError('cancelled')
      if (queryPanelElements('input[type="search"], input[type="text"], input:not([type])', root)
        .some((input) => input instanceof HTMLInputElement && input.value.trim())) {
        throw new VideoInspectionError('panel-filtered')
      }
      const current = new Set<string>()
      for (const segment of queryPanelElements(SEGMENTS, root)) {
        const timestamp = queryPanelElements('.ytwTranscriptSegmentViewModelTimestamp, #start-offset, .segment-timestamp', segment)[0]?.textContent
        const text = queryPanelElements('span.ytAttributedStringHost[role="text"], .segment-text', segment)[0]?.textContent?.trim()
        if (!timestamp || !text) throw new VideoInspectionError('invalid-transcript')
        const row = {startMs: parsePanelTimestamp(timestamp), text}
        const key = `${row.startMs}\0${row.text}`
        current.add(key)
        rows.set(key, row)
      }
      if (current.size === 0 || (previous.size > 0 && ![...current].some((key) => previous.has(key)))) {
        throw new VideoInspectionError('panel-incomplete')
      }
      previous = current
      const bottom = !scroller || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
      const loading = queryPanelElements('ytd-continuation-item-renderer, yt-continuation-item-renderer, tp-yt-paper-spinner[active]', root).some(visible)
      stableBottom = bottom && !loading && rows.size === lastSize ? stableBottom + 1 : 0
      lastSize = rows.size
      if (scroller && !bottom) {
        const before = scroller.scrollTop
        scroller.scrollTop += Math.max(1, scroller.clientHeight * 0.65)
        if (scroller.scrollTop === before) throw new VideoInspectionError('panel-incomplete')
      }
    }
    check()
    return {
      videoId: video.videoId, title: video.title, trackId: null, languageCode: null,
      source: 'panel', timing: 'estimated', cues: estimatePanelCues([...rows.values()], video.durationMs),
    }
  } finally {
    for (const event of events) document.removeEventListener(event, interacted)
    if (!userInteracted && getVideoId(location.href) === video.videoId) {
      if (scroller?.isConnected) scroller.scrollTop = originalScroll
      if (opened) {
        const openedRoot = root ?? queryPanelElements('ytd-engagement-panel-section-list-renderer')
          .find((panel) => !originalPanels.has(panel) && visible(panel))
        if (openedRoot?.isConnected) clickPanelButton(/^(?:close|close transcript|zamknij|zamknij transkrypcję)$/iu, openedRoot)
      }
      if (expanded) {
        const collapse = document.querySelector('ytd-watch-metadata #collapse')
        if (collapse instanceof HTMLElement && visible(collapse)) collapse.click()
      }
    }
  }
}
