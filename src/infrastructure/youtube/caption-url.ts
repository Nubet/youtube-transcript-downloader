import {VideoInspectionError} from '../../domain/video.ts'

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
