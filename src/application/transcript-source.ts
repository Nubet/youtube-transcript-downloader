import type {Transcript} from '../domain/transcript.ts'

export type TranscriptSource = (
  videoId: string,
  trackId: string,
  signal: AbortSignal
) => Promise<Transcript>
