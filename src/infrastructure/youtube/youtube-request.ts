import {VideoInspectionError} from '../../domain/video.ts'

export async function fetchYouTubeText(
  url: string | URL,
  signal: AbortSignal,
  options: Pick<RequestInit, 'method' | 'headers' | 'body'> = {}
): Promise<string> {
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
    if (signal.aborted) throw new VideoInspectionError('cancelled')
    const response = await fetch(url, {
      ...options,
      credentials: 'include', redirect: 'error', signal: controller.signal,
    })
    if (!response.ok) throw new VideoInspectionError('network', response.status)
    const body = await response.text()
    if (controller.signal.aborted) throw new VideoInspectionError(timedOut ? 'timeout' : 'cancelled')
    return body
  } catch (error) {
    if (signal.aborted) throw new VideoInspectionError('cancelled')
    if (timedOut) throw new VideoInspectionError('timeout')
    if (error instanceof VideoInspectionError) throw error
    throw new VideoInspectionError('network')
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}
