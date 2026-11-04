export type TranscriptCue = {
  readonly startMs: number
  readonly endMs: number
  readonly text: string
}

export type Transcript = {
  readonly videoId: string
  readonly title: string
  readonly trackId: string | null
  readonly languageCode: string | null
  readonly source: 'timedtext' | 'panel'
  readonly timing: 'exact' | 'estimated'
  readonly cues: readonly TranscriptCue[]
}

export type TranscriptFormat = 'txt' | 'srt' | 'vtt'
