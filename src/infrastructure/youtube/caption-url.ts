import {VideoInspectionError, type CaptionTrack} from '../../domain/video.ts'

export function getCaptionUrl(value: string, videoId: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new VideoInspectionError('page-data')
  }
  if (url.origin !== 'https://www.youtube.com' || url.username || url.password || url.hash ||
    url.pathname !== '/api/timedtext' || url.searchParams.getAll('v').length !== 1 ||
    url.searchParams.get('v') !== videoId) {
    throw new VideoInspectionError('page-data')
  }
  return url
}

export function getTrackCaptionUrl(value: string, videoId: string, track: CaptionTrack): URL {
  const url = getCaptionUrl(value, videoId)
  if (url.searchParams.getAll('lang').length !== 1 || url.searchParams.getAll('kind').length > 1 ||
    url.searchParams.get('lang') !== track.languageCode ||
    (url.searchParams.get('kind') === 'asr') !== (track.kind === 'auto') || url.searchParams.has('tlang')) {
    throw new VideoInspectionError('track-unavailable')
  }
  return url
}
