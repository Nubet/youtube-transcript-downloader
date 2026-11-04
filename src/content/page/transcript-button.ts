import {createPopupStore, type PopupState} from '../../popup/popup-store.ts'
import {createSettingsStore} from '../../popup/settings-store.ts'
import {browserSettings} from '../../infrastructure/browser/settings.ts'
import {copyTranscript} from '../../infrastructure/browser/clipboard.ts'
import {downloadFromPage} from '../../infrastructure/browser/page-download.ts'
import {isExtensionContextInvalidated} from '../../infrastructure/browser/runtime-context.ts'
import {getVideoId} from '../../infrastructure/youtube/video-context.ts'
import type {TranscriptSource} from '../../application/transcript-source.ts'
import type {VideoInspection} from '../../domain/video.ts'
import type {ExportOptions} from '../../application/prepare-export.ts'
import {PAGE_STYLES} from './styles.ts'

export const BUTTON_TARGETS = [
  'ytd-watch-metadata #actions #top-level-buttons-computed',
  'ytd-watch-flexy #info #menu-container #top-level-buttons-computed',
  'ytd-watch-metadata #actions',
  'ytd-watch-metadata #above-the-fold',
] as const

type Dependencies = {
  run: (action: () => void) => void
  inspect: (refresh: boolean) => Promise<VideoInspection | null>
  load: TranscriptSource
  onError: (error: unknown) => void
}

