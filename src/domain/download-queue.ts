import type {ExtensionSettings} from './settings/extension-settings.ts'
import type {PlaylistVideo} from './playlist.ts'

export type BatchSettings = Pick<ExtensionSettings, 'format' | 'includeTimestamps' | 'includeTitle' | 'includeLink' | 'preferredLanguage'> & {browserLanguage: string}
export type DownloadJob = PlaylistVideo & {
  id: string
  status: 'pending' | 'loading' | 'downloading' | 'completed' | 'failed' | 'skipped' | 'cancelled'
  attempts: number
  retryAt: number | null
  error: string | null
  downloadId: number | null
  filename: string | null
  languageCode: string | null
}
export type DownloadBatch = {
  id: string
  playlistId: string
  title: string
  status: 'reading' | 'queued' | 'running' | 'paused' | 'finished' | 'cancelled' | 'error'
  settings: BatchSettings
  jobs: DownloadJob[]
  createdAt: number
  error: string | null
}
export type DownloadQueueState = {version: 1; batches: DownloadBatch[]; cooldownUntil: number}
export type QueueCommand = 'pause' | 'resume' | 'cancel' | 'retry' | 'remove'

export function queueProgress(batch: DownloadBatch) {
  const count = (status: DownloadJob['status']) => batch.jobs.filter((job) => job.status === status).length
  const completed = count('completed'), failed = count('failed'), skipped = count('skipped'), cancelled = count('cancelled')
  return {total: batch.jobs.length, completed, failed, skipped, cancelled, processed: completed + failed + skipped + cancelled}
}
