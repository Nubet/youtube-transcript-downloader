import {VideoInspectionError} from '../../domain/video.ts'

export function readScriptObject(html: string, assignment: RegExp): unknown {
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/giu)) {
    const body = script[1] ?? ''
    for (const match of body.matchAll(assignment)) {
      const start = match.index + match[0].length
      if (body[start] !== '{') continue
      let depth = 0
      let quoted = false
      let escaped = false
      for (let i = start; i < body.length; i++) {
        const char = body[i]
        if (quoted) {
          if (escaped) escaped = false
          else if (char === '\\') escaped = true
          else if (char === '"') quoted = false
        } else if (char === '"') quoted = true
        else if (char === '{') depth++
        else if (char === '}' && --depth === 0) {
          try { return JSON.parse(body.slice(start, i + 1)) }
          catch { break }
        }
      }
    }
  }
  throw new VideoInspectionError('page-data')
}
