import type {VideoSource} from '../../application/video-source.ts'
import type {TranscriptSource} from '../../application/transcript-source.ts'
import {isVideoId, VideoInspectionError} from '../../domain/video.ts'
import {getCaptionUrl} from './caption-url.ts'
import {parsePlayerPage, type PlayerPage} from './player-response.ts'
import {loadTimedtext} from './timedtext-source.ts'
import {fetchYouTubeText} from './youtube-request.ts'

export function createYouTubeSource() {
  let page: PlayerPage | null = null

  const inspect: VideoSource = async (videoId, signal) => {
    const discovered = await readPlayerPage(videoId, signal)
    if (signal.aborted) throw new VideoInspectionError('video-changed')
    page = discovered
    return {
      video: page.video,
      tracks: page.tracks.map(({baseUrl: _baseUrl, ...track}) => track),
    }
  }

  const load: TranscriptSource = async (videoId, trackId, signal) => {
    if (page?.video.videoId !== videoId) throw new VideoInspectionError('track-unavailable')
    const selected = page.tracks.find((track) => track.id === trackId)
    if (!selected) throw new VideoInspectionError('track-unavailable')
    const video = page.video
    const readTrack = (track: typeof selected) => {
      const url = getCaptionUrl(track.baseUrl, videoId)
      if (url.searchParams.getAll('lang').length !== 1 || url.searchParams.getAll('kind').length > 1 ||
        url.searchParams.get('lang') !== selected.languageCode ||
        (url.searchParams.get('kind') === 'asr') !== (selected.kind === 'auto') ||
        url.searchParams.has('tlang')) throw new VideoInspectionError('track-unavailable')
      return loadTimedtext(url.href, videoId, signal)
    }

    let cues
    try {
      cues = await readTrack(selected)
    } catch (error) {
      if (!(error instanceof VideoInspectionError) ||
        ![401, 403, 410].includes(error.httpStatus ?? 0) || signal.aborted) throw error
      const refreshed = await readPlayerPage(videoId, signal)
      const replacement = refreshed.tracks.find((track) => track.id === trackId &&
        track.languageCode === selected.languageCode && track.kind === selected.kind)
      if (!replacement) throw new VideoInspectionError('track-unavailable')
      cues = await readTrack(replacement)
      if (page?.video.videoId === videoId && !signal.aborted) page = refreshed
    }
    if (signal.aborted) throw new VideoInspectionError('cancelled')
    return {
      videoId, title: video.title, trackId, languageCode: selected.languageCode,
      source: 'timedtext', timing: 'exact', cues,
    }
  }

  return {inspect, load, clear: () => { page = null }}
}

async function readPlayerPage(videoId: string, signal: AbortSignal): Promise<PlayerPage> {
  if (!isVideoId(videoId)) throw new VideoInspectionError('page-data')
  try {
    const html = await fetchYouTubeText(`https://www.youtube.com/watch?v=${videoId}`, signal)
    return parsePlayerPage(html, videoId)
  } catch (error) {
    if (signal.aborted) throw new VideoInspectionError('video-changed')
    throw error
  }
}
