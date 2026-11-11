import {handlePageDownload} from '../infrastructure/browser/page-download-handler.ts'
import {registerDownloadQueue} from './download-queue.ts'
import {handlePopupDownload} from '../infrastructure/browser/downloads.ts'

chrome.runtime.onMessage.addListener(handlePageDownload)
chrome.runtime.onMessage.addListener(handlePopupDownload)
registerDownloadQueue()
