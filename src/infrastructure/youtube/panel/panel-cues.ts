import {normalizeCues} from '../../../domain/normalize-cues.ts'
import type {TranscriptCue} from '../../../domain/transcript.ts'
import {VideoInspectionError} from '../../../domain/video.ts'

export type PanelRow = {startMs: number; text: string}

export function parsePanelTimestamp(value: string): number {
  const text = value.trim()
  if (!/^\d+:\d{2}(?::\d{2})?$/u.test(text)) throw new VideoInspectionError('invalid-transcript')
  const parts = text.split(':').map(Number)
  if (parts.slice(1).some((part) => part > 59)) throw new VideoInspectionError('invalid-transcript')
  const ms = parts.reduce((total, part) => total * 60 + part, 0) * 1000
  if (!Number.isSafeInteger(ms)) throw new VideoInspectionError('invalid-transcript')
  return ms
}

export function estimatePanelCues(rows: readonly PanelRow[], durationMs: number | null): TranscriptCue[] {
  const sorted = [...rows].sort((a, b) => a.startMs - b.startMs)
  let nextStart = durationMs
  const cues: TranscriptCue[] = []
  for (let index = sorted.length - 1; index >= 0; index--) {
    const row = sorted[index]!
    const next = sorted[index + 1]
    if (next && next.startMs > row.startMs) nextStart = next.startMs
    // shortcut: without video duration the last cue lasts 5s; use exact end times when YouTube exposes them.
    cues.push({...row, endMs: nextStart ?? row.startMs + 5000})
  }
  try { return normalizeCues(cues.reverse()) } catch { throw new VideoInspectionError('invalid-transcript') }
}
