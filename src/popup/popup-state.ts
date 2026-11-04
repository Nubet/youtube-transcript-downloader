import {inspectActiveVideo, loadActiveTranscript, subscribeToVideoNavigation} from '../infrastructure/browser/video-inspection.ts'
import {createPopupStore} from './popup-store.ts'

export const popupStore = createPopupStore({
  inspect: inspectActiveVideo,
  load: loadActiveTranscript,
  browserLanguage: navigator.language,
  subscribeToNavigation: subscribeToVideoNavigation,
})
