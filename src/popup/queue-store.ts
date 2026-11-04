import type {DownloadQueueState, QueueCommand} from '../domain/download-queue.ts'
import {isDownloadQueueState} from '../domain/queue-validation.ts'
import {sendQueueRequest} from '../infrastructure/browser/queue-client.ts'
import {QUEUE_STORAGE_KEY} from '../infrastructure/browser/queue-storage.ts'
import type {QueueRequest} from '../messaging/queue-messages.ts'

type Snapshot = {state: DownloadQueueState; status: 'loading' | 'ready' | 'error'; error: string | null}

export function createQueueStore() {
  let snapshot: Snapshot = {state: {version: 1, batches: [], cooldownUntil: 0}, status: 'loading', error: null}
  const listeners = new Set<() => void>()
  let revision = 0
  const publish = (next: Snapshot) => { snapshot = next; listeners.forEach((listener) => listener()) }

  const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local' || !(QUEUE_STORAGE_KEY in changes)) return
    const state: unknown = changes[QUEUE_STORAGE_KEY]?.newValue
    if (!isDownloadQueueState(state)) return
    revision++
    publish({state, status: 'ready', error: null})
  }

  async function request(message: QueueRequest) {
    const current = revision
    try {
      const response = await sendQueueRequest(message)
      if (current === revision) publish({state: response.state, status: 'ready', error: null})
      return response.batchId
    } catch (error) {
      publish({...snapshot, status: 'error', error: error instanceof Error ? error.message : 'Queue unavailable. Try again.'})
      return undefined
    }
  }

  return {
    getSnapshot: () => snapshot,
    refresh: () => request({type: 'queue.get'}),
    start: (playlistId: string) => request({type: 'queue.start', playlistId, browserLanguage: navigator.language}),
    command: (batchId: string, action: QueueCommand) => request({type: 'queue.command', batchId, action}),
    subscribe(listener: () => void) {
      listeners.add(listener)
      if (listeners.size === 1) {
        chrome.storage.onChanged.addListener(onChanged)
        void request({type: 'queue.get'})
      }
      return () => {
        listeners.delete(listener)
        if (!listeners.size) { chrome.storage.onChanged.removeListener(onChanged); revision++ }
      }
    },
  }
}
