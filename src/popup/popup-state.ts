import {inspectActiveVideo, loadActiveTranscript, subscribeToVideoNavigation} from '../infrastructure/browser/video-inspection.ts'
import {createPopupStore} from './popup-store.ts'
import {createSettingsStore} from './settings-store.ts'
import {browserSettings} from '../infrastructure/browser/settings.ts'
import {downloadTranscript} from '../infrastructure/browser/downloads.ts'
import {copyTranscript} from '../infrastructure/browser/clipboard.ts'

export const settingsStore = createSettingsStore(browserSettings)

export const popupStore = createPopupStore({
  inspect: inspectActiveVideo,
  load: loadActiveTranscript,
  browserLanguage: navigator.language,
  getSettings: settingsStore.load,
  download: downloadTranscript,
  copy: copyTranscript,
  subscribeToNavigation: subscribeToVideoNavigation,
})
