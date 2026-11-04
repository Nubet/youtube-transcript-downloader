import {isRecord} from '../shared/is-record.ts'
import {isPlaylistId} from '../domain/playlist.ts'
import {isQueueId} from '../domain/queue-validation.ts'
import type {DownloadQueueState, QueueCommand} from '../domain/download-queue.ts'

export type QueueRequest = {type: 'queue.get'} |
  {type: 'queue.start'; playlistId: string; browserLanguage: string} |
  {type: 'queue.command'; batchId: string; action: QueueCommand}
export type QueueResponse = {ok: true; state: DownloadQueueState; batchId?: string} | {ok: false; error: string}

export function isQueueRequest(value: unknown): value is QueueRequest {
  if (!isRecord(value)) return false
  if (value.type === 'queue.get') return true
  if (value.type === 'queue.start') {
    if (!isPlaylistId(value.playlistId) || typeof value.browserLanguage !== 'string' || value.browserLanguage.length > 63) return false
    try { return Intl.getCanonicalLocales(value.browserLanguage).length === 1 } catch { return false }
  }
  return value.type === 'queue.command' && isQueueId(value.batchId) &&
    ['pause', 'resume', 'cancel', 'retry', 'remove'].includes(String(value.action))
}
