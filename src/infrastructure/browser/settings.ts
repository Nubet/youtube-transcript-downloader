import type {SettingsRepository} from '../../application/settings-repository.ts'
import {DEFAULT_SETTINGS, parseSettings, type ExtensionSettings} from '../../domain/settings/extension-settings.ts'

export const browserSettings: SettingsRepository = {
  read: () => new Promise((resolve, reject) => {
    chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (values) => {
      try {
        const error = chrome.runtime.lastError
        if (error) reject(new Error(error.message))
        else resolve(parseSettings(values))
      } catch (error) { reject(error) }
    })
  }),
  write: (patch) => new Promise((resolve, reject) => {
    const valid = parseSettings(patch)
    const values = Object.fromEntries(Object.keys(DEFAULT_SETTINGS)
      .filter((key) => Object.hasOwn(patch, key))
      .map((key) => [key, valid[key as keyof ExtensionSettings]]))
    chrome.storage.local.set(values, () => {
      try {
        const error = chrome.runtime.lastError
        if (error) reject(new Error(error.message))
        else resolve()
      } catch (error) { reject(error) }
    })
  }),
  subscribe(listener) {
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return
      const values: Record<string, unknown> = {}
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (Object.hasOwn(changes, key)) values[key] = changes[key]?.newValue
      }
      if (Object.keys(values).length === 0) return
      const valid = parseSettings(values)
      const patch = Object.fromEntries(Object.keys(values).map((key) => [key, valid[key as keyof ExtensionSettings]]))
      listener(patch)
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  },
}
