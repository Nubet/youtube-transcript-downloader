import type {CaptionTrack} from '../video.ts'

const LANGUAGE_CODES = 'af am ar az be bg bn bs ca cs cy da de el en eo es et eu fa fi fil fr ga gl gu ha he hi hr hu hy id ig is it ja jv ka kk km kn ko ku ky la lo lt lv mg mi mk ml mn mr ms mt my ne nl no pa pl ps pt ro ru si sk sl so sq sr su sv sw ta te tg th tk tr uk ur uz vi xh yi yo zh zu'.split(' ')
const languageNames = new Intl.DisplayNames(['en'], {type: 'language'})

export function preferredLanguages(tracks: readonly CaptionTrack[], preferredLanguage: string | null) {
  const codes = new Set([...LANGUAGE_CODES, ...tracks.map((track) => track.languageCode)])
  if (preferredLanguage) codes.add(preferredLanguage)
  return Array.from(codes, (code) => ({code, label: languageNames.of(code) ?? code}))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'))
}
