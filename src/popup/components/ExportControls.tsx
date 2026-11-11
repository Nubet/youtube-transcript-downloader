import type {ExtensionSettings} from '../../domain/settings/extension-settings.ts'
import type {VideoInspection} from '../../domain/video.ts'
import type {ExportState, TranscriptSelection} from '../popup-store.ts'
import {popupStore, settingsStore} from '../popup-state.ts'
import {TranscriptStatus} from './VideoDetails'

export default function ExportControls({inspection, selection, settings, settingsLoading}: {
  inspection: VideoInspection
  selection: TranscriptSelection
  settings: ExtensionSettings
  settingsLoading: boolean
}) {
  const file = popupStore.getExport(settings.format === 'txt'
    ? {format: 'txt', includeTimestamps: settings.includeTimestamps, includeTitle: settings.includeTitle, includeLink: settings.includeLink}
    : {format: settings.format})
  const exportState: ExportState = selection.status === 'ready' ? selection.exportState : {status: 'idle'}
  const current = exportState.status !== 'idle' && exportState.file === file ? exportState : null
  const busy = exportState.status === 'working'
  const optionsDisabled = settingsLoading || busy
  const actionsDisabled = !file || optionsDisabled

  return (
    <section className="export-controls" aria-label="Export transcript" aria-busy={busy}>
      <div className="settings-group">
        <LanguageField tracks={inspection.tracks} selection={selection} />
        <FormatOptions settings={settings} disabled={optionsDisabled} />
      </div>
      <TranscriptStatus selection={selection} />
      {file?.timing === 'estimated' && <p className="status-message">YouTube panel · language unspecified · estimated timing.</p>}
      <div className="export-actions">
        <button type="button" className="download-button" disabled={actionsDisabled}
          onClick={() => { if (file) void popupStore.exportTranscript('download', file) }}>
          {current?.status === 'working' && current.action === 'download' ? 'Downloading…' : 'Download'}
        </button>
        <button type="button" className="copy-button" disabled={actionsDisabled}
          onClick={() => { if (file) void popupStore.exportTranscript('copy', file) }}>
          {current?.status === 'working' && current.action === 'copy' ? 'Copying…' : 'Copy'}
        </button>
      </div>
      <ExportFeedback state={current} />
    </section>
  )
}

function LanguageField({tracks, selection}: {tracks: VideoInspection['tracks']; selection: TranscriptSelection}) {
  return (
    <label className="setting-row language-field">
      <span>Language</span>
      <select value={selection.status === 'none' ? '' : selection.trackId ?? 'panel'}
        onChange={(event) => {
          if (event.target.value === 'panel') { void popupStore.selectLanguage(null); return }
          const track = tracks.find((item) => item.id === event.target.value)
          if (!track) return
          void popupStore.selectLanguage(track.id)
        }}>
        {selection.status !== 'none' && selection.trackId === null && <option value="panel">YouTube transcript</option>}
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.label}{track.kind === 'auto' ? ' (auto)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

function FormatOptions({settings, disabled}: {settings: ExtensionSettings; disabled: boolean}) {
  return (
    <>
      <div className="setting-row">
        <span id="format-label">Format</span>
        <fieldset className="format-options" aria-labelledby="format-label" disabled={disabled}>
          {(['txt', 'srt', 'vtt'] as const).map((format) => (
            <label key={format}>
              <input type="radio" name="format" value={format} checked={settings.format === format}
                onChange={() => void settingsStore.update({format})} />
              <span>{format.toUpperCase()}</span>
            </label>
          ))}
        </fieldset>
      </div>
      {settings.format === 'txt' && (
        <label className="setting-row timestamp-option">
          <span>Timestamps</span>
          <span className="toggle">
            <input type="checkbox" checked={settings.includeTimestamps} disabled={disabled}
              onChange={(event) => void settingsStore.update({includeTimestamps: event.target.checked})} />
            <span className="toggle-track" aria-hidden="true" />
          </span>
        </label>
      )}
    </>
  )
}

function ExportFeedback({state}: {state: ExportState | null}) {
  if (state?.status === 'success') {
    return <p className="status-message action-feedback" role="status">{state.action === 'copy' ? 'Copied.' : 'Download started.'}</p>
  }
  if (state?.status === 'error') {
    return (
      <p className="error-message action-feedback" role="alert">
        {state.error ? `Couldn’t ${state.action}: ${state.error}`
          : state.action === 'copy' ? 'Couldn’t copy. Try again.' : 'Couldn’t download. Try again.'}
      </p>
    )
  }
  return null
}
