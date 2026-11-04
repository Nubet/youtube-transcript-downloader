import {VideoInspectionError} from '../domain/video.ts'
import {getVideoId} from '../infrastructure/youtube/video-context.ts'
import {createYouTubeSource} from '../infrastructure/youtube/video-source.ts'
import {
  isVideoInspectRequest,
  isTranscriptLoadRequest,
  isTranscriptCancelRequest,
  type TranscriptLoadResponse,
  type VideoInspectResponse,
  type VideoNavigationMessage,
} from '../messaging/transcript-messages.ts'
import {createVideoSession} from './video-session.ts'
import {createTranscriptSession} from './transcript-session.ts'
import {loadPanelTranscript} from '../infrastructure/youtube/panel/panel-source.ts'
import {isExtensionContextInvalidated as isInvalidated} from '../infrastructure/browser/runtime-context.ts'

declare global {
  interface Window {
    __youtubeTranscriptCleanup?: () => void
  }
}

export default function initial() {
  window.__youtubeTranscriptCleanup?.()
  let disposed = false
  const source = createYouTubeSource()
  const readVideoId = () => getVideoId(location.href)
  const session = createVideoSession(readVideoId, source.inspect)
  const transcripts = createTranscriptSession(readVideoId, async (videoId, trackId, signal) => {
    if (trackId !== null) return source.load(videoId, trackId, signal)
    const inspection = await session.inspect(videoId)
    return loadPanelTranscript(inspection.video, signal)
  })

  const whileActive = (action: () => void) => {
    if (disposed) return
    try {
      if (!chrome.runtime.id) { cleanup(); return }
      action()
    } catch (error) {
      if (!isInvalidated(error)) throw error
      cleanup()
    }
  }

  const onMessage = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: VideoInspectResponse | TranscriptLoadResponse | {cancelled: true}) => void
  ) => {
    let authorized = false
    whileActive(() => { authorized = sender.id === chrome.runtime.id })
    if (!authorized) return
    const reply: typeof sendResponse = (response) => whileActive(() => sendResponse(response))
    if (isTranscriptCancelRequest(message)) {
      if (session.isCurrent(message.videoId)) transcripts.cancel(message.requestId)
      reply({cancelled: true})
      return
    }
    if (isTranscriptLoadRequest(message)) {
      const respond = (result: TranscriptLoadResponse['result']) => reply({
        type: 'transcript.loaded', requestId: message.requestId,
        videoId: message.videoId, trackId: message.trackId, result,
      })
      if (!session.isCurrent(message.videoId)) {
        respond({status: 'error', code: 'video-changed'})
        return
      }
      void transcripts.load(message.videoId, message.trackId, message.requestId)
        .then((transcript) => respond({status: 'ready', transcript}))
        .catch((error: unknown) => respond({status: 'error',
          code: error instanceof VideoInspectionError ? error.code : 'invalid-transcript'}))
      return true
    }
    if (!isVideoInspectRequest(message)) return
    if (message.refresh && session.isCurrent(message.videoId)) {
      session.refresh()
      transcripts.clear()
      source.clear()
    }
    const respond = (result: VideoInspectResponse['result']) => reply({
      type: 'video.inspected', requestId: message.requestId, videoId: message.videoId, result,
    })
    void session.inspect(message.videoId)
      .then((inspection) => respond({status: 'ready', inspection}))
      .catch((error: unknown) => respond({
        status: 'error', code: error instanceof VideoInspectionError ? error.code : 'page-data',
      }))
    return true
  }

  const notify = (phase: VideoNavigationMessage['phase']) => {
    whileActive(() => chrome.runtime.sendMessage({type: 'video.navigation', phase} satisfies VideoNavigationMessage,
      () => whileActive(() => void chrome.runtime.lastError)))
  }
  const onStart = () => {
    session.navigationStarted()
    transcripts.clear()
    source.clear()
    notify('started')
  }
  const onFinish = () => {
    session.navigationFinished()
    transcripts.clear()
    source.clear()
    notify('finished')
  }

  const cleanup = () => {
    if (disposed) return
    disposed = true
    session.dispose()
    transcripts.clear()
    source.clear()
    window.removeEventListener('yt-navigate-start', onStart)
    window.removeEventListener('yt-navigate-finish', onFinish)
    window.removeEventListener('popstate', onFinish)
    window.removeEventListener('pagehide', onStart)
    window.removeEventListener('pageshow', onFinish)
    if (window.__youtubeTranscriptCleanup === cleanup) delete window.__youtubeTranscriptCleanup
    try {
      if (chrome.runtime.id) chrome.runtime.onMessage.removeListener(onMessage)
    } catch (error) {
      if (!isInvalidated(error)) throw error
    }
  }
  window.__youtubeTranscriptCleanup = cleanup
  whileActive(() => chrome.runtime.onMessage.addListener(onMessage))
  if (!disposed) {
    window.addEventListener('yt-navigate-start', onStart)
    window.addEventListener('yt-navigate-finish', onFinish)
    window.addEventListener('popstate', onFinish)
    window.addEventListener('pagehide', onStart)
    window.addEventListener('pageshow', onFinish)
  }
  return cleanup
}
