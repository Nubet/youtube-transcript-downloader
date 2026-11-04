import {useState, useSyncExternalStore} from 'react'
import {queueStore} from '../popup-state.ts'

export default function PlaylistDownload({playlistId, disabled, onStarted}: {
  playlistId: string
  disabled: boolean
  onStarted: () => void
}) {
  const [starting, setStarting] = useState(false)
  const snapshot = useSyncExternalStore(queueStore.subscribe, queueStore.getSnapshot)

  async function start() {
    if (starting) return
    setStarting(true)
    const batchId = await queueStore.start(playlistId)
    setStarting(false)
    if (batchId) onStarted()
  }

  return <section className="export-controls" aria-label="Download playlist" aria-busy={starting}>
    <p className="status-message">Download all transcripts in this playlist using your saved settings.</p>
    <div className="export-actions playlist-actions">
      <button type="button" className="download-button" disabled={disabled || starting}
        onClick={() => void start()}>{starting ? 'Starting playlist…' : 'Download playlist'}</button>
    </div>
    {snapshot.error && <p className="error-message" role="alert">{snapshot.error}</p>}
  </section>
}
