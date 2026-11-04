export const PAGE_STYLES = `
:host { display: inline-flex; margin-left: 8px; font: 14px Roboto, Arial, sans-serif; color: var(--yt-spec-text-primary, #0f0f0f); color-scheme: light; }
:host([dark]) { color-scheme: dark; }
* { box-sizing: border-box; }
button, select, input { font: inherit; }
button { cursor: pointer; border: 0; border-radius: 20px; padding: 9px 16px; color: inherit; background: var(--yt-spec-badge-chip-background, #eee); font-weight: 500; }
button:hover:not(:disabled) { background: var(--yt-spec-button-chip-background-hover, #ddd); }
button:disabled, select:disabled { opacity: .5; cursor: default; }
:focus-visible { outline: 2px solid var(--yt-spec-call-to-action, #065fd4); outline-offset: 3px; }
.split-button { display: inline-flex; align-items: stretch; border-radius: 20px; background: #fff; color: #0f0f0f; white-space: nowrap; }
.split-button button { background: transparent; }
.split-button button:hover:not(:disabled) { background: #f2f2f7; }
#quick-download { border-radius: 20px 0 0 20px; }
#open { position: relative; border-radius: 0 20px 20px 0; padding: 5px 12px; font-size: 22px; line-height: 1; }
#open::before { content: ''; position: absolute; left: 0; top: 25%; height: 50%; width: 1px; background: currentColor; opacity: .25; }
#start { border-radius: 20px 0 0 20px; }
#menu { position: relative; border-radius: 0 20px 20px 0; padding: 5px 12px; font-size: 22px; line-height: 1; }
#menu::before { content: ''; position: absolute; left: 0; top: 25%; height: 50%; width: 1px; background: currentColor; opacity: .25; }
[popover] { --bg: light-dark(#f2f2f7, #000); --surface: light-dark(#fff, #1c1c1e); --text: light-dark(#000, #fff); --muted: light-dark(#636366, #98989d); --border: light-dark(#e5e5ea, #38383a); --control: light-dark(#e9e9eb, #39393d); --control-hover: light-dark(#d1d1d6, #48484a); --blue: light-dark(#065fd4, #3ea6ff); --primary: light-dark(#d70000, #ff453a); --primary-hover: light-dark(#b50000, #ff6961); --primary-text: light-dark(#fff, #000); position: fixed; inset: auto; margin: 0; width: 328px; max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); overflow-y: auto; overscroll-behavior: contain; padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: var(--bg); color: var(--text); box-shadow: 0 8px 30px #0003; }
[popover] button { background: var(--control); }
[popover] button:hover:not(:disabled) { background: var(--control-hover); }
[popover] :focus-visible { outline-color: var(--blue); }
header { display: flex; align-items: center; gap: 8px; }
header strong { flex: 1; }
header label { flex: 1; min-width: 0; margin-top: 0; margin-bottom: 0; }
header button { flex: 0 0 28px; padding: 4px; font-size: 20px; }
[popover] header button { background: transparent; color: var(--muted); }
label { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0; }
select { min-width: 0; max-width: 205px; padding: 7px; border: 1px solid var(--border); border-radius: 8px; color: inherit; background: var(--surface); }
input[role=switch] { appearance: none; position: relative; flex: 0 0 40px; width: 40px; height: 24px; margin: 0; border: 0; border-radius: 24px; background: var(--control); cursor: pointer; }
input[role=switch]::before { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #0003; }
input[role=switch]:checked { background: var(--blue); }
input[role=switch]:checked::before { transform: translateX(16px); }
input[role=switch]:disabled { opacity: .45; cursor: default; }
details { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px; }
summary { cursor: pointer; color: var(--blue); font-size: 12px; font-weight: 500; }
.preferred-language { align-items: stretch; flex-direction: column; gap: 8px; }
.preferred-language select { max-width: none; width: 100%; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
.actions button { flex: 1; }
[popover] .primary { color: var(--primary-text); background: var(--primary); }
[popover] .primary:hover:not(:disabled) { background: var(--primary-hover); }
p { margin: 10px 0; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; color: var(--muted); }
[role=alert] { color: light-dark(#c62828, #ff8a80); }
.recovery { display: flex; gap: 8px; }
.recovery button { padding: 6px 10px; font-size: 12px; }
progress { width: 100%; height: 8px; accent-color: var(--blue); }
.queue-jobs { list-style: none; padding: 0; margin: 12px 0; max-height: 220px; overflow-y: auto; overscroll-behavior: contain; }
.queue-jobs li { padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
[hidden] { display: none !important; }
`
