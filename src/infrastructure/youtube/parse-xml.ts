import type {TranscriptCue} from '../../domain/transcript.ts'
import {VideoInspectionError} from '../../domain/video.ts'

export function parseXML(body: string): TranscriptCue[] {
  if (/<!DOCTYPE|<!ENTITY/iu.test(body)) throw new VideoInspectionError('invalid-transcript')
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(body, 'text/xml')
  } catch {
    throw new VideoInspectionError('invalid-transcript')
  }
  if (doc.getElementsByTagName('parsererror').length > 0) throw new VideoInspectionError('invalid-transcript')
  const root = doc.documentElement
  const classic = root?.localName === 'transcript'
  if (!classic && root?.localName !== 'timedtext') throw new VideoInspectionError('invalid-transcript')
  const nodes = root.getElementsByTagName(classic ? 'text' : 'p')
  const cues: TranscriptCue[] = []

  for (const node of Array.from(nodes)) {
    for (const lineBreak of Array.from(node.getElementsByTagName('br'))) {
      lineBreak.parentNode?.replaceChild(doc.createTextNode(' '), lineBreak)
    }
    const text = node.textContent ?? ''
    if (!text.trim()) continue
    const startMs = parseTime(node.getAttribute(classic ? 'start' : 't'), classic)
    const durationMs = parseTime(node.getAttribute(classic ? 'dur' : 'd'), classic)
    cues.push({startMs, endMs: startMs + durationMs, text})
  }
  return cues
}

function parseTime(value: string | null, seconds: boolean): number {
  if (value === null || !/^\d+(?:\.\d+)?$/u.test(value)) {
    throw new VideoInspectionError('invalid-transcript')
  }
  const time = Number(value) * (seconds ? 1_000 : 1)
  if (!Number.isFinite(time) || (!seconds && !Number.isInteger(time))) {
    throw new VideoInspectionError('invalid-transcript')
  }
  return Math.round(time)
}
