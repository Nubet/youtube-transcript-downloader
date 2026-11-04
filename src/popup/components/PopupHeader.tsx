export type PopupView = 'video' | 'settings' | 'queue'

export default function PopupHeader({view, onViewChange, refreshing, onRefresh}: {
  view: PopupView
  onViewChange: (view: PopupView) => void
  refreshing: boolean
  onRefresh: () => void
}) {
  const settingsOpen = view === 'settings'
  const queueOpen = view === 'queue'
  const titles = {video: 'YouTube Transcript', settings: 'Settings', queue: 'Downloads'}
  return <header className="popup-header">
    <h1 id="popup-title">{titles[view]}</h1>
    <div className="header-actions">
      {view === 'video' && <button type="button" className="icon-button" aria-label="Refresh video" title="Refresh video"
        disabled={refreshing} onClick={onRefresh}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 11.5-1L20 9M4 15l2.5 3A7 7 0 0 0 18 17" />
        </svg>
      </button>}
      <button type="button" className="icon-button" aria-label={queueOpen ? 'Close downloads' : 'Downloads'} title="Downloads"
        aria-expanded={queueOpen} aria-controls="download-queue" onClick={() => onViewChange(queueOpen ? 'video' : 'queue')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
        </svg>
      </button>
      <button type="button" className="icon-button" aria-label={settingsOpen ? 'Close settings' : 'Settings'}
        title={settingsOpen ? 'Close settings' : 'Settings'} aria-expanded={settingsOpen}
        aria-controls="preferences" onClick={() => onViewChange(settingsOpen ? 'video' : 'settings')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {settingsOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <>
            <path d="m9 3-.6 2.4-2 .9L4 5.6 2 9l1.8 1.7v2.6L2 15l2 3.4 2.4-.7 2 .9L9 21h6l.6-2.4 2-.9 2.4.7 2-3.4-1.8-1.7v-2.6L22 9l-2-3.4-2.4.7-2-.9L15 3Z" /><circle cx="12" cy="12" r="3" />
          </>}
        </svg>
      </button>
    </div>
  </header>
}
