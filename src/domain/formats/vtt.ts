import {normalizeCues} from '../normalize-cues.ts'
import type {TranscriptCue} from '../transcript.ts'
import {subtitleTimestamp} from './timestamp.ts'

export function toVTT(cues: readonly TranscriptCue[]): string {
  const body = normalizeCues(cues)
    .map((cue) => {
      const text = cue.text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
      return `${subtitleTimestamp(cue.startMs, '.')} --> ${subtitleTimestamp(cue.endMs, '.')}\n${text}`
    })
    .join('\n\n')

  return `WEBVTT\n\n${body}\n`
}
