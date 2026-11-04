import {VideoInspectionError} from '../domain/video.ts'
import {loadPlaylistTranscript} from '../infrastructure/youtube/playlist-transcript.ts'
import {isPlaylistTranscriptRequest} from '../messaging/playlist-transcript-messages.ts'
import {isTranscriptCancelRequest, type TranscriptLoadResponse} from '../messaging/transcript-messages.ts'
import {isRecord} from '../shared/is-record.ts'

export function createPlaylistTranscriptHandler() {
  const requests = new Map<string, AbortController>()
  return {
    handle(message: unknown, respond: (response: TranscriptLoadResponse | {cancelled: true}) => void) {
      if (isRecord(message) && message.type === 'playlist.transcript.cancel') {
        const cancel = {...message, type: 'transcript.cancel'}
        if (!isTranscriptCancelRequest(cancel)) return
        requests.get(cancel.requestId)?.abort()
        respond({cancelled: true})
        return true
      }
      if (!isPlaylistTranscriptRequest(message)) return
      const controller = new AbortController()
      requests.set(message.requestId, controller)
      const reply = (trackId: string | null, result: TranscriptLoadResponse['result']) => respond({
        type: 'transcript.loaded', requestId: message.requestId, videoId: message.videoId, trackId, result,
      })
      void loadPlaylistTranscript(message.videoId, message.settings, controller.signal)
        .then((transcript) => reply(transcript.trackId, {status: 'ready', transcript}),
          (error: unknown) => reply(null, {status: 'error',
            code: error instanceof VideoInspectionError ? error.code : 'connection',
            httpStatus: error instanceof VideoInspectionError ? error.httpStatus : null}))
        .finally(() => requests.delete(message.requestId))
      return true
    },
    dispose() { for (const controller of requests.values()) controller.abort(); requests.clear() },
  }
}
