import type {DownloadQueueState} from '../../domain/download-queue.ts'
import {isDownloadQueueState} from '../../domain/queue-validation.ts'

export const QUEUE_STORAGE_KEY = 'transcriptDownloadQueue'

export const queueStorage = {
  load: (): Promise<DownloadQueueState> => new Promise((resolve, reject) => {
    chrome.storage.local.get(QUEUE_STORAGE_KEY, (values) => {
      try {
        const error = chrome.runtime.lastError
        if (error) throw new Error(error.message)
        const state: unknown = values[QUEUE_STORAGE_KEY]
        if (state === undefined) resolve({version: 1, batches: [], cooldownUntil: 0})
        else if (isDownloadQueueState(state)) resolve(state)
        else throw new Error('Saved queue could not be read. Reload the extension and try again.')
      } catch (error) { reject(error) }
    })
  }),
  save: (state: DownloadQueueState): Promise<void> => new Promise((resolve, reject) => {
    chrome.storage.local.set({[QUEUE_STORAGE_KEY]: state}, () => {
      const error = chrome.runtime.lastError
      if (error) reject(new Error(error.message))
      else resolve()
    })
  }),
}
