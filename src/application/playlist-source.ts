import type {Playlist} from '../domain/playlist.ts'

export type PlaylistSource = (id: string, signal: AbortSignal) => Promise<Playlist>
