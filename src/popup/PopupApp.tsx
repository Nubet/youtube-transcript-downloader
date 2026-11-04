import {useSyncExternalStore} from 'react'
import {popupStore} from './popup-state.ts'
import VideoDetails from './components/VideoDetails'

export default function PopupApp() {
  const state = useSyncExternalStore(popupStore.subscribe, popupStore.getSnapshot)
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

      <footer className="popup-footer">
        <span>TXT / SRT / VTT</span>
        <span>v{chrome.runtime.getManifest().version}</span>
      </footer>
    </main>
  )
}
