export type PlaylistVideo = {videoId: string | null; title: string; position: number}
export type Playlist = {id: string; title: string; videos: PlaylistVideo[]}

export function isPlaylistId(value: unknown): value is string {
  return typeof value === 'string' && /^[\w-]{2,150}$/u.test(value)
}

export function getPlaylistId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const id = parsed.searchParams.get('list')
    return parsed.origin === 'https://www.youtube.com' &&
      ['/playlist', '/watch'].includes(parsed.pathname) && isPlaylistId(id) ? id : null
  } catch { return null }
}
