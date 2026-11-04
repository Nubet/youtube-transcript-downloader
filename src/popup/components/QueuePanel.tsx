import {useState, useSyncExternalStore} from 'react'
import type {DownloadBatch} from '../../domain/download-queue.ts'
import {queueProgress} from '../../domain/download-queue.ts'
import {queueStore} from '../popup-state.ts'
import {queueSummary, jobSummary, batchSettingsSummary} from '../queue-presentation.ts'

function BatchActivity({batch}: {batch: DownloadBatch}) {
  const current = batch.jobs.find((job) => job.status === 'loading' || job.status === 'downloading')
  if (current) return <p className="status-message">Current: {current.title}</p>
  const retrying = batch.jobs.find((job) => job.status === 'pending' && job.retryAt !== null)
  return retrying && ['queued', 'running'].includes(batch.status)
    ? <p className="status-message">Waiting to retry: {retrying.title}</p> : null
}

function Batch({batch}: {batch: DownloadBatch}) {
  const [visibleJobs, setVisibleJobs] = useState(50)
  const progress = queueProgress(batch)
  const active = ['reading', 'queued', 'running', 'paused'].includes(batch.status)
  return <section className="queue-batch" aria-labelledby={`batch-${batch.id}`}>
    <h2 id={`batch-${batch.id}`}>{batch.title}</h2>
    <p className="status-message" role="status">{queueSummary(batch)}</p>
    {progress.total > 0 && <progress max={progress.total} value={progress.processed} aria-label={`${batch.title} progress`} />}
    <BatchActivity batch={batch} />
    <details>
      <summary>Batch settings</summary>
      <p className="status-message">{batchSettingsSummary(batch)}</p>
      <p className="status-message">Settings changes affect future downloads. Retries keep this batch’s settings.</p>
    </details>
    <div className="queue-actions">
      {active && batch.status !== 'paused' && <button className="text-button" onClick={() => void queueStore.command(batch.id, 'pause')}>Pause</button>}
      {batch.status === 'paused' && <button className="text-button" onClick={() => void queueStore.command(batch.id, 'resume')}>Resume</button>}
      {active && <button className="text-button" onClick={() => void queueStore.command(batch.id, 'cancel')}>Cancel</button>}
      {(batch.status === 'error' || (batch.status === 'finished' && progress.failed > 0)) &&
        <button className="text-button" onClick={() => void queueStore.command(batch.id, 'retry')}>{batch.status === 'error' ? 'Retry playlist' : 'Retry failed'}</button>}
      {!active && <button className="text-button" onClick={() => void queueStore.command(batch.id, 'remove')}>Dismiss</button>}
    </div>
    {batch.jobs.length > 0 && <details>
      <summary>Show details</summary>
      <ol className="queue-jobs">
        {batch.jobs.slice(0, visibleJobs).map((job) => <li key={job.id}>
          <span>{job.position}. {job.title}</span><span className="status-message">{jobSummary(job)}</span>
        </li>)}
      </ol>
      {batch.jobs.length > visibleJobs && <button className="text-button" onClick={() => setVisibleJobs(visibleJobs + 50)}>Show more</button>}
    </details>}
  </section>
}

export default function QueuePanel() {
  const snapshot = useSyncExternalStore(queueStore.subscribe, queueStore.getSnapshot)
  const [visibleBatches, setVisibleBatches] = useState(10)
  return <section className="queue-panel" aria-label="Playlist download queue">
    {snapshot.state.cooldownUntil > 0 && <p className="status-message" role="status">YouTube is limiting requests. Downloads will resume automatically.</p>}
    {snapshot.status === 'loading' && <p className="status-message" role="status">Loading downloads…</p>}
    {snapshot.error && <div className="preference-error"><p className="error-message" role="alert">{snapshot.error}</p>
      <button className="text-button" onClick={() => void queueStore.refresh()}>Retry</button></div>}
    {snapshot.status === 'ready' && !snapshot.state.batches.length &&
      <p className="empty-state">Open a YouTube playlist and click Download playlist to get started.</p>}
    {snapshot.state.batches.slice(0, visibleBatches).map((batch) => <Batch key={batch.id} batch={batch} />)}
    {snapshot.state.batches.length > visibleBatches && <button className="text-button" onClick={() => setVisibleBatches(visibleBatches + 10)}>Show more playlists</button>}
  </section>
}
