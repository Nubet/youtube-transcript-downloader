import {VideoInspectionError, type VideoErrorCode, type VideoInspection} from '../domain/video.ts'
import type {Transcript} from '../domain/transcript.ts'
import type {TranscriptSource} from '../application/transcript-source.ts'
import {selectTrack} from '../domain/select-track.ts'

export type TranscriptSelection =
  | {status: 'none'}
  | {status: 'loading'; trackId: string}
  | {status: 'ready'; trackId: string; transcript: Transcript}
  | {status: 'error'; trackId: string; code: VideoErrorCode}

export type PopupState =
  | {status: 'loading'}
  | {status: 'unsupported'}
  | {status: 'ready'; inspection: VideoInspection; selection: TranscriptSelection}
  | {status: 'error'; code: VideoErrorCode}

type PopupDependencies = {
  inspect: (refresh: boolean) => Promise<VideoInspection | null>
  load: TranscriptSource
  browserLanguage: string
  subscribeToNavigation: (onStart: () => void, onFinish: () => void) => () => void
}

export function createPopupStore(dependencies: PopupDependencies) {
  let snapshot: PopupState = {status: 'loading'}
  let revision = 0
  let stop: (() => void) | null = null
  let operation: AbortController | null = null
  const listeners = new Set<() => void>()

  function publish(state: PopupState) {
    snapshot = state
    listeners.forEach((listener) => listener())
  }

  function navigationStarted() {
    revision++
    operation?.abort()
    publish({status: 'loading'})
  }

  async function reload(refresh = true) {
    const currentRevision = ++revision
    operation?.abort()
    publish({status: 'loading'})
    try {
      const inspection = await dependencies.inspect(refresh)
      if (currentRevision !== revision) return
      if (!inspection) { publish({status: 'unsupported'}); return }
      publish({status: 'ready', inspection, selection: {status: 'none'}})
      const track = selectTrack(inspection.tracks, dependencies.browserLanguage)
      if (track) await selectLanguage(track.id)
    } catch (error) {
      if (currentRevision !== revision) return
      publish({status: 'error', code: error instanceof VideoInspectionError ? error.code : 'connection'})
    }
  }

  async function selectLanguage(trackId: string) {
    if (snapshot.status !== 'ready') return
    const inspection = snapshot.inspection
    const track = inspection.tracks.find((item) => item.id === trackId)
    if (!track) return
    const currentRevision = ++revision
    operation?.abort()
    const controller = new AbortController()
    operation = controller
    publish({status: 'ready', inspection, selection: {status: 'loading', trackId}})
    try {
      const transcript = await dependencies.load(inspection.video.videoId, trackId, controller.signal)
      if (currentRevision !== revision || controller.signal.aborted) return
      if (transcript.videoId !== inspection.video.videoId || transcript.trackId !== trackId ||
        transcript.languageCode !== track.languageCode) throw new VideoInspectionError('invalid-transcript')
      publish({status: 'ready', inspection, selection: {status: 'ready', trackId, transcript}})
    } catch (error) {
      if (currentRevision !== revision || controller.signal.aborted) return
      publish({status: 'ready', inspection, selection: {status: 'error', trackId,
        code: error instanceof VideoInspectionError ? error.code : 'connection'}})
    } finally {
      if (operation === controller) operation = null
    }
  }

  return {
    getSnapshot: () => snapshot,
    reload,
    selectLanguage,
    subscribe(listener: () => void) {
      listeners.add(listener)
      if (listeners.size === 1) {
        stop = dependencies.subscribeToNavigation(navigationStarted, () => void reload(false))
        void reload(false)
      }
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          stop?.()
          stop = null
          revision++
          operation?.abort()
        }
      }
    },
  }
}
