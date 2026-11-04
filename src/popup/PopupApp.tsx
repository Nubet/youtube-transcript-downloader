import {useSyncExternalStore} from 'react'
import {popupStore, settingsStore} from './popup-state.ts'
import VideoDetails from './components/VideoDetails'
import ExportControls from './components/ExportControls'

export default function PopupApp() {
  const state = useSyncExternalStore(popupStore.subscribe, popupStore.getSnapshot)
  const preferences = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot)
  const selection = state.status === 'ready' ? state.selection : null

  return (
    <main className="popup" aria-labelledby="popup-title">
      <header className="popup-header">
        <span className="brand-mark" aria-hidden="true">[t]</span>
        <span className="eyebrow">YouTube tools</span>
      </header>

      <h1 id="popup-title">Transcript<br />Downloader<span className="accent">.</span></h1>
      <p className="intro">From video to words.</p>

      <section className="video-details" aria-label="Video captions" aria-busy={state.status === 'loading' || selection?.status === 'loading'}>
        <VideoDetails state={state} />
      </section>

      <ExportControls selection={selection} settings={preferences.settings} settingsLoading={preferences.status === 'loading'} />
      {preferences.status === 'saving' && <p className="status-message" role="status">Saving preferences…</p>}
      {preferences.status === 'read-error' && (
        <div>
          <p className="error-message" role="alert">Could not read preferences. Using defaults.</p>
          <button type="button" className="retry-button" onClick={() => void settingsStore.retry()}>Retry preferences</button>
        </div>
      )}
      {preferences.status === 'write-error' && (
        <p className="error-message" role="alert">Could not save preferences. Select the option again to retry.</p>
      )}

      <footer className="popup-footer">
        <span>TXT / SRT / VTT</span>
        <span>v{chrome.runtime.getManifest().version}</span>
      </footer>
    </main>
  )
}