export function mountTranscriptButton(dependencies: Dependencies) {
  const preferences = createSettingsStore(browserSettings)
  const host = document.createElement('div')
  host.setAttribute('data-youtube-transcript-button', '')
  const shadow = host.attachShadow({mode: 'open'})
  shadow.innerHTML = `<style>${PAGE_STYLES}</style>
    <button id="open" type="button" aria-haspopup="dialog" aria-controls="panel" aria-expanded="false">Download transcript</button>
    <section id="panel" popover="auto" role="dialog" aria-labelledby="heading">
      <header><h2 id="heading">YouTube Transcript</h2><button id="close" type="button" aria-label="Close transcript">×</button></header>
      <p id="title"></p>
      <label>Language<select id="language" aria-label="Language"></select></label>
      <label>Format<select id="format" aria-label="Format"><option value="txt">TXT</option><option value="srt">SRT</option><option value="vtt">VTT</option></select></label>
      <label id="timestamps-row">Timestamps<input id="timestamps" type="checkbox"></label>
      <p id="status" role="status" aria-live="polite"></p>
      <p id="error" role="alert" hidden></p>
      <div class="recovery"><button id="retry" type="button" hidden>Retry</button><button id="fallback" type="button" hidden>Use YouTube transcript</button></div>
      <div class="actions"><button id="download" class="primary" type="button" disabled>Download</button><button id="copy" type="button" disabled>Copy</button></div>
    </section>`
  const button = shadow.querySelector<HTMLButtonElement>('#open')!
  const panel = shadow.querySelector<HTMLElement>('#panel')!
  const language = shadow.querySelector<HTMLSelectElement>('#language')!
  const format = shadow.querySelector<HTMLSelectElement>('#format')!
  const timestamps = shadow.querySelector<HTMLInputElement>('#timestamps')!
  const title = shadow.querySelector<HTMLElement>('#title')!
  const status = shadow.querySelector<HTMLElement>('#status')!
  const errorMessage = shadow.querySelector<HTMLElement>('#error')!
  const download = shadow.querySelector<HTMLButtonElement>('#download')!
  const copy = shadow.querySelector<HTMLButtonElement>('#copy')!
  const retry = shadow.querySelector<HTMLButtonElement>('#retry')!
  const fallback = shadow.querySelector<HTMLButtonElement>('#fallback')!
  let disposed = false
  let navigating = false
  let videoId: string | null = null
  let stopPanel: (() => void) | null = null
  let lastInspection: VideoInspection | null = null
  let observing = false

  function exportOptions(): ExportOptions {
    const settings = preferences.getSnapshot().settings
    return settings.format === 'txt'
      ? {format: 'txt', includeTimestamps: settings.includeTimestamps, includeTitle: settings.includeTitle, includeLink: settings.includeLink}
      : {format: settings.format}
  }

  const store = createPopupStore({
    inspect: dependencies.inspect, load: dependencies.load,
    getSettings: preferences.load, browserLanguage: navigator.language,
    subscribeToNavigation: () => () => {}, copy: copyTranscript,
    download: async () => {
      const state = store.getSnapshot()
      if (state.status !== 'ready' || state.selection.status !== 'ready') throw new Error('Transcript unavailable')
      try { await downloadFromPage(state.selection.transcript, exportOptions()) }
      catch (error) { dependencies.onError(error); throw error }
    },
  })

  function reportError(error: unknown) {
    dependencies.onError(error)
    if (!disposed) {
      errorMessage.hidden = false
      errorMessage.textContent = 'Couldn’t save preferences. Try again.'
    }
  }

  function render(state: PopupState) {
    if (disposed || !stopPanel) return
    const preferenceState = preferences.getSnapshot()
    const settings = preferenceState.settings
    const selection = state.status === 'ready' ? state.selection : null
    if (state.status === 'loading') { title.textContent = ''; lastInspection = null }
    const working = selection?.status === 'ready' && selection.exportState.status === 'working'
    const file = store.getExport(exportOptions())
    download.disabled = copy.disabled = !file || working || preferenceState.status !== 'ready'
    format.value = settings.format
    timestamps.checked = settings.includeTimestamps
    format.disabled = timestamps.disabled = working || preferenceState.status === 'saving'
    shadow.querySelector<HTMLElement>('#timestamps-row')!.hidden = settings.format !== 'txt'
    if (state.status === 'ready' && state.inspection !== lastInspection) {
      lastInspection = state.inspection
      title.textContent = state.inspection.video.title
      language.replaceChildren(...state.inspection.tracks.map((track) => new Option(track.label, track.id)))
    }
    if (selection && selection.status !== 'none') {
      if (selection.trackId === null && !language.querySelector('option[value="panel"]')) language.add(new Option('YouTube transcript', 'panel'))
      language.value = selection.trackId ?? 'panel'
    }
    language.disabled = state.status !== 'ready' || working
    errorMessage.hidden = true
    retry.hidden = fallback.hidden = true
    status.textContent = state.status === 'loading' ? 'Loading video…'
      : selection?.status === 'loading' ? 'Loading transcript…'
      : file?.timing === 'estimated' ? 'YouTube panel · language unspecified · estimated timing.' : ''
    if (state.status === 'error' || selection?.status === 'error') {
      errorMessage.hidden = false
      errorMessage.textContent = 'Couldn’t load captions. Retry or use the YouTube transcript.'
      retry.hidden = false
      fallback.hidden = state.status !== 'ready' || (selection?.status === 'error' && selection.trackId === null)
    } else if (state.status === 'ready' && state.inspection.tracks.length === 0) {
      status.textContent = 'No caption tracks listed for this video.'
      fallback.hidden = selection?.status === 'loading' || selection?.status === 'ready'
    }
    if (selection?.status === 'ready' && selection.exportState.status !== 'idle') {
      const action = selection.exportState
      if (action.file === file) {
        if (action.status === 'success') status.textContent = action.action === 'copy' ? 'Copied.' : 'Download started.'
        if (action.status === 'working') status.textContent = action.action === 'copy' ? 'Copying…' : 'Downloading…'
        if (action.status === 'error') {
          errorMessage.hidden = false
          errorMessage.textContent = 'Couldn’t export. Try again.'
        }
      }
    }
    if (preferenceState.status === 'read-error' || preferenceState.status === 'write-error') {
      errorMessage.hidden = false
      errorMessage.textContent = 'Preferences unavailable. Reopen the panel to retry.'
    }
  }

  function close() {
    stopPanel?.()
    stopPanel = null
    button.setAttribute('aria-expanded', 'false')
    if (panel.matches(':popover-open')) panel.hidePopover()
  }

  function synchronize() {
    if (disposed) return
    const enabled = preferences.getSnapshot().settings.showPageButton
    if (enabled && !observing) {
      observer.observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['dark']})
      observing = true
    } else if (!enabled && observing) {
      observer.disconnect()
      observing = false
    }
    if (navigating || !enabled || !getVideoId(location.href)) {
      close(); host.remove(); return
    }
    const currentId = getVideoId(location.href)
    if (videoId !== currentId) { close(); lastInspection = null; videoId = currentId }
    host.toggleAttribute('dark', document.documentElement.hasAttribute('dark'))
    const target = BUTTON_TARGETS.map((selector) => document.querySelector(selector)).find((node) => node && node.getClientRects().length > 0)
    if (target && host.parentElement !== target) { close(); target.append(host) }
  }

  const observer = new MutationObserver(() => dependencies.run(synchronize))
  const stopPreferences = preferences.subscribe(() => dependencies.run(() => {
    synchronize()
    render(store.getSnapshot())
  }))

  button.addEventListener('click', () => dependencies.run(() => {
    if (panel.matches(':popover-open')) { close(); return }
    const rect = button.getBoundingClientRect()
    panel.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - 340))}px`
    panel.style.top = `${Math.max(12, Math.min(rect.bottom + 8, innerHeight - 400))}px`
    panel.showPopover()
    button.setAttribute('aria-expanded', 'true')
    stopPanel = store.subscribe(() => dependencies.run(() => render(store.getSnapshot())))
    render(store.getSnapshot())
    shadow.querySelector<HTMLButtonElement>('#close')!.focus()
  }))
  panel.addEventListener('toggle', () => { if (!panel.matches(':popover-open')) close() })
  shadow.querySelector('#close')!.addEventListener('click', () => { close(); button.focus() })
  language.addEventListener('change', () => dependencies.run(() => void store.selectLanguage(language.value === 'panel' ? null : language.value)))
  format.addEventListener('change', () => dependencies.run(() => {
    const value = format.value
    if (value === 'txt' || value === 'srt' || value === 'vtt') void preferences.update({format: value}).catch(reportError)
  }))
  timestamps.addEventListener('change', () => dependencies.run(() => {
    void preferences.update({includeTimestamps: timestamps.checked}).catch(reportError)
  }))
  retry.addEventListener('click', () => dependencies.run(() => void store.reload()))
  fallback.addEventListener('click', () => dependencies.run(() => void store.selectLanguage(null)))
  for (const [control, action] of [[download, 'download'], [copy, 'copy']] as const) {
    control.addEventListener('click', () => dependencies.run(() => {
      const file = store.getExport(exportOptions())
      if (file) void store.exportTranscript(action, file)
    }))
  }

  return {
    navigationStarted() { navigating = true; close(); host.remove() },
    navigationFinished() { navigating = false; synchronize() },
    dispose() {
      if (disposed) return
      disposed = true
      observer.disconnect()
      close()
      host.remove()
      try { stopPreferences() } catch (error) { if (!isExtensionContextInvalidated(error)) throw error }
    },
  }
}
