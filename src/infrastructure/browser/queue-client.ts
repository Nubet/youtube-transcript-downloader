import type {QueueRequest, QueueResponse} from '../../messaging/queue-messages.ts'
import {isDownloadQueueState} from '../../domain/queue-validation.ts'
import {isRecord} from '../../shared/is-record.ts'

export function sendQueueRequest(message: QueueRequest): Promise<QueueResponse & {ok: true}> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: unknown) => {
      try {
        const error = chrome.runtime.lastError
        if (error) throw new Error(error.message)
        if (!isRecord(response) || response.ok !== true || !isDownloadQueueState(response.state)) {
          throw new Error(isRecord(response) && typeof response.error === 'string' ? response.error : 'Queue unavailable. Try again.')
        }
        resolve({ok: true, state: response.state, ...(typeof response.batchId === 'string' ? {batchId: response.batchId} : {})})
      } catch (error) { reject(error) }
    })
  })
}
