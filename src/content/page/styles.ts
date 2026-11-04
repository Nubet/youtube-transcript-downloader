export const PAGE_STYLES = `
:host { display: inline-flex; margin-left: 8px; font: 14px Roboto, Arial, sans-serif; color: var(--yt-spec-text-primary, #0f0f0f); color-scheme: light; }
:host([dark]) { color-scheme: dark; }
* { box-sizing: border-box; }
button, select, input { font: inherit; }
button { cursor: pointer; border: 0; border-radius: 20px; padding: 9px 16px; color: inherit; background: var(--yt-spec-badge-chip-background, #eee); font-weight: 500; }
button:hover:not(:disabled) { background: var(--yt-spec-button-chip-background-hover, #ddd); }
button:disabled, select:disabled { opacity: .5; cursor: default; }
:focus-visible { outline: 2px solid var(--yt-spec-call-to-action, #065fd4); outline-offset: 3px; }
[popover] { position: fixed; margin: 0; width: 328px; max-width: calc(100vw - 24px); max-height: calc(100vh - 24px); overflow: auto; padding: 16px; border: 1px solid var(--yt-spec-10-percent-layer, #ddd); border-radius: 16px; background: var(--yt-spec-raised-background, #fff); color: var(--yt-spec-text-primary, #0f0f0f); box-shadow: 0 8px 30px #0003; }
header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 14px; }
h2 { font-size: 16px; margin: 0; }
header button { padding: 4px 10px; font-size: 20px; background: transparent; }
label { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0; }
select { min-width: 0; max-width: 205px; padding: 7px; border: 1px solid var(--yt-spec-10-percent-layer, #ccc); border-radius: 8px; color: inherit; background: var(--yt-spec-base-background, #fff); }
input { accent-color: var(--yt-spec-call-to-action, #065fd4); }
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
