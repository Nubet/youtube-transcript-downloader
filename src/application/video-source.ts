import type {VideoInspection} from '../domain/video.ts'

export type VideoSource = (videoId: string, signal: AbortSignal) => Promise<VideoInspection>
