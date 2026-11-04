import {inspectActiveVideo, subscribeToVideoNavigation} from '../infrastructure/browser/video-inspection.ts'
import {createPopupStore} from './popup-store.ts'

export const popupStore = createPopupStore({
  inspect: inspectActiveVideo,
  subscribeToNavigation: subscribeToVideoNavigation,
})
