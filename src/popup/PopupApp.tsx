export default function PopupApp() {
  return (
    <main className="popup" aria-labelledby="popup-title">
      <header className="popup-header">
        <span className="brand-mark" aria-hidden="true">[t]</span>
        <span className="eyebrow">YouTube tools</span>
      </header>

      <h1 id="popup-title">Transcript<br />Downloader<span className="accent">.</span></h1>
      <p className="intro">From video to words.</p>

      <section className="setup-note" aria-labelledby="setup-title">
        <h2 id="setup-title">Setup complete</h2>
        <p>Transcript downloads and copying are coming next.</p>
      </section>

      <footer className="popup-footer">
        <span>TXT / SRT / VTT</span>
        <span>v{chrome.runtime.getManifest().version}</span>
      </footer>
    </main>
  )
}
