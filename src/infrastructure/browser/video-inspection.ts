import {VideoInspectionError, type VideoInspection} from '../../domain/video.ts'
import {
  isVideoInspectResponse,
  isVideoNavigationMessage,
  type VideoInspectRequest,
} from '../../messaging/transcript-messages.ts'
import {getVideoId} from '../youtube/video-context.ts'

let activeTabId: number | null = null
let inspectionRevision = 0

export async function inspectActiveVideo(): Promise<VideoInspection | null> {
  const revision = ++inspectionRevision
  const tab = await getActiveTab()
  if (revision !== inspectionRevision) throw new VideoInspectionError('video-changed')
  activeTabId = tab?.id ?? null
  const videoId = getVideoId(tab?.url)
  if (!videoId || tab?.id === undefined) return null
  const request = {type: 'video.inspect', requestId: crypto.randomUUID(), videoId} satisfies VideoInspectRequest
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
  return response.result.inspection
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

function sendMessage(tabId: number, request: VideoInspectRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new VideoInspectionError('timeout')), 20_000)
    chrome.tabs.sendMessage(tabId, request, {frameId: 0}, (response: unknown) => {
      clearTimeout(timeout)
      const error = chrome.runtime.lastError
      if (error) reject(new Error(error.message))
      else resolve(response)
    })
  })
}

function injectContentScript(tabId: number): Promise<void> {
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
