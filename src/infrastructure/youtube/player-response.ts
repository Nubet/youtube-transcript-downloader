import {isVideoId, VideoInspectionError, type CaptionTrack, type VideoInspection} from '../../domain/video.ts'
import {isRecord} from '../../shared/is-record.ts'

type DiscoveredTrack = CaptionTrack & {readonly baseUrl: string}

export type PlayerPage = {
  video: VideoInspection['video']
  tracks: readonly DiscoveredTrack[]
}

export function parsePlayerPage(html: string, expectedVideoId: string): PlayerPage {
  const data = extractPlayerResponse(html)
  if (!isRecord(data) || !isRecord(data.playabilityStatus)) {
    throw new VideoInspectionError('page-data')
  }

  const status = data.playabilityStatus.status
  if (typeof status !== 'string') throw new VideoInspectionError('page-data')
  if (status !== 'OK') throw new VideoInspectionError('unavailable')

  const details = data.videoDetails
  if (!isRecord(details) || !isVideoId(details.videoId) ||
    typeof details.title !== 'string' || !details.title.trim()) {
    throw new VideoInspectionError('page-data')
  }
  if (details.videoId !== expectedVideoId) throw new VideoInspectionError('video-changed')

  const seconds = typeof details.lengthSeconds === 'string' && /^\d+$/u.test(details.lengthSeconds)
    ? Number(details.lengthSeconds) : NaN
  const durationMs = Number.isSafeInteger(seconds * 1_000) && seconds > 0 ? seconds * 1_000 : null
  const video = {videoId: details.videoId, title: details.title.trim(), durationMs}
  if (data.captions === undefined) return {video, tracks: []}

  if (!isRecord(data.captions) || !isRecord(data.captions.playerCaptionsTracklistRenderer)) {
    throw new VideoInspectionError('page-data')
  }
  const tracks = data.captions.playerCaptionsTracklistRenderer.captionTracks
  if (!Array.isArray(tracks)) throw new VideoInspectionError('page-data')

  return {video, tracks: tracks.map((track: unknown, index) => parseTrack(track, index, expectedVideoId))}
}

function parseTrack(value: unknown, index: number, videoId: string): DiscoveredTrack {
  if (!isRecord(value) || typeof value.languageCode !== 'string' ||
    value.languageCode.length > 63 || !/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/iu.test(value.languageCode) ||
    typeof value.baseUrl !== 'string' ||
    (value.kind !== undefined && value.kind !== 'asr' && value.kind !== '')) {
    throw new VideoInspectionError('page-data')
  }

  let url: URL
  try {
    url = new URL(value.baseUrl)
  } catch {
    throw new VideoInspectionError('page-data')
  }
  if (url.origin !== 'https://www.youtube.com' || url.username || url.password ||
    url.pathname !== '/api/timedtext' || url.searchParams.get('v') !== videoId) {
    throw new VideoInspectionError('page-data')
  }

  const kind = value.kind === 'asr' ? 'auto' : 'manual'
  const vssId = typeof value.vssId === 'string' ? value.vssId : `${value.languageCode}:${kind}`
  return {
    id: `${vssId}:${index}`,
    languageCode: value.languageCode,
    label: trackLabel(value.name, value.languageCode),
    kind,
    baseUrl: url.href,
  }
}

function trackLabel(name: unknown, languageCode: string): string {
  if (isRecord(name)) {
    if (typeof name.simpleText === 'string' && name.simpleText.trim()) return name.simpleText.trim()
    if (Array.isArray(name.runs)) {
      const label = name.runs.map((run: unknown) =>
        isRecord(run) && typeof run.text === 'string' ? run.text : ''
      ).join('').trim()
      if (label) return label
    }
  }

  try {
    return new Intl.DisplayNames(['en'], {type: 'language'}).of(languageCode) ?? languageCode
  } catch {
    return languageCode
  }
}

function extractPlayerResponse(html: string): unknown {
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/giu)) {
    const body = script[1] ?? ''
    const assignment = /(?:\bytInitialPlayerResponse\b|window\s*\[\s*["']ytInitialPlayerResponse["']\s*\])\s*=\s*/gu
    for (const match of body.matchAll(assignment)) {
      const start = match.index + match[0].length
      if (body[start] !== '{') continue
      let depth = 0
      let inString = false
      let escaped = false

      for (let index = start; index < body.length; index++) {
        const character = body[index]
        if (inString) {
          if (escaped) escaped = false
          else if (character === '\\') escaped = true
          else if (character === '"') inString = false
        } else if (character === '"') inString = true
        else if (character === '{') depth++
        else if (character === '}') {
          depth--
          if (depth === 0) {
            try {
              const data: unknown = JSON.parse(body.slice(start, index + 1))
              return data
            } catch {
              throw new VideoInspectionError('page-data')
            }
          }
        }
      }
    }
  }
  throw new VideoInspectionError('page-data')
}
