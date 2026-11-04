import {normalizeCues} from '../../domain/normalize-cues.ts'
import type {TranscriptCue} from '../../domain/transcript.ts'
import {VideoInspectionError} from '../../domain/video.ts'
import {getCaptionUrl} from './caption-url.ts'
import {parseJSON3} from './parse-json3.ts'
import {parseXML} from './parse-xml.ts'
import {fetchYouTubeText} from './youtube-request.ts'

export async function loadTimedtext(baseUrl: string, videoId: string, signal: AbortSignal): Promise<TranscriptCue[]> {
  const url = getCaptionUrl(baseUrl, videoId)
  url.searchParams.set('fmt', 'json3')
  try {
    return parseTimedtext(await fetchYouTubeText(url, signal))
  } catch (error) {
    if (!(error instanceof VideoInspectionError) ||
      (error.code !== 'empty-transcript' && error.code !== 'invalid-transcript')) throw error
  }
  if (signal.aborted) throw new VideoInspectionError('cancelled')
  url.searchParams.delete('fmt')
  return parseTimedtext(await fetchYouTubeText(url, signal))
}

export function parseTimedtext(body: string): TranscriptCue[] {
  const content = body.trim()
  if (!content) throw new VideoInspectionError('empty-transcript')
  const cues = content.startsWith('<') ? parseXML(content) : parseJSON3(content)
  if (cues.length === 0) throw new VideoInspectionError('empty-transcript')
  try {
    return normalizeCues(cues)
  } catch {
    throw new VideoInspectionError('invalid-transcript')
  }
}
