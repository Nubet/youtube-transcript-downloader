import type {TranscriptSource} from '../application/transcript-source.ts'
import type {Transcript} from '../domain/transcript.ts'
import {VideoInspectionError} from '../domain/video.ts'

export function createTranscriptSession(readVideoId: () => string | null, source: TranscriptSource) {
  let revision = 0
  let cachedVideoId: string | null = null
  const cache = new Map<string | null, Transcript>()
  let pending: {
    videoId: string
    trackId: string | null
    requestId: string
    controller: AbortController
    promise: Promise<Transcript>
  } | null = null

  function cancel(requestId?: string) {
    if (requestId !== undefined && pending?.requestId !== requestId) return
    revision++
    pending?.controller.abort()
    pending = null
  }

  async function load(videoId: string, trackId: string | null, requestId: string): Promise<Transcript> {
    if (readVideoId() !== videoId) throw new VideoInspectionError('video-changed')
    if (cachedVideoId !== videoId) {
      cancel()
      cache.clear()
      cachedVideoId = videoId
    }
    if (pending?.videoId === videoId && pending.trackId === trackId) {
      pending.requestId = requestId
      return pending.promise
    }
    cancel()
    const cached = cache.get(trackId)
    if (cached) return cached
    const currentRevision = revision
    const controller = new AbortController()
    const promise = source(videoId, trackId, controller.signal)
      .then((transcript) => {
        if (readVideoId() !== videoId) throw new VideoInspectionError('video-changed')
        if (revision !== currentRevision || controller.signal.aborted) throw new VideoInspectionError('cancelled')
        if (transcript.videoId !== videoId || transcript.trackId !== trackId) {
          throw new VideoInspectionError('invalid-transcript')
        }
        cache.set(trackId, transcript)
        return transcript
      })
      .catch((error: unknown) => {
        if (readVideoId() !== videoId) throw new VideoInspectionError('video-changed')
        if (revision !== currentRevision || controller.signal.aborted) throw new VideoInspectionError('cancelled')
        throw error
      })
      .finally(() => {
        if (revision === currentRevision) pending = null
      })
    pending = {videoId, trackId, requestId, controller, promise}
    return promise
  }

  return {
    load,
    cancel,
    clear() {
      cancel()
      cache.clear()
      cachedVideoId = null
    },
  }
}
