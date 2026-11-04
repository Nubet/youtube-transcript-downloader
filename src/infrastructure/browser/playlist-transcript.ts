import type {BatchSettings} from '../../domain/download-queue.ts'
import type {Transcript} from '../../domain/transcript.ts'
import {VideoInspectionError} from '../../domain/video.ts'
import {loadPlaylistTranscript} from '../youtube/playlist-transcript.ts'
import {isTranscriptLoadResponse} from '../../messaging/transcript-messages.ts'
import type {PlaylistTranscriptRequest} from '../../messaging/playlist-transcript-messages.ts'
import {injectContentScript} from './video-inspection.ts'

export async function loadQueuedTranscript(videoId: string, settings: BatchSettings, signal: AbortSignal) {
  try { return await loadPlaylistTranscript(videoId, settings, signal) }
  catch (error) {
    if (signal.aborted || !(error instanceof VideoInspectionError) ||
      !['empty-transcript', 'invalid-transcript'].includes(error.code)) throw error
    const tabs = (await chrome.tabs.query({url: 'https://www.youtube.com/*'})).filter((tab) => tab.id !== undefined && !tab.discarded)
    const tabId = (tabs.find((tab) => tab.active) ?? tabs[0])?.id
    // shortcut: origin recovery needs an open YouTube tab; use a dedicated worker tab if tab-free recovery is needed.
    if (tabId === undefined) throw new VideoInspectionError('connection')
    // YouTube's mobile caption endpoint can reject an extension origin; retry from its own page.
    return loadFromPage(tabId, videoId, settings, signal)
  }
}

function loadFromPage(tabId: number, videoId: string, settings: BatchSettings, signal: AbortSignal) {
  const request: PlaylistTranscriptRequest = {type: 'playlist.transcript', requestId: crypto.randomUUID(), videoId,
    settings: {browserLanguage: settings.browserLanguage, preferredLanguage: settings.preferredLanguage}}
  return new Promise<Transcript>((resolve, reject) => {
    let injected = false
    let settled = false
    const cancel = () => chrome.tabs.sendMessage(tabId, {type: 'playlist.transcript.cancel',
      requestId: request.requestId, videoId}, {frameId: 0}, () => void chrome.runtime.lastError)
    const finish = () => { settled = true; clearTimeout(timeout); signal.removeEventListener('abort', abort) }
    const abort = () => { finish(); cancel(); reject(new VideoInspectionError('cancelled')) }
    const timeout = setTimeout(() => { finish(); cancel(); reject(new VideoInspectionError('timeout')) }, 65_000)
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort', abort, {once: true})
    function send() {
      if (settled) return
      chrome.tabs.sendMessage(tabId, request, {frameId: 0}, (response: unknown) => {
        const error = chrome.runtime.lastError
        if (settled) return
        if (!injected && error?.message && /Receiving end does not exist|Could not establish connection/iu.test(error.message)) {
          injected = true
          void injectContentScript(tabId).then(send).catch((error: unknown) => { finish(); reject(error) })
          return
        }
        finish()
        if (signal.aborted) { reject(new VideoInspectionError('cancelled')); return }
        if (error || !isTranscriptLoadResponse(response) ||
          response.requestId !== request.requestId || response.videoId !== videoId) {
          reject(new VideoInspectionError('connection')); return
        }
        if (response.result.status === 'error') reject(new VideoInspectionError(response.result.code, response.result.httpStatus))
        else resolve(response.result.transcript)
      })
    }
    send()
  })
}
