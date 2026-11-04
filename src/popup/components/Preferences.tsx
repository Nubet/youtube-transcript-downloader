import type {ExtensionSettings} from '../../domain/settings/extension-settings.ts'
import type {CaptionTrack} from '../../domain/video.ts'
import {popupStore, settingsStore} from '../popup-state.ts'
import {preferredLanguages} from '../../domain/settings/preferred-languages.ts'

export default function Preferences({settings, tracks, disabled}: {
  settings: ExtensionSettings
  tracks: readonly CaptionTrack[]
  disabled: boolean
}) {
  const languages = preferredLanguages(tracks, settings.preferredLanguage)

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
      <div className="settings-group">
        <label className="setting-row metadata-option">
          <span>Show transcript button on YouTube</span>
          <input type="checkbox" checked={settings.showPageButton} disabled={disabled}
            onChange={(event) => void settingsStore.update({showPageButton: event.target.checked})} />
        </label>
      </div>
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
