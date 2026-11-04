import {prepareExport} from '../../application/prepare-export.ts'
import {isPageDownloadRequest} from '../../messaging/page-download-messages.ts'
import {getVideoId} from '../youtube/video-context.ts'
import {downloadTranscript} from './downloads.ts'

export function handlePageDownload(message: unknown, sender: chrome.runtime.MessageSender,
  respond: (response: {ok: boolean}) => void) {
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 ||
    !isPageDownloadRequest(message) || getVideoId(sender.url) !== message.transcript.videoId) return
  void Promise.resolve().then(() => downloadTranscript(prepareExport(message.transcript, message.options)))
    .then(() => respond({ok: true}), () => respond({ok: false}))
  return true
}
