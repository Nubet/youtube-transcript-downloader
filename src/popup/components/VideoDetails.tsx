import type {VideoErrorCode} from '../../domain/video.ts'
import type {PopupState, TranscriptSelection} from '../popup-store.ts'
import {popupStore} from '../popup-state.ts'

const ERROR_MESSAGES = {
  network: 'Couldn’t connect to YouTube. Check your connection.',
  timeout: 'YouTube took too long to respond.',
  'page-data': 'Couldn’t read caption details. Refresh to retry.',
  unavailable: 'Video unavailable. Check access in the YouTube tab.',
  'video-changed': 'Video changed. Refresh to load the current one.',
  connection: 'Couldn’t reach the YouTube tab. Reload the page.',
  'empty-transcript': 'Direct captions unavailable. Try the YouTube transcript.',
  'invalid-transcript': 'Caption data is incomplete. Retry or change language.',
  'track-unavailable': 'Caption track unavailable. Refresh to update languages.',
  'panel-unavailable': 'Open the transcript in the YouTube tab, then retry.',
  'panel-incomplete': 'Couldn’t read the full transcript. Keep the tab open and retry.',
  'panel-filtered': 'Clear the transcript’s search filter in YouTube, then retry.',
  cancelled: 'Loading cancelled.',
} satisfies Record<VideoErrorCode, string>

export default function VideoDetails({state}: {state: PopupState}) {
  if (state.status === 'loading') {
    return <p className="empty-state" role="status">Loading video…</p>
  }
  if (state.status === 'unsupported') {
    return <p className="empty-state" role="status">Open a YouTube video to get its transcript.</p>
  }
  if (state.status === 'error') {
    return (
      <div className="empty-state">
        <p className="error-message" role="alert">{ERROR_MESSAGES[state.code]}</p>
        <button className="text-button" type="button" onClick={() => void popupStore.reload()}>Retry</button>
      </div>
    )
  }

  const {inspection} = state
  return (
    <>
      <h2 className="video-title" title={inspection.video.title}>{inspection.video.title}</h2>
      {inspection.tracks.length === 0 && (
        <p className="empty-state" role="status">No caption tracks listed for this video.</p>
      )}
    </>
  )
}

export function TranscriptStatus({selection}: {selection: TranscriptSelection}) {
  if (selection.status === 'none' || selection.status === 'ready') return null
  if (selection.status === 'loading') {
    if (selection.trackId === null) {
      return (
        <div className="panel-progress">
          <p className="status-message" role="status">Reading YouTube transcript…</p>
          <button className="text-button" type="button" onClick={popupStore.cancelTranscript}>Cancel</button>
        </div>
      )
    }
    return <p className="status-message" role="status">Loading transcript…</p>
  }
  return (
    <div className="transcript-error">
      <p className="error-message" role="alert">{ERROR_MESSAGES[selection.code]}</p>
      <div className="recovery-actions">
        {selection.trackId !== null && (
          <button className="text-button" type="button" onClick={() => void popupStore.selectLanguage(null)}>Use YouTube transcript</button>
        )}
        <button className="text-button" type="button"
          onClick={() => void popupStore.selectLanguage(selection.trackId)}>Retry</button>
      </div>
    </div>
  )
}
