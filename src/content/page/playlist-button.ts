import {getPlaylistId} from '../../domain/playlist.ts'
import {queueProgress} from '../../domain/download-queue.ts'
import {createQueueStore} from '../../popup/queue-store.ts'
import {createSettingsStore} from '../../popup/settings-store.ts'
import {browserSettings} from '../../infrastructure/browser/settings.ts'
import {isExtensionContextInvalidated} from '../../infrastructure/browser/runtime-context.ts'
import {PAGE_STYLES} from './styles.ts'
import {positionPanel} from './panel-position.ts'
import {PAGE_PREFERENCES, mountPagePreferences} from './preferences.ts'
import {queueSummary, jobSummary, batchSettingsSummary} from '../../popup/queue-presentation.ts'

const PLAYLIST_TARGETS = [
  'ytd-playlist-header-renderer #top-level-buttons-computed',
  'yt-page-header-renderer .yt-page-header-view-model__page-header-actions',
  'ytd-playlist-header-renderer #menu',
  'ytd-playlist-sidebar-primary-info-renderer #menu',
  'ytd-playlist-header-renderer',
  'ytd-playlist-sidebar-primary-info-renderer',
]

export function mountPlaylistButton(run: (action: () => void) => void) {
  const preferences = createSettingsStore(browserSettings)
  const queue = createQueueStore()
  const host = document.createElement('div')
  host.setAttribute('data-youtube-playlist-download', '')
  const shadow = host.attachShadow({mode: 'open'})
  shadow.innerHTML = `<style>${PAGE_STYLES}</style>
    <div class="split-button" role="group" aria-label="Playlist download">
      <button id="start" type="button">Download playlist</button>
      <button id="menu" type="button" aria-label="Playlist download settings and progress" aria-haspopup="dialog" aria-controls="playlist-panel" aria-expanded="false">⋮</button>
    </div>
    <section id="playlist-panel" popover="auto" role="dialog" aria-label="Playlist downloads">
      <header><strong>Playlist downloads</strong><button id="close" type="button" aria-label="Close playlist downloads">×</button></header>
      <p id="playlist-title"></p>
      ${PAGE_PREFERENCES}
      <p id="settings-note"></p>
      <p id="progress-text" role="status" aria-live="polite"></p>
      <progress id="progress" aria-label="Playlist progress" max="1" value="0" hidden></progress>
      <p id="current"></p><p id="queue-error" role="alert" hidden></p>
      <div class="actions"><button id="pause" type="button" hidden>Pause</button><button id="resume" type="button" hidden>Resume</button><button id="cancel" type="button" hidden>Cancel</button><button id="retry" type="button" hidden>Retry failed</button></div>
      <details id="job-details"><summary>Show details</summary><ol id="jobs" class="queue-jobs"></ol><button id="more-jobs" type="button" hidden>Show more</button></details>
    </section>`
  const start = shadow.querySelector<HTMLButtonElement>('#start')!
  const menu = shadow.querySelector<HTMLButtonElement>('#menu')!
  const panel = shadow.querySelector<HTMLElement>('#playlist-panel')!
  let disposed = false, navigating = false, observing = false, starting = false
  let stopQueue: (() => void) | null = null
  let visibleJobs = 50
  const renderPreferences = mountPagePreferences(shadow, preferences, run, () => render())
  const currentBatch = () => [...queue.getSnapshot().state.batches].reverse().find((batch) => batch.playlistId === getPlaylistId(location.href))

  function close() {
    if (panel.matches(':popover-open')) panel.hidePopover()
    menu.setAttribute('aria-expanded', 'false')
  }
  function open() {
    positionPanel(panel, start)
    if (!panel.matches(':popover-open')) panel.showPopover()
    menu.setAttribute('aria-expanded', 'true')
    shadow.querySelector<HTMLButtonElement>('#close')!.focus()
  }
  function render() {
    if (disposed) return
    const snapshot = queue.getSnapshot()
    const batch = currentBatch()
    const progress = batch ? queueProgress(batch) : null
    renderPreferences([])
    const active = batch && ['reading', 'queued', 'running', 'paused'].includes(batch.status)
    start.disabled = starting || snapshot.status === 'loading'
    start.textContent = starting || batch?.status === 'reading' ? 'Reading playlist…'
      : batch?.status === 'paused' ? 'Playlist paused'
      : active && progress ? `Downloading · ${progress.processed}/${progress.total}` : 'Download playlist'
    shadow.querySelector('#playlist-title')!.textContent = batch?.title ?? ''
    shadow.querySelector('#progress-text')!.textContent = batch ? queueSummary(batch) : 'Download all transcripts using your saved settings.'
    shadow.querySelector('#settings-note')!.textContent = batch
      ? `Batch: ${batchSettingsSummary(batch)}. Settings changes affect future downloads; retries keep this batch’s settings.` : ''
    const bar = shadow.querySelector<HTMLProgressElement>('#progress')!
    bar.hidden = !progress?.total
    bar.max = progress?.total || 1
    bar.value = progress?.processed ?? 0
    const current = batch?.jobs.find((job) => ['loading', 'downloading'].includes(job.status))
    shadow.querySelector('#current')!.textContent = current ? `Current: ${current.title}` : ''
    const error = shadow.querySelector<HTMLElement>('#queue-error')!
    const settingsError = ['read-error', 'write-error'].includes(preferences.getSnapshot().status)
    error.hidden = !snapshot.error && !settingsError
    error.textContent = snapshot.error ?? (settingsError ? 'Preferences unavailable. Reopen the menu to try again.' : '')
    shadow.querySelector<HTMLElement>('#pause')!.hidden = !active || batch?.status === 'paused'
    shadow.querySelector<HTMLElement>('#resume')!.hidden = batch?.status !== 'paused'
    shadow.querySelector<HTMLElement>('#cancel')!.hidden = !active
    const retry = shadow.querySelector<HTMLButtonElement>('#retry')!
    retry.hidden = batch?.status !== 'error' && !(batch?.status === 'finished' && progress?.failed)
    retry.textContent = batch?.status === 'error' ? 'Retry playlist' : 'Retry failed'
    shadow.querySelector<HTMLElement>('#job-details')!.hidden = !batch?.jobs.length
    const jobs = batch?.jobs.slice(0, visibleJobs) ?? []
    shadow.querySelector('#jobs')!.replaceChildren(...jobs.map((job) => {
      const row = document.createElement('li')
      row.textContent = `${job.position}. ${job.title} — ${jobSummary(job)}`
      return row
    }))
    shadow.querySelector<HTMLElement>('#more-jobs')!.hidden = !batch || batch.jobs.length <= visibleJobs
  }
  function synchronize() {
    if (disposed) return
    const enabled = preferences.getSnapshot().settings.showPageButton
    if (enabled && !observing) {
      observing = true
      observer.observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['dark']})
      stopQueue = queue.subscribe(() => run(render))
    } else if (!enabled && observing) {
      observing = false
      observer.disconnect()
      stopQueue?.(); stopQueue = null
    }
    if (!enabled || navigating || !getPlaylistId(location.href)) { close(); host.remove(); return }
    host.toggleAttribute('dark', document.documentElement.hasAttribute('dark'))
    const selectors = new URL(location.href).pathname === '/playlist' ? PLAYLIST_TARGETS : ['ytd-playlist-panel-renderer #header-contents']
    const target = selectors.map((selector) => document.querySelector(selector)).find((node) => node && node.getClientRects().length)
    if (target && host.parentElement !== target) { close(); target.append(host) }
    render()
  }
  const observer = new MutationObserver(() => run(synchronize))
  const stopPreferences = preferences.subscribe(() => run(synchronize))
  start.addEventListener('click', () => run(() => {
    const id = getPlaylistId(location.href)
    if (!id || starting) return
    const batch = currentBatch()
    if (batch && ['reading', 'queued', 'running', 'paused'].includes(batch.status)) { open(); return }
    starting = true; render()
    void queue.start(id).finally(() => run(() => {
      starting = false; render()
      if (!disposed && !navigating && host.parentElement && getPlaylistId(location.href) === id) open()
    }))
  }))
  menu.addEventListener('click', () => run(() => { if (panel.matches(':popover-open')) close(); else open() }))
  shadow.querySelector('#close')!.addEventListener('click', () => { close(); menu.focus() })
  panel.addEventListener('toggle', () => { if (!panel.matches(':popover-open')) menu.setAttribute('aria-expanded', 'false') })
  shadow.querySelector('#more-jobs')!.addEventListener('click', () => { visibleJobs += 50; render() })
  for (const action of ['pause', 'resume', 'cancel', 'retry'] as const) {
    shadow.querySelector(`#${action}`)!.addEventListener('click', () => run(() => {
      const batch = currentBatch()
      if (batch) void queue.command(batch.id, action)
    }))
  }
  return {
    navigationStarted() { navigating = true; close(); host.remove() },
    navigationFinished() { navigating = false; synchronize() },
    dispose() {
      if (disposed) return
      disposed = true; observer.disconnect(); close(); host.remove()
      try { stopQueue?.(); stopPreferences() } catch (error) { if (!isExtensionContextInvalidated(error)) throw error }
    },
  }
}
