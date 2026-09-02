import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SettingsValues {
  // ── General
  appName: string
  defaultLocation: string
  defaultRadius: number
  defaultMaxResults: number
  defaultOutputFormat: 'excel' | 'csv' | 'json'

  // ── Scraper Engine
  maxConcurrentEnrichments: number
  websiteTimeoutSecs: number
  headlessMode: boolean
  scrollSteps: number

  // ── Proxy & Network
  proxyEnabled: boolean
  proxyProtocol: 'http' | 'socks5'
  proxyHost: string
  proxyPort: string
  proxyUsername: string
  proxyPassword: string

  // ── Export
  exportFilenamePrefix: string
  autoExportOnCompletion: boolean

  // ── Notifications
  notifyOnBusinessFound: boolean
  notifyOnEmailFound: boolean
  notifyOnCompletion: boolean
  webhookUrl: string

  // ── Data Management
  maxSessionsRetained: number
}

export const DEFAULT_SETTINGS: SettingsValues = {
  appName: 'Hildr Scout',
  defaultLocation: '',
  defaultRadius: 10,
  defaultMaxResults: 100,
  defaultOutputFormat: 'excel',

  maxConcurrentEnrichments: 5,
  websiteTimeoutSecs: 30,
  headlessMode: true,
  scrollSteps: 12,

  proxyEnabled: false,
  proxyProtocol: 'http',
  proxyHost: '',
  proxyPort: '',
  proxyUsername: '',
  proxyPassword: '',

  exportFilenamePrefix: 'hildr_leads',
  autoExportOnCompletion: false,

  notifyOnBusinessFound: true,
  notifyOnEmailFound: true,
  notifyOnCompletion: true,
  webhookUrl: '',

  maxSessionsRetained: 50,
}

// ─── Store ────────────────────────────────────────────────────────────────────

export interface SettingsStore extends SettingsValues {
  updateSettings: (patch: Partial<SettingsValues>) => void
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (patch) =>
        set((state) => {
          Object.assign(state, patch)
        }),

      resetSettings: () =>
        set((state) => {
          Object.assign(state, DEFAULT_SETTINGS)
        }),
    })),
    { name: 'hildr-settings' },
  ),
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a proxy URL string from settings, or null if proxy is disabled. */
export function buildProxyUrl(
  s: Pick<SettingsStore, 'proxyEnabled' | 'proxyProtocol' | 'proxyHost' | 'proxyPort' | 'proxyUsername' | 'proxyPassword'>
): string | null {
  if (!s.proxyEnabled || !s.proxyHost) return null
  const auth = s.proxyUsername
    ? `${encodeURIComponent(s.proxyUsername)}:${encodeURIComponent(s.proxyPassword)}@`
    : ''
  const port = s.proxyPort ? `:${s.proxyPort}` : ''
  return `${s.proxyProtocol}://${auth}${s.proxyHost}${port}`
}
