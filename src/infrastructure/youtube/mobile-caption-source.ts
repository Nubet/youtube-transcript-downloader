import type {TranscriptCue} from '../../domain/transcript.ts'
import {VideoInspectionError, type CaptionTrack} from '../../domain/video.ts'
import {getTrackCaptionUrl} from './caption-url.ts'
import {parsePlayerResponse} from './player-response.ts'
import {loadTimedtext} from './timedtext-source.ts'
import {fetchYouTubeText} from './youtube-request.ts'

// shortcut: client versions are fixed; update these if YouTube retires either client.
const CLIENTS = [
  {clientName: 'IOS', clientVersion: '20.10.4', deviceMake: 'Apple', deviceModel: 'iPhone16,2', osName: 'iOS', osVersion: '18.3.2'},
  {clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 35, osName: 'Android', osVersion: '15'},
] as const

export async function loadMobileCaptions(videoId: string, selected: CaptionTrack, signal: AbortSignal): Promise<TranscriptCue[] | null> {
  const identity = (track: CaptionTrack) => track.id.replace(/:\d+$/u, '')
  for (const client of CLIENTS) {
    try {
      const body = await fetchYouTubeText('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', signal, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({context: {client: {...client, hl: 'en', gl: 'US'}}, videoId, contentCheckOk: true, racyCheckOk: true}),
      })
      let data: unknown
      try { data = JSON.parse(body) } catch { throw new VideoInspectionError('page-data') }
      const page = parsePlayerResponse(data, videoId)
      const track = page.tracks.find((candidate) => candidate.languageCode === selected.languageCode &&
        candidate.kind === selected.kind && identity(candidate) === identity(selected))
      if (!track) continue
      return await loadTimedtext(getTrackCaptionUrl(track.baseUrl, videoId, selected).href, videoId, signal)
    } catch (error) {
      if (!(error instanceof VideoInspectionError) || signal.aborted ||
        ['cancelled', 'video-changed', 'timeout'].includes(error.code)) throw error
      if (error.code === 'network' && ![400, 401, 403, 404, 410].includes(error.httpStatus ?? 0)) throw error
    }
  }
  return null
}
