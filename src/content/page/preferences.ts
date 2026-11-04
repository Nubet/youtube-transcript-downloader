import type {CaptionTrack} from '../../domain/video.ts'
import {preferredLanguages} from '../../domain/settings/preferred-languages.ts'
import type {createSettingsStore} from '../../popup/settings-store.ts'

export const PAGE_PREFERENCES = `
  <label>Format<select id="format" aria-label="Format"><option value="txt">TXT</option><option value="srt">SRT</option><option value="vtt">VTT</option></select></label>
  <label id="timestamps-row">Timestamps<input id="timestamps" type="checkbox" role="switch"></label>
  <details id="more-settings">
    <summary>Show more settings</summary>
    <label class="preferred-language">Preferred language<select id="preferred-language" aria-describedby="language-help"></select></label>
    <p id="language-help">Uses English if unavailable, then another available caption track.</p>
    <label>Include title<input id="include-title" type="checkbox" role="switch"></label>
    <label>Include video link<input id="include-link" type="checkbox" role="switch"></label>
    <p>Title and video link apply to TXT downloads and copies.</p>
    <label>Show transcript button on YouTube<input id="show-page-button" type="checkbox" role="switch"></label>
    <p>Changes are saved automatically and shared with the extension popup.</p>
  </details>`

export function mountPagePreferences(shadow: ShadowRoot, store: ReturnType<typeof createSettingsStore>,
  run: (action: () => void) => void, onError: (error: unknown) => void) {
  const format = shadow.querySelector<HTMLSelectElement>('#format')!
  const language = shadow.querySelector<HTMLSelectElement>('#preferred-language')!
  const toggles = [
    [shadow.querySelector<HTMLInputElement>('#timestamps')!, 'includeTimestamps'],
    [shadow.querySelector<HTMLInputElement>('#include-title')!, 'includeTitle'],
    [shadow.querySelector<HTMLInputElement>('#include-link')!, 'includeLink'],
    [shadow.querySelector<HTMLInputElement>('#show-page-button')!, 'showPageButton'],
  ] as const
  format.addEventListener('change', () => run(() => {
    const value = format.value
    if (value === 'txt' || value === 'srt' || value === 'vtt') void store.update({format: value}).catch(onError)
  }))
  language.addEventListener('change', () => run(() => {
    void store.update({preferredLanguage: language.value || null}).catch(onError)
  }))
  for (const [control, key] of toggles) control.addEventListener('change', () => run(() => {
    void store.update({[key]: control.checked}).catch(onError)
  }))

  return (tracks: readonly CaptionTrack[], working = false) => {
    const {settings, status} = store.getSnapshot()
    format.value = settings.format
    format.disabled = language.disabled = working || status !== 'ready'
    for (const [control, key] of toggles) { control.checked = settings[key]; control.disabled = format.disabled }
    const languages = preferredLanguages(tracks, settings.preferredLanguage)
    const key = languages.map(({code}) => code).join(',')
    if (language.dataset.languages !== key) {
      language.dataset.languages = key
      language.replaceChildren(new Option('Browser language', ''), ...languages.map(({code, label}) => new Option(label, code)))
    }
    language.value = settings.preferredLanguage ?? ''
    shadow.querySelector<HTMLElement>('#timestamps-row')!.hidden = settings.format !== 'txt'
  }
}
