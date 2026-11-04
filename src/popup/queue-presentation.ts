import {queueProgress, type DownloadBatch, type DownloadJob} from '../domain/download-queue.ts'

export function queueSummary(batch: DownloadBatch) {
  if (batch.status === 'reading') return 'Reading the complete playlist…'
  if (batch.status === 'error') return 'Couldn’t read the full playlist. Retry to start the batch.'
  const progress = queueProgress(batch)
  const label = {queued: 'Queued', running: 'Downloading', paused: 'Paused', finished: 'Finished', cancelled: 'Cancelled'}[batch.status]
  return `${label} · ${progress.processed} of ${progress.total} processed · Downloaded ${progress.completed} · Failed ${progress.failed} · Skipped ${progress.skipped}`
}

export function batchSettingsSummary(batch: DownloadBatch) {
  const settings = batch.settings
  return `${settings.format.toUpperCase()} · ${settings.preferredLanguage ?? settings.browserLanguage} → English → available captions${settings.format === 'txt'
    ? ` · Timestamps ${settings.includeTimestamps ? 'on' : 'off'} · Title ${settings.includeTitle ? 'on' : 'off'} · Link ${settings.includeLink ? 'on' : 'off'}` : ''}`
}

const ERRORS: Record<string, string> = {
  unavailable: 'Video unavailable', 'track-unavailable': 'No caption track available', 'empty-transcript': 'No captions available',
  timeout: 'YouTube timed out', network: 'YouTube request failed', 'invalid-transcript': 'Invalid caption response',
  'download-interrupted': 'File download interrupted', 'download-failed': 'File download rejected',
  'download-uncertain': 'Check your files before retrying: download status unknown',
}

export function jobSummary(job: DownloadJob) {
  const labels = {pending: job.retryAt ? 'Waiting to retry' : 'Waiting', loading: 'Loading captions', downloading: 'Saving file',
    completed: 'Downloaded', failed: 'Failed', skipped: 'Skipped', cancelled: 'Cancelled'}
  return `${labels[job.status]}${job.languageCode ? ` · ${job.languageCode}` : ''}${job.error ? ` · ${ERRORS[job.error] ?? 'Couldn’t process this video'}` : ''}`
}
