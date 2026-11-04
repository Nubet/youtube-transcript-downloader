import type {TranscriptFormat} from './transcript.ts'

export function getExportFilename(
  title: string,
  languageCode: string | null,
  format: TranscriptFormat
): string {
  if (languageCode !== null && (
    languageCode.length > 63 ||
    languageCode.trim() !== languageCode ||
    !/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/iu.test(languageCode)
  )) {
    throw new Error('Transcript language code is invalid.')
  }

  const suffix = `.${languageCode ?? 'und'}.${format}`
  const encoder = new TextEncoder()
  // Reserve one byte for a Windows reserved-name prefix.
  const budget = 239 - encoder.encode(suffix).length
  const cleanTitle = title.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/gu, '-')
    .trim()
  let name = ''
  let bytes = 0

  for (const character of cleanTitle) {
    const size = encoder.encode(character).length
    if (bytes + size > budget) break
    name += character
    bytes += size
  }

  name = name.replace(/[. ]+$/gu, '') || 'transcript'
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(name)) {
    name = `_${name}`
  }

  return `${name}${suffix}`
}
