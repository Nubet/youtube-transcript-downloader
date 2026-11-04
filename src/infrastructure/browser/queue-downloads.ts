import type {TranscriptExport} from '../../application/prepare-export.ts'
import type {DownloadRecord} from '../../application/download-queue.ts'
import type {DownloadJob} from '../../domain/download-queue.ts'

export const queueDownloads = {
  start: (file: TranscriptExport, filename: string): Promise<number> => new Promise((resolve, reject) => {
    const url = `data:${file.mimeType},${encodeURIComponent(file.text)}`
    chrome.downloads.download({url, filename, saveAs: false, conflictAction: 'uniquify'}, (id) => {
      const error = chrome.runtime.lastError
      if (error || id === undefined) reject(new Error(error?.message ?? 'Download was rejected'))
      else resolve(id)
    })
  }),
  lookup: (job: DownloadJob): Promise<DownloadRecord | null> => new Promise((resolve, reject) => {
    if (job.downloadId === null && !job.filename) { resolve(null); return }
    const filenameRegex = job.filename?.split('/').map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('[/\\\\]')
    const query = job.downloadId !== null ? {id: job.downloadId} : {filenameRegex: `${filenameRegex}$`}
    chrome.downloads.search(query, (items) => {
      const error = chrome.runtime.lastError
      if (error) { reject(new Error(error.message)); return }
      const item = items.length === 1 ? items[0] : undefined
      resolve(item ? {id: item.id, state: item.state} : null)
    })
  }),
  cancel: (id: number): Promise<void> => new Promise((resolve) => {
    chrome.downloads.cancel(id, () => { void chrome.runtime.lastError; resolve() })
  }),
}
