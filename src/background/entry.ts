import {handlePageDownload} from '../infrastructure/browser/page-download-handler.ts'
import {registerDownloadQueue} from './download-queue.ts'

chrome.runtime.onMessage.addListener(handlePageDownload)
registerDownloadQueue()
