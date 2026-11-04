import {VideoInspectionError, type VideoErrorCode, type VideoInspection} from '../domain/video.ts'

export type PopupState =
  | {status: 'loading'}
  | {status: 'unsupported'}
  | {status: 'ready'; inspection: VideoInspection}
  | {status: 'error'; code: VideoErrorCode}

type PopupDependencies = {
  inspect: () => Promise<VideoInspection | null>
  subscribeToNavigation: (onStart: () => void, onFinish: () => void) => () => void
}

export function createPopupStore(dependencies: PopupDependencies) {
  let snapshot: PopupState = {status: 'loading'}
  let revision = 0
  let stop: (() => void) | null = null
  const listeners = new Set<() => void>()

  function publish(state: PopupState) {
    snapshot = state
    listeners.forEach((listener) => listener())
  }

  function navigationStarted() {
    revision++
    publish({status: 'loading'})
  }

  async function reload() {
    const currentRevision = ++revision
    publish({status: 'loading'})
    try {
      const inspection = await dependencies.inspect()
      if (currentRevision !== revision) return
      publish(inspection ? {status: 'ready', inspection} : {status: 'unsupported'})
    } catch (error) {
      if (currentRevision !== revision) return
      publish({status: 'error', code: error instanceof VideoInspectionError ? error.code : 'connection'})
    }
  }

  return {
    getSnapshot: () => snapshot,
    reload,
    subscribe(listener: () => void) {
      listeners.add(listener)
      if (listeners.size === 1) {
        stop = dependencies.subscribeToNavigation(navigationStarted, () => void reload())
        void reload()
      }
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          stop?.()
          stop = null
          revision++
        }
      }
    },
  }
}
