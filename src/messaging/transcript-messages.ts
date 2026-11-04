import {isVideoId, type VideoErrorCode, type VideoInspection} from '../domain/video.ts'
import {isRecord} from '../shared/is-record.ts'

export type VideoInspectRequest = {
  type: 'video.inspect'
  requestId: string
  videoId: string
}

export type VideoInspectResponse = {
  type: 'video.inspected'
  requestId: string
  videoId: string
  result: {status: 'ready'; inspection: VideoInspection} | {status: 'error'; code: VideoErrorCode}
}

export type VideoNavigationMessage = {
  type: 'video.navigation'
  phase: 'started' | 'finished'
}

const ERROR_CODES: readonly VideoErrorCode[] = [
  'network', 'timeout', 'page-data', 'unavailable', 'video-changed', 'connection',
]

export function isVideoInspectRequest(value: unknown): value is VideoInspectRequest {
  return isRecord(value) && value.type === 'video.inspect' &&
    typeof value.requestId === 'string' && value.requestId.length > 0 &&
    value.requestId.length <= 100 && isVideoId(value.videoId)
}

export function isVideoInspectResponse(value: unknown): value is VideoInspectResponse {
  if (!isRecord(value) || value.type !== 'video.inspected' ||
    typeof value.requestId !== 'string' || !isVideoId(value.videoId) || !isRecord(value.result)) return false
  const result = value.result
  if (result.status === 'error') {
    return ERROR_CODES.some((code) => code === result.code)
  }
  if (value.result.status !== 'ready') return false
  const inspection = value.result.inspection
  if (!isRecord(inspection) || !isRecord(inspection.video) || !Array.isArray(inspection.tracks)) return false
  const {video, tracks} = inspection
  return video.videoId === value.videoId && typeof video.title === 'string' && video.title.trim().length > 0 &&
    (video.durationMs === null || (typeof video.durationMs === 'number' &&
      Number.isSafeInteger(video.durationMs) && video.durationMs > 0)) &&
    tracks.every((track: unknown) => isRecord(track) &&
      typeof track.id === 'string' && track.id.length > 0 &&
      typeof track.languageCode === 'string' && track.languageCode.length <= 63 &&
      /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/iu.test(track.languageCode) &&
      typeof track.label === 'string' && track.label.trim().length > 0 &&
      (track.kind === 'manual' || track.kind === 'auto')) &&
    new Set(tracks.map((track: unknown) => isRecord(track) ? track.id : null)).size === tracks.length
}

export function isVideoNavigationMessage(value: unknown): value is VideoNavigationMessage {
  return isRecord(value) && value.type === 'video.navigation' &&
    (value.phase === 'started' || value.phase === 'finished')
}
