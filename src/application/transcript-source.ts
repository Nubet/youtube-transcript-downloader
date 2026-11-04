import type {Transcript} from '../domain/transcript.ts'

export type TranscriptSource = (
  videoId: string,
  trackId: string | null,
  signal: AbortSignal
) => Promise<Transcript>
