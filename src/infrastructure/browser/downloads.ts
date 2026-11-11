import type {TranscriptExport} from '../../application/prepare-export.ts'

export function startDownload(file: TranscriptExport, filename = file.filename, saveAs?: boolean): Promise<number> {
  const isFirefox = chrome.runtime.getURL('').startsWith('moz-extension:')
  const url = isFirefox ? URL.createObjectURL(new Blob([file.text], {type: file.mimeType}))
    : `data:${file.mimeType},${encodeURIComponent(file.text)}`
  return new Promise((resolve, reject) => {
    let downloadId: number | undefined
    const cleanup = () => {
      chrome.downloads.onChanged.removeListener(onChanged)
      URL.revokeObjectURL(url)
    }
    const onChanged = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id === downloadId && delta.state?.current && delta.state.current !== 'in_progress') cleanup()
    }
    if (isFirefox) chrome.downloads.onChanged.addListener(onChanged)
    const fail = (message: string) => {
      if (isFirefox) cleanup()
      reject(new Error(message))
    }
    try {
      chrome.downloads.download({url, filename, ...(saveAs === undefined ? {} : {saveAs}), conflictAction: 'uniquify'}, (id) => {
        const error = chrome.runtime.lastError
        if (error || id === undefined) { fail(error?.message ?? 'Download was not accepted.'); return }
        downloadId = id
        if (isFirefox) chrome.downloads.search({id}, (items) => {
          if (!chrome.runtime.lastError && items?.[0]?.state && items[0].state !== 'in_progress') cleanup()
        })
        resolve(id)
      })
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Download was not accepted.')
    }
  })
}

export async function downloadTranscript(file: TranscriptExport): Promise<void> {
  await startDownload(file)
}

export function handlePopupDownload(message: {type?: string; file?: TranscriptExport}, sender: chrome.runtime.MessageSender,
  respond: (response: {ok: boolean; error?: string}) => void) {
  if (sender.id !== chrome.runtime.id || sender.tab || !sender.url?.startsWith(chrome.runtime.getURL('')) ||
    message?.type !== 'popup.download' || typeof message.file?.text !== 'string' ||
    typeof message.file?.filename !== 'string' || typeof message.file?.mimeType !== 'string') return
  void downloadTranscript(message.file).then(() => respond({ok: true}), (error: unknown) =>
    respond({ok: false, error: error instanceof Error ? error.message : 'Download was not accepted.'}))
  return true
}
