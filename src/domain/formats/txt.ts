import {normalizeCues} from '../normalize-cues.ts'
import type {TranscriptCue} from '../transcript.ts'
import {clockTimestamp} from './timestamp.ts'

export function toTXT(cues: readonly TranscriptCue[], includeTimestamps = false): string {
  return normalizeCues(cues)
    .map((cue) => includeTimestamps ? `${clockTimestamp(cue.startMs)} ${cue.text}` : cue.text)
    .join('\n') + '\n'
}
