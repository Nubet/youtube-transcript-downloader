import {createDownloadQueue} from '../application/download-queue.ts'
import {queueStorage} from '../infrastructure/browser/queue-storage.ts'
import {queueDownloads} from '../infrastructure/browser/queue-downloads.ts'
import {browserSettings} from '../infrastructure/browser/settings.ts'
import {loadPlaylist} from '../infrastructure/youtube/playlist-source.ts'
import {loadPlaylistTranscript} from '../infrastructure/youtube/playlist-transcript.ts'
import {getPlaylistId} from '../domain/playlist.ts'
import {isQueueRequest, type QueueResponse} from '../messaging/queue-messages.ts'

const ALARM = 'transcript-download-queue'

export function registerDownloadQueue() {
  const queue = createDownloadQueue({load: queueStorage.load, save: queueStorage.save,
    playlist: loadPlaylist, transcript: loadPlaylistTranscript,
    download: queueDownloads.start, lookup: queueDownloads.lookup, cancelDownload: queueDownloads.cancel, now: Date.now})
    .then(async (instance) => { await instance.recover(); return instance })
  // Alarms recover progress when MV3 suspends the worker between jobs.
  chrome.alarms.create(ALARM, {periodInMinutes: 0.5})
  const wake = () => { void queue.then((instance) => instance.wake()).catch((error: unknown) => console.error('Transcript queue:', error)) }
  chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) wake() })
  chrome.downloads.onChanged.addListener((event) => { if (event.state) wake() })
  chrome.runtime.onStartup.addListener(() => {
    void queue.then((instance) => instance.recover(true)).catch((error: unknown) => console.error('Transcript queue:', error))
  })
  // Attach immediately so a failed storage read never becomes an unhandled rejection.
  void queue.catch((error: unknown) => console.error('Transcript queue:', error))
  chrome.runtime.onMessage.addListener((message: unknown, sender, respond: (response: QueueResponse) => void) => {
    if (sender.id !== chrome.runtime.id || !isQueueRequest(message)) return
    const extensionPage = !sender.tab && sender.url?.startsWith(chrome.runtime.getURL(''))
    const youtubePage = sender.tab && sender.frameId === 0 && sender.url?.startsWith('https://www.youtube.com/')
    if (!extensionPage && !youtubePage) return
    if (message.type === 'queue.start' && (!youtubePage || getPlaylistId(sender.url!) !== message.playlistId)) return
    void queue.then(async (instance): Promise<QueueResponse> => {
      let batchId: string | undefined
      if (message.type === 'queue.start') {
        const settings = await browserSettings.read()
        batchId = await instance.enqueue(message.playlistId, {format: settings.format,
          includeTimestamps: settings.includeTimestamps, includeTitle: settings.includeTitle, includeLink: settings.includeLink,
          preferredLanguage: settings.preferredLanguage, browserLanguage: message.browserLanguage})
      } else if (message.type === 'queue.command') await instance.command(message.batchId, message.action)
      if (message.type !== 'queue.get') wake()
      return batchId ? {ok: true, state: instance.getSnapshot(), batchId} : {ok: true, state: instance.getSnapshot()}
    }).then(respond, () => respond({ok: false, error: 'Queue unavailable. Reload the extension and try again.'}))
    return true
  })
}
