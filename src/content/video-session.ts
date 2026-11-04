import type {VideoSource} from '../application/video-source.ts'
import {VideoInspectionError, type VideoInspection} from '../domain/video.ts'

export function createVideoSession(readVideoId: () => string | null, source: VideoSource) {
  let revision = 0
  let navigating = false
  let controller: AbortController | null = null
  let pending: Promise<VideoInspection> | null = null
  let pendingVideoId: string | null = null
  let cached: VideoInspection | null = null

  function invalidate() {
    revision++
    controller?.abort()
    controller = null
    pending = null
    pendingVideoId = null
    cached = null
  }

  async function inspect(videoId: string): Promise<VideoInspection> {
    if (navigating || readVideoId() !== videoId) throw new VideoInspectionError('video-changed')
    if (cached?.video.videoId === videoId) return cached
    if (pending && pendingVideoId === videoId) return pending

    invalidate()
    const currentRevision = revision
    const operation = new AbortController()
    controller = operation
    pendingVideoId = videoId
    const isCurrent = () => !navigating && revision === currentRevision &&
      !operation.signal.aborted && readVideoId() === videoId

    pending = source(videoId, operation.signal)
      .then((inspection) => {
        if (!isCurrent() || inspection.video.videoId !== videoId) {
          throw new VideoInspectionError('video-changed')
        }
        cached = inspection
        return inspection
      })
      .catch((error: unknown) => {
        if (!isCurrent()) throw new VideoInspectionError('video-changed')
        throw error
      })
      .finally(() => {
        if (revision === currentRevision) {
          pending = null
          pendingVideoId = null
          controller = null
        }
      })
    return pending
  }

  return {
    inspect,
    navigationStarted() {
      navigating = true
      invalidate()
    },
    navigationFinished() {
      navigating = false
      invalidate()
    },
    dispose: invalidate,
  }
}
