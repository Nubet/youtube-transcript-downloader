import type {ExportOptions} from '../../application/prepare-export.ts'
import type {Transcript} from '../../domain/transcript.ts'
import type {PageDownloadRequest} from '../../messaging/page-download-messages.ts'
import {isRecord} from '../../shared/is-record.ts'

export function downloadFromPage(transcript: Transcript, options: ExportOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({type: 'transcript.download', transcript, options} satisfies PageDownloadRequest,
      (response: unknown) => {
        try {
          const error = chrome.runtime.lastError
          if (error || !isRecord(response) || response.ok !== true) {
            reject(new Error(error?.message ?? 'Download was not accepted.'))
          } else resolve()
        } catch (error) { reject(error) }
      })
  })
}
