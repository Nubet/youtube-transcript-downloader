import {useSyncExternalStore} from 'react'
import {popupStore, settingsStore} from './popup-state.ts'
import VideoDetails from './components/VideoDetails'
import ExportControls from './components/ExportControls'

export default function PopupApp() {
  const state = useSyncExternalStore(popupStore.subscribe, popupStore.getSnapshot)
  const preferences = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot)
  return (
    <main className="popup" aria-labelledby="popup-title">
      <header className="popup-header">
        <h1 id="popup-title">YouTube Transcript</h1>
        <button type="button" className="icon-button" aria-label="Refresh video" title="Refresh video"
          disabled={state.status === 'loading'} onClick={() => void popupStore.reload()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 7v5h-5M4 17v-5h5" />
            <path d="M6 7a7 7 0 0 1 11.5-1L20 9M4 15l2.5 3A7 7 0 0 0 18 17" />
          </svg>
        </button>
      </header>

      <section className="video-details" aria-label="Video captions" aria-busy={state.status === 'loading'}>
        <VideoDetails state={state} />
      </section>

      {state.status === 'ready' && state.inspection.tracks.length > 0 && (
        <ExportControls inspection={state.inspection} selection={state.selection}
          settings={preferences.settings} settingsLoading={preferences.status === 'loading'} />
      )}
      {preferences.status === 'read-error' && (
        <div className="preference-error">
          <p className="error-message" role="alert">Preferences unavailable. Using defaults.</p>
          <button type="button" className="text-button" onClick={() => void settingsStore.retry()}>Retry preferences</button>
        </div>
      )}
      {preferences.status === 'write-error' && (
        <p className="error-message preference-error" role="alert">Preference not saved. Select it again to retry.</p>
      )}
    </main>
  )
}
