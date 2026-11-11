import {prepareExport} from '../../application/prepare-export.ts'
import {isPageDownloadRequest} from '../../messaging/page-download-messages.ts'
import {getVideoId} from '../youtube/video-context.ts'
import {downloadTranscript} from './downloads.ts'

export function handlePageDownload(message: unknown, sender: chrome.runtime.MessageSender,
  respond: (response: {ok: boolean; error?: string}) => void) {
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 ||
    !sender.url?.startsWith('https://www.youtube.com/') || !isPageDownloadRequest(message)) return
  void Promise.resolve().then(async () => {
    // Check the live tab after YouTube's SPA navigation, rather than the original document URL.
    const url = sender.tab?.id === undefined ? sender.url : await new Promise<string | undefined>((resolve, reject) => {
      chrome.tabs.get(sender.tab!.id!, (tab) => {
        const error = chrome.runtime.lastError
        if (error) reject(new Error(error.message))
        else resolve(tab?.url)
      })
    })
    if (getVideoId(url) !== message.transcript.videoId) throw new Error('The video changed. Reload its transcript and try again.')
    await downloadTranscript(prepareExport(message.transcript, message.options))
  }).then(() => respond({ok: true}), (error: unknown) => respond({ok: false,
    error: error instanceof Error ? error.message : 'Download was not accepted.'}))
  return true
}
