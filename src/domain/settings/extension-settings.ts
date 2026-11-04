import type {TranscriptFormat} from '../transcript.ts'

export type ExtensionSettings = Readonly<{
  format: TranscriptFormat
  includeTimestamps: boolean
  includeTitle: boolean
  includeLink: boolean
  showPageButton: boolean
  preferredLanguage: string | null
}>

export const DEFAULT_SETTINGS: ExtensionSettings = {
  format: 'txt',
  includeTimestamps: false,
  includeTitle: false,
  includeLink: false,
  showPageButton: false,
  preferredLanguage: null,
}

export function parseSettings(value: unknown): ExtensionSettings {
  const data = typeof value === 'object' && value !== null ? value : {}
  let preferredLanguage: string | null = null
  if ('preferredLanguage' in data && typeof data.preferredLanguage === 'string') {
    try { preferredLanguage = Intl.getCanonicalLocales(data.preferredLanguage)[0] ?? null } catch { /* Invalid locale uses the browser language. */ }
  }
  return {
    format: 'format' in data && (data.format === 'srt' || data.format === 'vtt') ? data.format : 'txt',
    includeTimestamps: 'includeTimestamps' in data && typeof data.includeTimestamps === 'boolean' ? data.includeTimestamps : false,
    includeTitle: 'includeTitle' in data && typeof data.includeTitle === 'boolean' ? data.includeTitle : false,
    includeLink: 'includeLink' in data && typeof data.includeLink === 'boolean' ? data.includeLink : false,
    showPageButton: 'showPageButton' in data && typeof data.showPageButton === 'boolean' ? data.showPageButton : false,
    preferredLanguage,
  }
}
