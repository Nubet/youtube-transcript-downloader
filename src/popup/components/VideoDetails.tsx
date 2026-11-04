import type {VideoErrorCode} from '../../domain/video.ts'
import type {PopupState, TranscriptSelection} from '../popup-store.ts'
import {popupStore} from '../popup-state.ts'

const ERROR_MESSAGES = {
  network: 'Could not load data from YouTube. Check your connection and try again.',
  timeout: 'YouTube took too long to respond. Try again.',
  'page-data': 'Could not read caption data. This does not mean the video has no transcript.',
  unavailable: 'YouTube could not play this video. Check access in the video tab, then retry.',
  'video-changed': 'The video changed while loading. Try again for the current video.',
  connection: 'Could not reach the YouTube tab. Reload the page and try again.',
  'empty-transcript': 'YouTube returned no caption text for this track. Try another language or retry.',
  'invalid-transcript': 'YouTube returned incomplete or unrecognized caption data. Try another language or retry.',
  'track-unavailable': 'This caption track is no longer available. Refresh the video details and try again.',
  cancelled: 'Transcript loading was cancelled. Try again.',
} satisfies Record<VideoErrorCode, string>

export default function VideoDetails({state}: {state: PopupState}) {
  if (state.status === 'loading') {
    return <p className="status-message" role="status">Reading video captions…</p>
  }
  if (state.status === 'unsupported') {
    return <p className="status-message" role="status">Open a YouTube video to see its available captions.</p>
  }
  if (state.status === 'error') {
    return (
      <>
        <p className="error-message" role="alert">{ERROR_MESSAGES[state.code]}</p>
        <button className="retry-button" type="button" onClick={() => void popupStore.reload()}>Retry</button>
      </>
    )
  }

  const {inspection, selection} = state
  return (
    <>
      <h2 className="video-title">{inspection.video.title}</h2>
      {inspection.tracks.length === 0 ? (
        <p className="caption-count" role="status">YouTube lists no caption tracks for this video.</p>
      ) : (
        <label className="language-field">
          <span>Language</span>
          <select value={selection.status === 'none' ? '' : selection.trackId}
            onChange={(event) => void popupStore.selectLanguage(event.target.value)}>
            {inspection.tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.label} · {track.kind === 'auto' ? 'Auto-generated' : 'Manual'}
              </option>
            ))}
          </select>
        </label>
      )}
      <TranscriptStatus selection={selection} />
    </>
  )
}

function TranscriptStatus({selection}: {selection: TranscriptSelection}) {
  if (selection.status === 'none') return null
  if (selection.status === 'loading') {
    return <p className="status-message" role="status">Loading transcript…</p>
  }
  if (selection.status === 'ready') {
    return (
      <>
        <p className="caption-count" role="status">Transcript ready · {selection.transcript.cues.length} segments</p>
        <p className="transcript-preview">
          {selection.transcript.cues.slice(0, 3).map((cue) => cue.text).join(' ').slice(0, 400)}
        </p>
      </>
    )
  }
  return (
    <>
      <p className="error-message" role="alert">{ERROR_MESSAGES[selection.code]}</p>
      <button className="retry-button" type="button"
        onClick={() => void popupStore.selectLanguage(selection.trackId)}>Retry transcript</button>
      <button className="retry-button" type="button" onClick={() => void popupStore.reload()}>Refresh details</button>
    </>
  )
}
