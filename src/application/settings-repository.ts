import type {ExtensionSettings} from '../domain/settings/extension-settings.ts'

export type SettingsRepository = {
  read: () => Promise<ExtensionSettings>
  write: (patch: Partial<ExtensionSettings>) => Promise<void>
  subscribe: (listener: (patch: Partial<ExtensionSettings>) => void) => () => void
}
