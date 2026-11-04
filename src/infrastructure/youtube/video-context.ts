import {isVideoId} from '../../domain/video.ts'

export function getVideoId(value: string | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.origin !== 'https://www.youtube.com' || url.pathname !== '/watch') return null
    const videoId = url.searchParams.get('v')
    return isVideoId(videoId) ? videoId : null
  } catch {
    return null
  }
}
