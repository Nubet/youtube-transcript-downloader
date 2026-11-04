import type {BatchSettings, DownloadBatch, DownloadJob, DownloadQueueState, QueueCommand} from '../domain/download-queue.ts'
import type {PlaylistSource} from './playlist-source.ts'
import type {Transcript} from '../domain/transcript.ts'
import {VideoInspectionError} from '../domain/video.ts'
import {prepareExport, type TranscriptExport} from './prepare-export.ts'

export type DownloadRecord = {id: number; state: 'in_progress' | 'complete' | 'interrupted'}
export type QueueDependencies = {
  load: () => Promise<DownloadQueueState>
  save: (state: DownloadQueueState) => Promise<void>
  playlist: PlaylistSource
  transcript: (videoId: string, settings: BatchSettings, signal: AbortSignal) => Promise<Transcript>
  download: (file: TranscriptExport, filename: string) => Promise<number>
  lookup: (job: DownloadJob) => Promise<DownloadRecord | null>
  cancelDownload: (id: number) => Promise<void>
  now: () => number
}

export async function createDownloadQueue(dependencies: QueueDependencies) {
  const state = await dependencies.load()
  let writes = Promise.resolve()
  let running: Promise<void> | null = null
  let wakeAgain = false
  let active: {batchId: string; controller: AbortController} | null = null
  let storageError: Error | null = null

  function change(update: () => void) {
    const result = writes.then(async () => {
      if (storageError) throw storageError
      update()
      try { await dependencies.save(structuredClone(state)) }
      catch (error) {
        storageError = error instanceof Error ? error : new Error('Queue could not be saved')
        throw storageError
      }
    })
    writes = result.catch(() => {})
    return result
  }

  async function reconcile() {
    for (const batch of state.batches) for (const job of batch.jobs) {
      if (job.status !== 'downloading') continue
      const record = await dependencies.lookup(job)
      if (record?.state === 'in_progress') return true
      await change(() => {
        job.downloadId = record?.id ?? job.downloadId
        job.status = record?.state === 'complete' ? 'completed' : 'failed'
        job.error = record?.state === 'complete' ? null : record ? 'download-interrupted' : 'download-uncertain'
      })
    }
    return false
  }

  async function processBatch(batch: DownloadBatch, signal: AbortSignal) {
    if (!batch.jobs.length && batch.status === 'reading') {
      try {
        const playlist = await dependencies.playlist(batch.playlistId, signal)
        if (signal.aborted) return
        await change(() => {
          batch.title = playlist.title
          batch.jobs = playlist.videos.map((video) => ({...video, id: crypto.randomUUID(),
            status: video.videoId ? 'pending' : 'skipped', attempts: 0, retryAt: null,
            error: video.videoId ? null : 'unavailable', downloadId: null, filename: null, languageCode: null}))
          if (batch.status === 'reading') batch.status = 'queued'
        })
      } catch (error) {
        if (!signal.aborted) await change(() => {
          batch.status = 'error'
          batch.error = error instanceof VideoInspectionError ? error.code : 'playlist-unavailable'
        })
      }
      return
    }
    const job = batch.jobs.find((item) => item.status === 'pending')
    if (!job) { await change(() => { batch.status = 'finished' }); return }
    if (job.retryAt !== null && job.retryAt > dependencies.now()) return
    await change(() => { batch.status = 'running'; job.status = 'loading'; job.attempts++; job.error = null; job.retryAt = null })
    try {
      if (!job.videoId) throw new VideoInspectionError('unavailable')
      const transcript = await dependencies.transcript(job.videoId, batch.settings, signal)
      if (signal.aborted) return
      if (transcript.videoId !== job.videoId) throw new VideoInspectionError('invalid-transcript')
      const settings = batch.settings
      const file = prepareExport(transcript, settings.format === 'txt' ? {format: 'txt',
        includeTimestamps: settings.includeTimestamps, includeTitle: settings.includeTitle, includeLink: settings.includeLink} : {format: settings.format})
      const filename = `YouTube transcripts/${batch.id}/${String(job.position).padStart(4, '0')}-${file.filename}`
      await change(() => { job.status = 'downloading'; job.filename = filename; job.languageCode = transcript.languageCode })
      if (signal.aborted) return
      const id = await dependencies.download(file, filename)
      await change(() => { job.downloadId = id })
      if (signal.aborted) await dependencies.cancelDownload(id)
    } catch (error) {
      if (signal.aborted) return
      await change(() => {
        const code = error instanceof VideoInspectionError ? error.code : 'download-failed'
        const http = error instanceof VideoInspectionError ? error.httpStatus : null
        const retryable = code === 'timeout' || (code === 'network' && (http === null || http === 429 || http >= 500))
        job.error = code
        if (http === 429) state.cooldownUntil = dependencies.now() + 60_000
        if (retryable && job.attempts < 2) { job.status = 'pending'; job.retryAt = dependencies.now() + 3_000 }
        else job.status = ['unavailable', 'track-unavailable'].includes(code) ? 'skipped' : 'failed'
      })
    }
  }

  async function run() {
    do {
      wakeAgain = false
      if (storageError) throw storageError
      if (await reconcile()) return
      if (state.cooldownUntil > dependencies.now()) return
      if (state.cooldownUntil) await change(() => { state.cooldownUntil = 0 })
      const batch = state.batches.find((item) => ['reading', 'queued', 'running'].includes(item.status))
      if (!batch) return
      const pending = batch.jobs.find((job) => job.status === 'pending')
      if (pending?.retryAt && pending.retryAt > dependencies.now()) return
      const controller = new AbortController()
      active = {batchId: batch.id, controller}
      try { await processBatch(batch, controller.signal) }
      finally { active = null }
    } while (true)
  }

  function wake(): Promise<void> {
    if (running) { wakeAgain = true; return running }
    running = run().finally(() => {
      running = null
      if (wakeAgain) void wake().catch(() => {})
    })
    return running
  }

  async function enqueue(playlistId: string, settings: BatchSettings) {
    let id = ''
    await change(() => {
      const existing = state.batches.find((batch) => batch.playlistId === playlistId &&
        !['finished', 'cancelled', 'error'].includes(batch.status))
      if (existing) { id = existing.id; return }
      id = crypto.randomUUID()
      state.batches.push({id, playlistId, title: 'YouTube playlist', settings: structuredClone(settings),
        status: 'reading', createdAt: dependencies.now(), jobs: [], error: null})
    })
    return id
  }

  async function command(id: string, action: QueueCommand) {
    const batch = state.batches.find((item) => item.id === id)
    if (!batch) return
    if (action === 'cancel') active?.batchId === id && active.controller.abort()
    await change(() => {
      if (action === 'pause' && ['reading', 'queued', 'running'].includes(batch.status)) batch.status = 'paused'
      if (action === 'resume' && batch.status === 'paused') batch.status = batch.jobs.length ? 'queued' : 'reading'
      if (action === 'cancel' && !['finished', 'cancelled'].includes(batch.status)) {
        batch.status = 'cancelled'
        for (const job of batch.jobs) if (['pending', 'loading', 'downloading'].includes(job.status)) job.status = 'cancelled'
      }
      if (action === 'retry' && ['finished', 'error'].includes(batch.status)) {
        for (const job of batch.jobs) if (job.status === 'failed') Object.assign(job,
          {status: 'pending', attempts: 0, retryAt: null, error: null, downloadId: null, filename: null})
        batch.status = batch.jobs.length ? 'queued' : 'reading'
        batch.error = null
      }
      if (action === 'remove' && ['finished', 'cancelled', 'error'].includes(batch.status)) {
        state.batches.splice(state.batches.indexOf(batch), 1)
      }
    })
    if (action === 'cancel') {
      await Promise.all(batch.jobs.flatMap((job) => job.status === 'cancelled' && job.downloadId !== null
        ? [dependencies.cancelDownload(job.downloadId)] : []))
    }
  }

  async function recover(pause = false) {
    await change(() => {
      for (const batch of state.batches) {
        for (const job of batch.jobs) if (job.status === 'skipped' && job.error === 'empty-transcript') job.status = 'failed'
        for (const job of batch.jobs) if (job.status === 'loading') job.status = 'pending'
        if (pause && ['reading', 'queued', 'running'].includes(batch.status)) batch.status = 'paused'
      }
    })
  }

  return {enqueue, command, wake, recover, getSnapshot: () => {
    if (storageError) throw storageError
    return structuredClone(state)
  }}
}
