const pad = (value: number, length = 2) => String(value).padStart(length, '0')

export function subtitleTimestamp(ms: number, separator: ',' | '.'): string {
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor(ms / 60_000) % 60
  const seconds = Math.floor(ms / 1_000) % 60

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${separator}${pad(ms % 1_000, 3)}`
}

export function clockTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor(ms / 60_000) % 60
  const seconds = Math.floor(ms / 1_000) % 60

  return hours > 0
    ? `[${hours}:${pad(minutes)}:${pad(seconds)}]`
    : `[${pad(minutes)}:${pad(seconds)}]`
}
