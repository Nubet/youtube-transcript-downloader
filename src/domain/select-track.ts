import type {CaptionTrack} from './video.ts'

export function selectTrack(tracks: readonly CaptionTrack[], language: string, preferredLanguage: string | null = null): CaptionTrack | null {
  for (const candidate of [preferredLanguage ?? language, 'en']) {
    if (!candidate) continue
    const locale = candidate.toLowerCase()
    const primaryLanguage = locale.split('-')[0]
    const exact = tracks.filter((track) => track.languageCode.toLowerCase() === locale)
    const related = tracks.filter((track) => track.languageCode.toLowerCase().split('-')[0] === primaryLanguage)
    const matching = exact.length > 0 ? exact : related
    const match = matching.find((track) => track.kind === 'manual') ?? matching[0]
    if (match) return match
  }
  return tracks.find((track) => track.kind === 'manual') ?? tracks[0] ?? null
}
