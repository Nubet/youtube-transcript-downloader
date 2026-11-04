import type {SettingsRepository} from '../application/settings-repository.ts'
import {DEFAULT_SETTINGS, parseSettings, type ExtensionSettings} from '../domain/settings/extension-settings.ts'

type SettingsState = {
  settings: ExtensionSettings
  status: 'loading' | 'ready' | 'saving' | 'read-error' | 'write-error'
}

export function createSettingsStore(repository: SettingsRepository) {
  let snapshot: SettingsState = {settings: DEFAULT_SETTINGS, status: 'loading'}
  let initialization: Promise<ExtensionSettings> | null = null
  let stop: (() => void) | null = null
  let changesDuringRead: Partial<ExtensionSettings> = {}
  let queue = Promise.resolve()
  let pendingWrites = 0
  let readRevision = 0
  const listeners = new Set<() => void>()

  function publish(state: SettingsState) {
    snapshot = state
    listeners.forEach((listener) => listener())
  }

  function listen() {
    stop ??= repository.subscribe((patch) => {
      changesDuringRead = {...changesDuringRead, ...patch}
      publish({...snapshot, settings: parseSettings({...snapshot.settings, ...patch})})
    })
  }

  function load(): Promise<ExtensionSettings> {
    if (initialization) return initialization
    listen()
    const revision = ++readRevision
    changesDuringRead = {}
    publish({...snapshot, status: 'loading'})
    initialization = repository.read().then((settings) => {
      if (revision === readRevision) publish({settings: parseSettings({...settings, ...changesDuringRead}), status: 'ready'})
      return snapshot.settings
    }, () => {
      if (revision === readRevision) publish({...snapshot, status: 'read-error'})
      return snapshot.settings
    }).finally(() => {
      if (revision === readRevision && listeners.size === 0) { stop?.(); stop = null }
    })
    return initialization
  }

  function update(patch: Partial<ExtensionSettings>) {
    pendingWrites++
    publish({...snapshot, status: 'saving'})
    queue = queue.then(async () => {
      try {
        await repository.write(patch)
        publish({settings: parseSettings({...snapshot.settings, ...patch}), status: pendingWrites > 1 ? 'saving' : 'ready'})
      } catch {
        publish({...snapshot, status: pendingWrites > 1 ? 'saving' : 'write-error'})
      } finally {
        pendingWrites--
      }
    })
    return queue
  }

  return {
    getSnapshot: () => snapshot,
    load: async () => { await load(); return snapshot.settings },
    update,
    retry: () => { initialization = null; return load() },
    subscribe(listener: () => void) {
      listeners.add(listener)
      listen()
      void load()
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          stop?.()
          stop = null
          initialization = null
          readRevision++
        }
      }
    },
  }
}
