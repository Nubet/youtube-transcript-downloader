import {VideoInspectionError} from '../domain/video.ts'
import {getVideoId} from '../infrastructure/youtube/video-context.ts'
import {inspectYouTubeVideo} from '../infrastructure/youtube/video-source.ts'
import {
  isVideoInspectRequest,
  type VideoInspectResponse,
  type VideoNavigationMessage,
} from '../messaging/transcript-messages.ts'
import {createVideoSession} from './video-session.ts'

declare global {
  interface Window {
    __youtubeTranscriptCleanup?: () => void
  }
}

export default function initial() {
  window.__youtubeTranscriptCleanup?.()
  const session = createVideoSession(() => getVideoId(location.href), inspectYouTubeVideo)

  const onMessage = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: VideoInspectResponse) => void
  ) => {
    if (sender.id !== chrome.runtime.id || !isVideoInspectRequest(message)) return
    const respond = (result: VideoInspectResponse['result']) => sendResponse({
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
    chrome.runtime.sendMessage({type: 'video.navigation', phase} satisfies VideoNavigationMessage,
      () => void chrome.runtime.lastError)
  }
  const onStart = () => {
    session.navigationStarted()
    notify('started')
  }
  const onFinish = () => {
    session.navigationFinished()
    notify('finished')
  }

  chrome.runtime.onMessage.addListener(onMessage)
  window.addEventListener('yt-navigate-start', onStart)
  window.addEventListener('yt-navigate-finish', onFinish)
  window.addEventListener('popstate', onFinish)
  window.addEventListener('pagehide', onStart)
  window.addEventListener('pageshow', onFinish)

  const cleanup = () => {
    session.dispose()
    chrome.runtime.onMessage.removeListener(onMessage)
    window.removeEventListener('yt-navigate-start', onStart)
    window.removeEventListener('yt-navigate-finish', onFinish)
    window.removeEventListener('popstate', onFinish)
    window.removeEventListener('pagehide', onStart)
    window.removeEventListener('pageshow', onFinish)
    if (window.__youtubeTranscriptCleanup === cleanup) delete window.__youtubeTranscriptCleanup
  }
  window.__youtubeTranscriptCleanup = cleanup
  return cleanup
}
