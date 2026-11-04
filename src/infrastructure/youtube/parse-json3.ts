import type {TranscriptCue} from '../../domain/transcript.ts'
import {VideoInspectionError} from '../../domain/video.ts'
import {isRecord} from '../../shared/is-record.ts'

export function parseJSON3(body: string): TranscriptCue[] {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    throw new VideoInspectionError('invalid-transcript')
  }
  if (!isRecord(data) || !Array.isArray(data.events)) throw new VideoInspectionError('invalid-transcript')
  const cues: TranscriptCue[] = []

  for (const event of data.events) {
    if (!isRecord(event)) throw new VideoInspectionError('invalid-transcript')
    if (event.segs === undefined) continue
    if (!Array.isArray(event.segs)) throw new VideoInspectionError('invalid-transcript')
    const text = event.segs.map((segment: unknown) => {
      if (!isRecord(segment) || typeof segment.utf8 !== 'string') {
        throw new VideoInspectionError('invalid-transcript')
      }
      return segment.utf8
    }).join('')
    if (!text.trim()) continue
    if (event.aAppend === 1 || typeof event.tStartMs !== 'number' ||
      typeof event.dDurationMs !== 'number') throw new VideoInspectionError('invalid-transcript')
    cues.push({startMs: event.tStartMs, endMs: event.tStartMs + event.dDurationMs, text})
  }
  return cues
}
