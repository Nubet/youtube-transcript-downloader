import {VideoInspectionError, type VideoErrorCode, type VideoInspection} from '../domain/video.ts'
import type {Transcript} from '../domain/transcript.ts'
import type {TranscriptSource} from '../application/transcript-source.ts'
import {selectTrack} from '../domain/select-track.ts'
import type {ExtensionSettings} from '../domain/settings/extension-settings.ts'
import {prepareExport, type ExportOptions, type TranscriptExport} from '../application/prepare-export.ts'
import type {Playlist} from '../domain/playlist.ts'

export type ExportAction = 'download' | 'copy'
export type ExportState =
  | {status: 'idle'}
  | {status: 'working' | 'success' | 'error'; action: ExportAction; file: TranscriptExport}

export type TranscriptSelection =
  | {status: 'none'}
  | {status: 'loading'; trackId: string | null}
  | {status: 'ready'; trackId: string | null; transcript: Transcript; exportState: ExportState}
  | {status: 'error'; trackId: string | null; code: VideoErrorCode}

export type PopupState =
  | {status: 'loading'}
  | {status: 'unsupported'}
  | {status: 'playlist'; playlist: Pick<Playlist, 'id' | 'title'>}
  | {status: 'ready'; inspection: VideoInspection; selection: TranscriptSelection}
  | {status: 'error'; code: VideoErrorCode}

type PopupDependencies = {
  inspect: (refresh: boolean) => Promise<VideoInspection | {playlist: Pick<Playlist, 'id' | 'title'>} | null>
  load: TranscriptSource
  browserLanguage: string
  getSettings: () => Promise<ExtensionSettings>
  download: (file: TranscriptExport) => Promise<void>
  copy: (text: string) => Promise<void>
  subscribeToNavigation: (onStart: () => void, onFinish: () => void) => () => void
}

export function createPopupStore(dependencies: PopupDependencies) {
  let snapshot: PopupState = {status: 'loading'}
  let revision = 0
  let stop: (() => void) | null = null
  let operation: AbortController | null = null
  const listeners = new Set<() => void>()
  let prepared: {transcript: Transcript; key: string; file: TranscriptExport} | null = null

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
      const [inspection, settings] = await Promise.all([dependencies.inspect(refresh), dependencies.getSettings()])
      if (currentRevision !== revision) return
      if (!inspection) { publish({status: 'unsupported'}); return }
      if ('playlist' in inspection) { publish({status: 'playlist', playlist: inspection.playlist}); return }
      publish({status: 'ready', inspection, selection: {status: 'none'}})
      const track = selectTrack(inspection.tracks, dependencies.browserLanguage, settings.preferredLanguage)
      if (track) await selectLanguage(track.id)
    } catch (error) {
      if (currentRevision !== revision) return
      publish({status: 'error', code: error instanceof VideoInspectionError ? error.code : 'connection'})
    }
  }

  async function selectLanguage(trackId: string | null) {
    if (snapshot.status !== 'ready') return
    const inspection = snapshot.inspection
    const track = inspection.tracks.find((item) => item.id === trackId)
    if (trackId !== null && !track) return
    const currentRevision = ++revision
    operation?.abort()
    const controller = new AbortController()
    operation = controller
    publish({status: 'ready', inspection, selection: {status: 'loading', trackId}})
    try {
      const transcript = await dependencies.load(inspection.video.videoId, trackId, controller.signal)
      if (currentRevision !== revision || controller.signal.aborted) return
      if (transcript.videoId !== inspection.video.videoId || transcript.trackId !== trackId ||
        (track && transcript.languageCode !== track.languageCode)) throw new VideoInspectionError('invalid-transcript')
      publish({status: 'ready', inspection, selection: {status: 'ready', trackId, transcript, exportState: {status: 'idle'}}})
    } catch (error) {
      if (currentRevision !== revision || controller.signal.aborted) return
      publish({status: 'ready', inspection, selection: {status: 'error', trackId,
        code: error instanceof VideoInspectionError ? error.code : 'connection'}})
    } finally {
      if (operation === controller) operation = null
    }
  }

  function cancelTranscript() {
    if (snapshot.status !== 'ready' || snapshot.selection.status !== 'loading') return
    revision++
    operation?.abort()
    publish({...snapshot, selection: {status: 'error', trackId: snapshot.selection.trackId, code: 'cancelled'}})
  }

  function getExport(options: ExportOptions): TranscriptExport | null {
    if (snapshot.status !== 'ready' || snapshot.selection.status !== 'ready') return null
    const transcript = snapshot.selection.transcript
    const key = options.format === 'txt'
      ? `txt:${options.includeTimestamps}:${options.includeTitle}:${options.includeLink}` : options.format
    if (prepared?.transcript !== transcript || prepared.key !== key) {
      prepared = {transcript, key, file: prepareExport(transcript, options)}
    }
    return prepared.file
  }

  async function exportTranscript(action: ExportAction, file: TranscriptExport) {
    if (snapshot.status !== 'ready' || snapshot.selection.status !== 'ready' ||
      snapshot.selection.exportState.status === 'working' || prepared?.file !== file ||
      prepared.transcript !== snapshot.selection.transcript) return
    const {inspection, selection} = snapshot
    const currentRevision = revision
    const publishExport = (status: 'working' | 'success' | 'error') => {
      publish({status: 'ready', inspection, selection: {...selection, exportState: {status, action, file}}})
    }
    publishExport('working')
    try {
      // Keep clipboard access in the click's activation stack, before any await.
      const operation = action === 'copy' ? dependencies.copy(file.text) : dependencies.download(file)
      await operation
      if (currentRevision === revision) publishExport('success')
    } catch {
      if (currentRevision === revision) publishExport('error')
    }
  }

  return {
    getSnapshot: () => snapshot,
    reload,
    selectLanguage,
    cancelTranscript,
    getExport,
    exportTranscript,
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
