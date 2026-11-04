import {handlePageDownload} from '../infrastructure/browser/page-download-handler.ts'

chrome.runtime.onMessage.addListener(handlePageDownload)
