import {useSyncExternalStore} from 'react'
import type {VideoErrorCode} from '../domain/video.ts'
import {popupStore} from './popup-state.ts'

const ERROR_MESSAGES = {
  network: 'Could not load video details. Check your connection and try again.',
  timeout: 'YouTube took too long to respond. Try again.',
  'page-data': 'Could not read caption data. This does not mean the video has no transcript.',
  unavailable: 'YouTube could not play this video. Check access in the video tab, then retry.',
  'video-changed': 'The video changed while loading. Try again for the current video.',
  connection: 'Could not reach the YouTube tab. Reload the page and try again.',
} satisfies Record<VideoErrorCode, string>

export default function PopupApp() {
  const state = useSyncExternalStore(popupStore.subscribe, popupStore.getSnapshot)

  return (
    <main className="popup" aria-labelledby="popup-title">
      <header className="popup-header">
        <span className="brand-mark" aria-hidden="true">[t]</span>
        <span className="eyebrow">YouTube tools</span>
      </header>

      <h1 id="popup-title">Transcript<br />Downloader<span className="accent">.</span></h1>
      <p className="intro">From video to words.</p>

      <section className="video-details" aria-label="Video captions" aria-busy={state.status === 'loading'}>
        <div aria-live="polite" role="status">
          {state.status === 'loading' && <p className="status-message">Reading video captions…</p>}
          {state.status === 'unsupported' && (
            <p className="status-message">Open a YouTube video to see its available captions.</p>
          )}
          {state.status === 'ready' && (
            <>
              <h2 className="video-title">{state.inspection.video.title}</h2>
              <p className="caption-count">
                {state.inspection.tracks.length === 0
                  ? 'YouTube lists no caption tracks for this video.'
                  : `${state.inspection.tracks.length} caption ${state.inspection.tracks.length === 1 ? 'track' : 'tracks'} available`}
              </p>
            </>
          )}
        </div>
        {state.status === 'ready' && state.inspection.tracks.length > 0 && (
          <ul className="track-list" aria-label="Available caption tracks">
            {state.inspection.tracks.map((track) => (
              <li key={track.id}>
                <span>{track.label}</span>
                <span className="track-kind">{track.kind === 'auto' ? 'Auto-generated' : 'Manual'}</span>
              </li>
            ))}
          </ul>
        )}
        {state.status === 'error' && (
          <>
            <p className="error-message" role="alert">{ERROR_MESSAGES[state.code]}</p>
            <button className="retry-button" type="button" onClick={() => void popupStore.reload()}>
              Retry
            </button>
          </>
        )}
      </section>

      <footer className="popup-footer">
        <span>TXT / SRT / VTT</span>
        <span>v{chrome.runtime.getManifest().version}</span>
      </footer>
    </main>
  )
}
