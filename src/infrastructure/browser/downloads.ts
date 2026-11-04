import type {TranscriptExport} from '../../application/prepare-export.ts'

export function downloadTranscript(file: TranscriptExport): Promise<void> {
  // A data URL belongs to the download, unlike an object URL owned by the closing popup.
  const url = `data:${file.mimeType},${encodeURIComponent(file.text)}`
  return new Promise((resolve, reject) => {
    chrome.downloads.download({url, filename: file.filename, conflictAction: 'uniquify'}, (downloadId) => {
      const error = chrome.runtime.lastError
      if (error || downloadId === undefined) reject(new Error(error?.message ?? 'Download was not accepted.'))
      else resolve()
    })
  })
}
