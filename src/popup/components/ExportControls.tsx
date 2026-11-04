import type {ExtensionSettings} from '../../domain/settings/extension-settings.ts'
import type {ExportState, TranscriptSelection} from '../popup-store.ts'
import {popupStore, settingsStore} from '../popup-state.ts'

export default function ExportControls({selection, settings, settingsLoading}: {
  selection: TranscriptSelection | null
  settings: ExtensionSettings
  settingsLoading: boolean
}) {
  const file = popupStore.getExport(settings.format === 'txt'
    ? {format: 'txt', includeTimestamps: settings.includeTimestamps} : {format: settings.format})
  const exportState: ExportState = selection?.status === 'ready' ? selection.exportState : {status: 'idle'}
  const current = exportState.status !== 'idle' && exportState.file === file ? exportState : null
  const busy = exportState.status === 'working'
  const optionsDisabled = settingsLoading || busy
  const actionsDisabled = !file || optionsDisabled

  return (
    <section className="export-controls" aria-label="Export transcript" aria-busy={busy}>
      <FormatOptions settings={settings} disabled={optionsDisabled} />
      {file?.timing === 'estimated' && <p className="status-message">Timing estimated from transcript panel.</p>}
      <div className="export-actions">
        <button type="button" className="download-button" disabled={actionsDisabled}
          onClick={() => { if (file) void popupStore.exportTranscript('download', file) }}>
          {current?.status === 'working' && current.action === 'download' ? 'Starting download…' : 'Download transcript'}
        </button>
        <button type="button" className="copy-button" disabled={actionsDisabled}
          onClick={() => { if (file) void popupStore.exportTranscript('copy', file) }}>
          {current?.status === 'working' && current.action === 'copy' ? 'Copying…' : 'Copy to clipboard'}
        </button>
      </div>
      <ExportFeedback state={current} />
    </section>
  )
}

function FormatOptions({settings, disabled}: {settings: ExtensionSettings; disabled: boolean}) {
  return (
    <>
      <fieldset className="format-options" disabled={disabled}>
        <legend>Export format</legend>
        {(['txt', 'srt', 'vtt'] as const).map((format) => (
          <label key={format}>
            <input type="radio" name="format" value={format} checked={settings.format === format}
              onChange={() => void settingsStore.update({format})} />
            <span>{format.toUpperCase()}</span>
          </label>
        ))}
      </fieldset>
      {settings.format === 'txt' && (
        <label className="timestamp-option">
          <input type="checkbox" checked={settings.includeTimestamps} disabled={disabled}
            onChange={(event) => void settingsStore.update({includeTimestamps: event.target.checked})} />
          Include timestamps
        </label>
      )}
    </>
  )
}

function ExportFeedback({state}: {state: ExportState | null}) {
  if (state?.status === 'success') {
    return <p className="status-message" role="status">{state.action === 'copy' ? 'Copied to clipboard.' : 'Download started.'}</p>
  }
  if (state?.status === 'error') {
    return (
      <p className="error-message" role="alert">
        {state.action === 'copy' ? 'Could not copy to clipboard. Try again.' : 'Could not start the download. Try again.'}
      </p>
    )
  }
  return null
}
