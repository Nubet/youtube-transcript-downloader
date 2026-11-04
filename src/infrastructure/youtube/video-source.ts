import type {VideoSource} from '../../application/video-source.ts'
import {isVideoId, VideoInspectionError} from '../../domain/video.ts'
import {parsePlayerPage} from './player-response.ts'

export const inspectYouTubeVideo: VideoSource = async (videoId, signal) => {
  if (!isVideoId(videoId)) throw new VideoInspectionError('page-data')
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, {once: true})
  if (signal.aborted) controller.abort()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 15_000)

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      credentials: 'include',
      redirect: 'error',
      signal: controller.signal,
    })
    if (!response.ok) throw new VideoInspectionError('network')
    const html = await response.text()
    if (controller.signal.aborted) throw new VideoInspectionError(timedOut ? 'timeout' : 'video-changed')
    const page = parsePlayerPage(html, videoId)
    return {
      video: page.video,
      tracks: page.tracks.map(({baseUrl: _baseUrl, ...track}) => track),
    }
  } catch (error) {
    if (signal.aborted) throw new VideoInspectionError('video-changed')
    if (timedOut) throw new VideoInspectionError('timeout')
    if (error instanceof VideoInspectionError) throw error
    throw new VideoInspectionError('network')
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}
