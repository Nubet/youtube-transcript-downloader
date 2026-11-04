import {useState, useSyncExternalStore} from 'react'
import {popupStore, settingsStore} from './popup-state.ts'
import VideoDetails from './components/VideoDetails'
import ExportControls from './components/ExportControls'
import Preferences from './components/Preferences'
import QueuePanel from './components/QueuePanel'
import PopupHeader, {type PopupView} from './components/PopupHeader'
import PlaylistDownload from './components/PlaylistDownload'

export default function PopupApp() {
  const state = useSyncExternalStore(popupStore.subscribe, popupStore.getSnapshot)
  const preferences = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot)
  const [view, setView] = useState<PopupView>('video')
  return (
    <main className="popup" aria-labelledby="popup-title">
      <PopupHeader view={view} onViewChange={setView} refreshing={state.status === 'loading'} onRefresh={() => void popupStore.reload()} />

      <div hidden={view !== 'video'}>
        <section className="video-details" aria-label={state.status === 'playlist' ? 'Playlist' : 'Video captions'} aria-busy={state.status === 'loading'}>
          <VideoDetails state={state} />
        </section>

        {state.status === 'playlist' && <PlaylistDownload key={state.playlist.id} playlistId={state.playlist.id}
          disabled={preferences.status !== 'ready'} onStarted={() => setView('queue')} />}

        {state.status === 'ready' && state.inspection.tracks.length > 0 && (
          <ExportControls inspection={state.inspection} selection={state.selection}
            settings={preferences.settings} settingsLoading={preferences.status === 'loading' || preferences.status === 'saving'} />
        )}
      </div>
      <div id="download-queue" hidden={view !== 'queue'}>
        {view === 'queue' && <QueuePanel />}
      </div>
      <div id="preferences" hidden={view !== 'settings'}>
        {view === 'settings' && <Preferences settings={preferences.settings}
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
