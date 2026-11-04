import type {TranscriptCue} from './transcript.ts'

export function normalizeCues(cues: readonly TranscriptCue[]): TranscriptCue[] {
  const normalized: TranscriptCue[] = []
  const seen = new Set<string>()

  for (const cue of cues) {
    if (
      !Number.isSafeInteger(cue.startMs) ||
      !Number.isSafeInteger(cue.endMs) ||
      cue.startMs < 0 ||
      cue.endMs <= cue.startMs
    ) {
      throw new RangeError('Transcript segments must have valid integer millisecond ranges.')
    }

    if (typeof cue.text !== 'string') {
      throw new TypeError('Transcript segment text must be a string.')
    }

    const text = cue.text.replace(/\s+/gu, ' ').trim()
    if (!text) continue

    const key = JSON.stringify([cue.startMs, cue.endMs, text])
    if (seen.has(key)) continue

    seen.add(key)
    normalized.push({startMs: cue.startMs, endMs: cue.endMs, text})
  }

  if (normalized.length === 0) {
    throw new Error('Transcript contains no readable segments.')
  }

  return normalized.sort((a, b) => a.startMs - b.startMs)
}
