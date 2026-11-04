import type {DownloadQueueState} from './download-queue.ts'
import {isPlaylistId} from './playlist.ts'
import {isVideoId} from './video.ts'
import {isRecord} from '../shared/is-record.ts'

export const isQueueId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d-]{36}$/u.test(value)
const time = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const nullableText = (value: unknown) => value === null || typeof value === 'string'

export function isDownloadQueueState(value: unknown): value is DownloadQueueState {
  if (!isRecord(value) || value.version !== 1 || !time(value.cooldownUntil) || !Array.isArray(value.batches)) return false
  return value.batches.every((batch: unknown) => {
    if (!isRecord(batch) || !isQueueId(batch.id) || !isPlaylistId(batch.playlistId) || typeof batch.title !== 'string' ||
      !time(batch.createdAt) || !nullableText(batch.error) || typeof batch.status !== 'string' ||
      !['reading', 'queued', 'running', 'paused', 'finished', 'cancelled', 'error'].includes(batch.status) ||
      !isRecord(batch.settings) || !Array.isArray(batch.jobs)) return false
    const settings = batch.settings
    if (!['txt', 'srt', 'vtt'].includes(String(settings.format)) ||
      !['includeTitle', 'includeLink', 'includeTimestamps'].every((key) => typeof settings[key] === 'boolean') ||
      !nullableText(settings.preferredLanguage) || typeof settings.browserLanguage !== 'string') return false
    return batch.jobs.every((job: unknown) => isRecord(job) && isQueueId(job.id) &&
      (job.videoId === null || isVideoId(job.videoId)) && typeof job.title === 'string' && time(job.position) && job.position > 0 &&
      typeof job.status === 'string' && ['pending', 'loading', 'downloading', 'completed', 'failed', 'skipped', 'cancelled'].includes(job.status) &&
      time(job.attempts) && (job.retryAt === null || time(job.retryAt)) && nullableText(job.error) &&
      (job.downloadId === null || time(job.downloadId)) && nullableText(job.languageCode) &&
      (job.filename === null || (typeof job.filename === 'string' && job.filename.startsWith(`YouTube transcripts/${batch.id}/`) &&
        !job.filename.slice(`YouTube transcripts/${batch.id}/`.length).match(/[/\\]|^\.\.?$/u))))
  })
}
