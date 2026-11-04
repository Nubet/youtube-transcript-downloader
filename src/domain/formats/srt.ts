import {normalizeCues} from '../normalize-cues.ts'
import type {TranscriptCue} from '../transcript.ts'
import {subtitleTimestamp} from './timestamp.ts'

export function toSRT(cues: readonly TranscriptCue[]): string {
  return normalizeCues(cues)
    .map((cue, index) =>
      `${index + 1}\n${subtitleTimestamp(cue.startMs, ',')} --> ${subtitleTimestamp(cue.endMs, ',')}\n${cue.text}`
    )
    .join('\n\n') + '\n'
}
