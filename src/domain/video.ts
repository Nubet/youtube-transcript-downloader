export type VideoContext = {
  readonly videoId: string
  readonly title: string
  readonly durationMs: number | null
}

export function isVideoId(value: unknown): value is string {
  return typeof value === 'string' && /^[\w-]{11}$/u.test(value)
}

export type CaptionTrack = {
  readonly id: string
  readonly languageCode: string
  readonly label: string
  readonly kind: 'manual' | 'auto'
}

export type VideoInspection = {
  readonly video: VideoContext
  readonly tracks: readonly CaptionTrack[]
}

export type VideoErrorCode =
  | 'network'
  | 'timeout'
  | 'page-data'
  | 'unavailable'
  | 'video-changed'
  | 'connection'
  | 'empty-transcript'
  | 'invalid-transcript'
  | 'track-unavailable'
  | 'panel-unavailable'
  | 'panel-incomplete'
  | 'panel-filtered'
  | 'cancelled'

export class VideoInspectionError extends Error {
  readonly code: VideoErrorCode
  readonly httpStatus: number | null

  constructor(code: VideoErrorCode, httpStatus: number | null = null) {
    super(code)
    this.name = 'VideoInspectionError'
    this.code = code
    this.httpStatus = httpStatus
  }
}
