import {inspectActivePage, loadActiveTranscript, subscribeToVideoNavigation} from '../infrastructure/browser/video-inspection.ts'
import {createPopupStore} from './popup-store.ts'
import {createSettingsStore} from './settings-store.ts'
import {browserSettings} from '../infrastructure/browser/settings.ts'
import {downloadTranscript} from '../infrastructure/browser/downloads.ts'
import {copyTranscript} from '../infrastructure/browser/clipboard.ts'
import {createQueueStore} from './queue-store.ts'

export const settingsStore = createSettingsStore(browserSettings)
export const queueStore = createQueueStore()

export const popupStore = createPopupStore({
  inspect: inspectActivePage,
  load: loadActiveTranscript,
  browserLanguage: navigator.language,
  getSettings: settingsStore.load,
  download: downloadTranscript,
  copy: copyTranscript,
  subscribeToNavigation: subscribeToVideoNavigation,
})
