import {getExportFilename} from '../domain/export-filename.ts'
import {toSRT} from '../domain/formats/srt.ts'
import {toTXT} from '../domain/formats/txt.ts'
import {toVTT} from '../domain/formats/vtt.ts'
import type {Transcript, TranscriptFormat} from '../domain/transcript.ts'

export type ExportOptions =
  | {format: 'txt'; includeTimestamps: boolean}
  | {format: 'srt' | 'vtt'}

export type TranscriptExport = {
  text: string
  filename: string
  mimeType: string
  timing: Transcript['timing']
}

const MIME_TYPES = {
  txt: 'text/plain;charset=utf-8',
  srt: 'application/x-subrip;charset=utf-8',
  vtt: 'text/vtt;charset=utf-8',
} satisfies Record<TranscriptFormat, string>

export function prepareExport(transcript: Transcript, options: ExportOptions): TranscriptExport {
  let text: string

  switch (options.format) {
    case 'txt':
      text = toTXT(transcript.cues, options.includeTimestamps)
      break
    case 'srt':
      text = toSRT(transcript.cues)
      break
    case 'vtt':
      text = toVTT(transcript.cues)
      break
  }

  return {
    text,
    filename: getExportFilename(transcript.title, transcript.languageCode, options.format),
    mimeType: MIME_TYPES[options.format],
    timing: transcript.timing,
  }
}
