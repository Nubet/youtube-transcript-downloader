import type {ExtensionSettings} from '../../domain/settings/extension-settings.ts'
import type {CaptionTrack} from '../../domain/video.ts'
import {popupStore, settingsStore} from '../popup-state.ts'

const LANGUAGE_CODES = 'af am ar az be bg bn bs ca cs cy da de el en eo es et eu fa fi fil fr ga gl gu ha he hi hr hu hy id ig is it ja jv ka kk km kn ko ku ky la lo lt lv mg mi mk ml mn mr ms mt my ne nl no pa pl ps pt ro ru si sk sl so sq sr su sv sw ta te tg th tk tr uk ur uz vi xh yi yo zh zu'.split(' ')
const languageNames = new Intl.DisplayNames(['en'], {type: 'language'})

export default function Preferences({settings, tracks, disabled}: {
  settings: ExtensionSettings
  tracks: readonly CaptionTrack[]
  disabled: boolean
}) {
  const codes = new Set([...LANGUAGE_CODES, ...tracks.map((track) => track.languageCode)])
  if (settings.preferredLanguage) codes.add(settings.preferredLanguage)
  const languages = Array.from(codes, (code) => ({code, label: languageNames.of(code) ?? code}))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'))

  async function changeLanguage(value: string) {
    await settingsStore.update({preferredLanguage: value || null})
    if (settingsStore.getSnapshot().status === 'ready') await popupStore.reload(false)
  }

  return (
    <section className="preferences" aria-label="Personalization">
      <div className="settings-group">
        <label className="setting-row language-field preferred-language">
          <span>Preferred language</span>
          <select value={settings.preferredLanguage ?? ''} disabled={disabled}
            aria-describedby="language-help" onChange={(event) => void changeLanguage(event.target.value)}>
            <option value="">Browser language</option>
            {languages.map(({code, label}) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
      </div>
      <p id="language-help" className="status-message">Uses English if unavailable, then another available caption track.</p>
      <div>
        <h2 className="settings-heading">TXT metadata</h2>
        <div className="settings-group">
          <label className="setting-row metadata-option">
            <span>Include title</span>
            <input type="checkbox" checked={settings.includeTitle} disabled={disabled}
              onChange={(event) => void settingsStore.update({includeTitle: event.target.checked})} />
          </label>
          <label className="setting-row metadata-option">
            <span>Include video link</span>
            <input type="checkbox" checked={settings.includeLink} disabled={disabled}
              onChange={(event) => void settingsStore.update({includeLink: event.target.checked})} />
          </label>
        </div>
      </div>
      <p className="status-message">Applies to TXT downloads and copies. Metadata is separated from the transcript by a blank line.</p>
      <p className="status-message">Changes are saved automatically on this device.</p>
    </section>
  )
}
