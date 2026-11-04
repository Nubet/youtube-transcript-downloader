import type {CaptionTrack} from './video.ts'

export function selectTrack(tracks: readonly CaptionTrack[], language: string): CaptionTrack | null {
  const locale = language.toLowerCase()
  const primaryLanguage = locale.split('-')[0]
  const exact = tracks.filter((track) => track.languageCode.toLowerCase() === locale)
  const related = tracks.filter((track) => track.languageCode.toLowerCase().split('-')[0] === primaryLanguage)
  const matching = exact.length > 0 ? exact : related

  return matching.find((track) => track.kind === 'manual') ?? matching[0] ??
    tracks.find((track) => track.kind === 'manual') ?? tracks[0] ?? null
}
