import {useState, useSyncExternalStore} from 'react'
import {popupStore, settingsStore} from './popup-state.ts'
import VideoDetails from './components/VideoDetails'
import ExportControls from './components/ExportControls'
import Preferences from './components/Preferences'

export default function PopupApp() {
  const state = useSyncExternalStore(popupStore.subscribe, popupStore.getSnapshot)
  const preferences = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot)
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <main className="popup" aria-labelledby="popup-title">
      <header className="popup-header">
        <h1 id="popup-title">{settingsOpen ? 'Settings' : 'YouTube Transcript'}</h1>
        <div className="header-actions">
          {!settingsOpen && (
            <button type="button" className="icon-button" aria-label="Refresh video" title="Refresh video"
              disabled={state.status === 'loading'} onClick={() => void popupStore.reload()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 7v5h-5M4 17v-5h5" />
                <path d="M6 7a7 7 0 0 1 11.5-1L20 9M4 15l2.5 3A7 7 0 0 0 18 17" />
              </svg>
            </button>
          )}
          <button type="button" className="icon-button" aria-label={settingsOpen ? 'Close settings' : 'Settings'}
            title={settingsOpen ? 'Close settings' : 'Settings'} aria-expanded={settingsOpen}
            aria-controls="preferences" onClick={() => setSettingsOpen(!settingsOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {settingsOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <>
                <path d="m9 3-.6 2.4-2 .9L4 5.6 2 9l1.8 1.7v2.6L2 15l2 3.4 2.4-.7 2 .9L9 21h6l.6-2.4 2-.9 2.4.7 2-3.4-1.8-1.7v-2.6L22 9l-2-3.4-2.4.7-2-.9L15 3Z" />
                <circle cx="12" cy="12" r="3" />
              </>}
            </svg>
          </button>
        </div>
      </header>

      <div hidden={settingsOpen}>
        <section className="video-details" aria-label="Video captions" aria-busy={state.status === 'loading'}>
          <VideoDetails state={state} />
        </section>

        {state.status === 'ready' && state.inspection.tracks.length > 0 && (
          <ExportControls inspection={state.inspection} selection={state.selection}
            settings={preferences.settings} settingsLoading={preferences.status === 'loading' || preferences.status === 'saving'} />
        )}
      </div>
      <div id="preferences" hidden={!settingsOpen}>
        {settingsOpen && <Preferences settings={preferences.settings}
          tracks={state.status === 'ready' ? state.inspection.tracks : []}
          disabled={preferences.status === 'loading' || preferences.status === 'saving' || preferences.status === 'read-error'} />}
      </div>
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
