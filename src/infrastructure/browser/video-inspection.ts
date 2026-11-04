import {VideoInspectionError, type VideoInspection} from '../../domain/video.ts'
import type {Transcript} from '../../domain/transcript.ts'
import {
  isVideoInspectResponse,
  isVideoNavigationMessage,
  isTranscriptLoadResponse,
  type VideoInspectRequest,
  type TranscriptLoadRequest,
  type TranscriptCancelRequest,
} from '../../messaging/transcript-messages.ts'
import {getVideoId} from '../youtube/video-context.ts'
import {getPlaylistId, type Playlist} from '../../domain/playlist.ts'

let activeTabId: number | null = null
let inspectionRevision = 0
let activeInspection: VideoInspection | null = null

export async function inspectActivePage(refresh = false): Promise<VideoInspection | {playlist: Pick<Playlist, 'id' | 'title'>} | null> {
  const revision = ++inspectionRevision
  activeInspection = null
  const tab = await getActiveTab()
  if (revision !== inspectionRevision) throw new VideoInspectionError('video-changed')
  activeTabId = tab?.id ?? null
  const videoId = getVideoId(tab?.url)
  const playlistId = getPlaylistId(tab?.url ?? '')
  if (!videoId && playlistId) {
    return {playlist: {id: playlistId, title: tab?.title?.replace(/\s*-\s*YouTube$/u, '') || 'YouTube playlist'}}
  }
  if (!videoId || tab?.id === undefined) return null
  const request = {type: 'video.inspect', requestId: crypto.randomUUID(), videoId, refresh} satisfies VideoInspectRequest
  let response: unknown
  try {
    response = await sendMessage(tab.id, request)
  } catch (error) {
    if (error instanceof VideoInspectionError) throw error
    if (!(error instanceof Error) ||
      !/Receiving end does not exist|Could not establish connection/iu.test(error.message)) {
      throw new VideoInspectionError('connection')
    }
    await injectContentScript(tab.id)
    response = await sendMessage(tab.id, request)
  }

  if (!isVideoInspectResponse(response) || response.requestId !== request.requestId || response.videoId !== videoId) {
    throw new VideoInspectionError('connection')
  }
  if (response.result.status === 'error') throw new VideoInspectionError(response.result.code)
  const currentTab = await getActiveTab()
  if (revision !== inspectionRevision || currentTab?.id !== tab.id || getVideoId(currentTab.url) !== videoId) {
    throw new VideoInspectionError('video-changed')
  }
  activeInspection = response.result.inspection
  return activeInspection
}

export async function loadActiveTranscript(videoId: string, trackId: string | null, signal: AbortSignal): Promise<Transcript> {
  const tabId = activeTabId
  const inspection = activeInspection
  const track = inspection?.video.videoId === videoId ? inspection.tracks.find((item) => item.id === trackId) : null
  if (tabId === null || inspection?.video.videoId !== videoId || (trackId !== null && !track)) {
    throw new VideoInspectionError('track-unavailable')
  }
  const revision = inspectionRevision
  const tab = await getActiveTab()
  if (signal.aborted) throw new VideoInspectionError('cancelled')
  if (revision !== inspectionRevision || tab?.id !== tabId || getVideoId(tab.url) !== videoId) {
    throw new VideoInspectionError('video-changed')
  }
  const request = {type: 'transcript.load', requestId: crypto.randomUUID(), videoId, trackId} satisfies TranscriptLoadRequest
  const response = await sendMessage(tabId, request, signal)
  if (signal.aborted) throw new VideoInspectionError('cancelled')
  if (!isTranscriptLoadResponse(response) || response.requestId !== request.requestId ||
    response.videoId !== videoId || response.trackId !== trackId) throw new VideoInspectionError('connection')
  if (response.result.status === 'error') throw new VideoInspectionError(response.result.code)
  const currentTab = await getActiveTab()
  if (signal.aborted) throw new VideoInspectionError('cancelled')
  if (revision !== inspectionRevision || activeInspection !== inspection ||
    currentTab?.id !== tabId || getVideoId(currentTab.url) !== videoId) throw new VideoInspectionError('video-changed')
  if (track && response.result.transcript.languageCode !== track.languageCode) throw new VideoInspectionError('invalid-transcript')
  return response.result.transcript
}

export function subscribeToVideoNavigation(onStart: () => void, onFinish: () => void) {
  const onMessage = (message: unknown, sender: chrome.runtime.MessageSender) => {
    if (sender.id !== chrome.runtime.id || sender.tab?.id !== activeTabId ||
      sender.frameId !== 0 || !isVideoNavigationMessage(message)) return
    if (message.phase === 'started') onStart()
    else onFinish()
  }
  const onUpdated = (tabId: number, change: chrome.tabs.TabChangeInfo) => {
    if (tabId !== activeTabId) return
    if (change.status === 'loading') onStart()
    else if (change.url || change.status === 'complete') onFinish()
  }
  const onActivated = () => onFinish()
  chrome.runtime.onMessage.addListener(onMessage)
  chrome.tabs.onUpdated.addListener(onUpdated)
  chrome.tabs.onActivated.addListener(onActivated)
  return () => {
    chrome.runtime.onMessage.removeListener(onMessage)
    chrome.tabs.onUpdated.removeListener(onUpdated)
    chrome.tabs.onActivated.removeListener(onActivated)
  }
}

function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const error = chrome.runtime.lastError
      if (error) reject(new VideoInspectionError('connection'))
      else resolve(tabs[0])
    })
  })
}

function sendMessage(
  tabId: number,
  request: VideoInspectRequest | TranscriptLoadRequest,
  signal?: AbortSignal
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      if (request.type === 'transcript.load') {
        chrome.tabs.sendMessage(tabId, {
          type: 'transcript.cancel', requestId: request.requestId, videoId: request.videoId,
        } satisfies TranscriptCancelRequest, {frameId: 0}, () => void chrome.runtime.lastError)
      }
    }
    const abort = () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      cancel()
      reject(new VideoInspectionError('cancelled'))
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      cancel()
      reject(new VideoInspectionError('timeout'))
    }, request.type === 'transcript.load' ? 65_000 : 20_000)
    if (signal?.aborted) { abort(); return }
    signal?.addEventListener('abort', abort, {once: true})
    chrome.tabs.sendMessage(tabId, request, {frameId: 0}, (response: unknown) => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      const error = chrome.runtime.lastError
      if (error) reject(new Error(error.message))
      else resolve(response)
    })
  })
}

export function injectContentScript(tabId: number): Promise<void> {
  // Use bundled manifest paths: Extension.js rewrites TypeScript entry points.
  const files = chrome.runtime.getManifest().content_scripts
    ?.filter((script) => script.matches?.includes('https://www.youtube.com/*'))
    .flatMap((script) => script.js ?? []) ?? []
  if (files.length === 0) return Promise.reject(new VideoInspectionError('connection'))
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript({target: {tabId}, files}, () => {
      const error = chrome.runtime.lastError
      if (error) reject(new VideoInspectionError('connection'))
      else resolve()
    })
  })
}
