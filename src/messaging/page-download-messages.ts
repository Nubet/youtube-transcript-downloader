import type {ExportOptions} from '../application/prepare-export.ts'
import type {Transcript} from '../domain/transcript.ts'
import {isRecord} from '../shared/is-record.ts'
import {isTranscriptLoadResponse} from './transcript-messages.ts'

export type PageDownloadRequest = {
  type: 'transcript.download'
  transcript: Transcript
  options: ExportOptions
}

export function isPageDownloadRequest(value: unknown): value is PageDownloadRequest {
  if (!isRecord(value) || value.type !== 'transcript.download' ||
    !isRecord(value.transcript) || !isRecord(value.options)) return false
  const options = value.options
  const validOptions = options.format === 'srt' || options.format === 'vtt' ||
    (options.format === 'txt' && typeof options.includeTimestamps === 'boolean' &&
      typeof options.includeTitle === 'boolean' && typeof options.includeLink === 'boolean')
  return validOptions && isTranscriptLoadResponse({
    type: 'transcript.loaded', requestId: 'page-download', videoId: value.transcript.videoId,
    trackId: value.transcript.trackId, result: {status: 'ready', transcript: value.transcript},
  })
}
