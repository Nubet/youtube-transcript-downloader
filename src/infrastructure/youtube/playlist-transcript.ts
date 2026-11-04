import type {BatchSettings} from '../../domain/download-queue.ts'
import {selectTrack} from '../../domain/select-track.ts'
import {VideoInspectionError} from '../../domain/video.ts'
import {createYouTubeSource} from './video-source.ts'

export async function loadPlaylistTranscript(videoId: string, settings: BatchSettings, signal: AbortSignal) {
  const source = createYouTubeSource()
  const inspection = await source.inspect(videoId, signal)
  const track = selectTrack(inspection.tracks, settings.browserLanguage, settings.preferredLanguage)
  if (!track) throw new VideoInspectionError('track-unavailable')
  return source.load(videoId, track.id, signal)
}
