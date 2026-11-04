export const PAGE_STYLES = `
:host { display: inline-flex; margin-left: 8px; font: 14px Roboto, Arial, sans-serif; color: var(--yt-spec-text-primary, #0f0f0f); color-scheme: light; }
:host([dark]) { color-scheme: dark; }
* { box-sizing: border-box; }
button, select, input { font: inherit; }
button { cursor: pointer; border: 0; border-radius: 20px; padding: 9px 16px; color: inherit; background: var(--yt-spec-badge-chip-background, #eee); font-weight: 500; }
button:hover:not(:disabled) { background: var(--yt-spec-button-chip-background-hover, #ddd); }
button:disabled, select:disabled { opacity: .5; cursor: default; }
:focus-visible { outline: 2px solid var(--yt-spec-call-to-action, #065fd4); outline-offset: 3px; }
.split-button { display: inline-flex; align-items: stretch; border-radius: 20px; background: var(--yt-spec-badge-chip-background, #eee); white-space: nowrap; }
.split-button button { background: transparent; }
#quick-download { border-radius: 20px 0 0 20px; }
#open { position: relative; border-radius: 0 20px 20px 0; padding: 5px 12px; font-size: 22px; line-height: 1; }
#open::before { content: ''; position: absolute; left: 0; top: 25%; height: 50%; width: 1px; background: currentColor; opacity: .25; }
[popover] { position: fixed; inset: auto; margin: 0; width: 328px; max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); overflow-y: auto; overscroll-behavior: contain; padding: 16px; border: 1px solid var(--yt-spec-10-percent-layer, #ddd); border-radius: 16px; background: var(--yt-spec-raised-background, #fff); color: var(--yt-spec-text-primary, #0f0f0f); box-shadow: 0 8px 30px #0003; }
header { display: flex; align-items: center; gap: 8px; }
header label { flex: 1; min-width: 0; margin-top: 0; margin-bottom: 0; }
header button { flex: 0 0 28px; padding: 4px; font-size: 20px; background: transparent; }
label { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0; }
select { min-width: 0; max-width: 205px; padding: 7px; border: 1px solid var(--yt-spec-10-percent-layer, #ccc); border-radius: 8px; color: inherit; background: var(--yt-spec-base-background, #fff); }
input[role=switch] { appearance: none; position: relative; flex: 0 0 40px; width: 40px; height: 24px; margin: 0; border: 0; border-radius: 24px; background: light-dark(#e9e9eb, #39393d); cursor: pointer; }
input[role=switch]::before { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #0003; }
input[role=switch]:checked { background: light-dark(#065fd4, #3ea6ff); }
input[role=switch]:checked::before { transform: translateX(16px); }
input[role=switch]:disabled { opacity: .45; cursor: default; }
details { margin-top: 12px; border-top: 1px solid var(--yt-spec-10-percent-layer, #ddd); padding-top: 12px; }
summary { cursor: pointer; color: var(--yt-spec-call-to-action, #065fd4); font-size: 12px; font-weight: 500; }
.preferred-language { align-items: stretch; flex-direction: column; gap: 8px; }
.preferred-language select { max-width: none; width: 100%; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
.actions button { flex: 1; }
.primary { color: var(--yt-spec-text-primary-inverse, #fff); background: var(--yt-spec-text-primary, #0f0f0f); }
.primary:hover:not(:disabled) { opacity: .85; background: var(--yt-spec-text-primary, #0f0f0f); }
p { margin: 10px 0; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
[role=alert] { color: light-dark(#b3261e, #ffb4ab); }
.recovery { display: flex; gap: 8px; }
.recovery button { padding: 6px 10px; font-size: 12px; }
[hidden] { display: none !important; }
`
