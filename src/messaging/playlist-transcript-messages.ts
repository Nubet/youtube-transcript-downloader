import type {BatchSettings} from '../domain/download-queue.ts'
import {isVideoId} from '../domain/video.ts'
import {isRecord} from '../shared/is-record.ts'

export type PlaylistTranscriptRequest = {
  type: 'playlist.transcript'
  requestId: string
  videoId: string
  settings: Pick<BatchSettings, 'browserLanguage' | 'preferredLanguage'>
}

export function isPlaylistTranscriptRequest(value: unknown): value is PlaylistTranscriptRequest {
  if (!isRecord(value) || value.type !== 'playlist.transcript' ||
    typeof value.requestId !== 'string' || !value.requestId || value.requestId.length > 100 ||
    !isVideoId(value.videoId) || !isRecord(value.settings)) return false
  const {browserLanguage, preferredLanguage} = value.settings
  return typeof browserLanguage === 'string' && browserLanguage.length <= 63 &&
    (preferredLanguage === null || (typeof preferredLanguage === 'string' && preferredLanguage.length <= 63))
}
