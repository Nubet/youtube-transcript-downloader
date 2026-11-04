import type {PlaylistSource} from '../../application/playlist-source.ts'
import {isPlaylistId, type PlaylistVideo} from '../../domain/playlist.ts'
import {isVideoId, VideoInspectionError} from '../../domain/video.ts'
import {isRecord} from '../../shared/is-record.ts'
import {readScriptObject} from './script-data.ts'
import {fetchYouTubeText} from './youtube-request.ts'

function find(value: unknown, key: string): unknown {
  if (Array.isArray(value)) {
    for (const item of value) { const result = find(item, key); if (result !== undefined) return result }
  } else if (isRecord(value)) {
    if (key in value) return value[key]
    for (const item of Object.values(value)) { const result = find(item, key); if (result !== undefined) return result }
  }
  return undefined
}

function text(value: unknown): string {
  if (!isRecord(value)) return ''
  if (typeof value.simpleText === 'string') return value.simpleText
  return Array.isArray(value.runs) ? value.runs.map((run: unknown) => isRecord(run) && typeof run.text === 'string' ? run.text : '').join('') : ''
}

export function parsePlaylistItems(items: unknown, offset: number) {
  if (!Array.isArray(items)) throw new VideoInspectionError('page-data')
  const videos: PlaylistVideo[] = []
  let continuation: string | null = null
  for (const item of items) {
    if (!isRecord(item)) throw new VideoInspectionError('page-data')
    if (isRecord(item.playlistVideoRenderer)) {
      const video = item.playlistVideoRenderer
      videos.push({videoId: isVideoId(video.videoId) && video.isPlayable !== false ? video.videoId : null,
        title: text(video.title) || 'Unavailable video', position: offset + videos.length + 1})
    } else if ('continuationItemRenderer' in item) {
      const command = find(item.continuationItemRenderer, 'continuationCommand')
      if (!isRecord(command) || typeof command.token !== 'string' || !command.token) throw new VideoInspectionError('page-data')
      continuation = command.token
    }
  }
  return {videos, continuation}
}

export const loadPlaylist: PlaylistSource = async (id, signal) => {
  if (!isPlaylistId(id)) throw new VideoInspectionError('page-data')
  const html = await fetchYouTubeText(`https://www.youtube.com/playlist?list=${encodeURIComponent(id)}&hl=en`, signal)
  const data = readScriptObject(html, /(?:\bytInitialData\b|window\s*\[\s*["']ytInitialData["']\s*\])\s*=\s*/gu)
  const list = find(data, 'playlistVideoListRenderer')
  if (!isRecord(list)) throw new VideoInspectionError('unavailable')
  if (typeof list.playlistId === 'string' && list.playlistId !== id) throw new VideoInspectionError('page-data')
  const metadata = find(data, 'playlistMetadataRenderer')
  const title = isRecord(metadata) && typeof metadata.title === 'string' ? metadata.title : 'YouTube playlist'
  let page = parsePlaylistItems(list.contents, 0)
  const videos = [...page.videos]
  const tokens = new Set<string>()
  if (page.continuation) {
    const config = readScriptObject(html, /\bytcfg\.set\(\s*/gu)
    if (!isRecord(config) || !isRecord(config.INNERTUBE_CONTEXT)) throw new VideoInspectionError('page-data')
    while (page.continuation) {
      if (signal.aborted) throw new VideoInspectionError('cancelled')
      if (tokens.has(page.continuation)) throw new VideoInspectionError('page-data')
      tokens.add(page.continuation)
      const url = new URL('https://www.youtube.com/youtubei/v1/browse')
      if (typeof config.INNERTUBE_API_KEY === 'string') url.searchParams.set('key', config.INNERTUBE_API_KEY)
      const body = await fetchYouTubeText(url, signal, {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({context: config.INNERTUBE_CONTEXT, continuation: page.continuation})})
      let response: unknown
      try { response = JSON.parse(body) } catch { throw new VideoInspectionError('page-data') }
      const append = find(response, 'appendContinuationItemsAction')
      const continued = find(response, 'playlistVideoListContinuation')
      const items = isRecord(append) ? append.continuationItems : isRecord(continued) ? continued.contents : undefined
      page = parsePlaylistItems(items, videos.length)
      videos.push(...page.videos)
    }
  }
  if (signal.aborted) throw new VideoInspectionError('cancelled')
  return {id, title, videos}
}
