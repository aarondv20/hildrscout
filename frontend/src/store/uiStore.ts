import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type Theme = 'light' | 'dark' | 'system'

export type NotificationType = 'success' | 'warning' | 'error' | 'info'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  description?: string
  createdAt: number
  read: boolean
}

const THEME_KEY = 'hildr-theme'
const MAX_NOTIFICATIONS = 100

function getSystemTheme(): 'light' | 'dark' {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved
    return 'system'
  } catch {
    return 'system'
  }
}

function applyTheme(theme: Theme, animated: boolean): void {
  const root = document.documentElement
  if (animated) {
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 250)
  }
  const resolved = theme === 'system' ? getSystemTheme() : theme
  root.classList.toggle('dark', resolved === 'dark')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // storage unavailable; theme still applies for the session
  }
}

interface UIStore {
  theme: Theme
  helpOpen: boolean
  notifications: AppNotification[]

  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  openHelp: () => void
  closeHelp: () => void
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void
}

const initialTheme = getInitialTheme()
applyTheme(initialTheme, false)

export const useUIStore = create<UIStore>()(
  immer((set) => ({
    theme: initialTheme,
    helpOpen: false,
    notifications: [],

    toggleTheme: () =>
      set((state) => {
        const next: Theme = state.theme === 'dark' ? 'light' : 'dark'
        applyTheme(next, true)
        state.theme = next
      }),

    setTheme: (theme) =>
      set((state) => {
        applyTheme(theme, true)
        state.theme = theme
      }),

    openHelp: () =>
      set((state) => {
        state.helpOpen = true
      }),

    closeHelp: () =>
      set((state) => {
        state.helpOpen = false
      }),

    pushNotification: (n) =>
      set((state) => {
        const notification: AppNotification = {
          ...n,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: Date.now(),
          read: false,
        }
        state.notifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS)
      }),

    markAllNotificationsRead: () =>
      set((state) => {
        state.notifications.forEach((n) => {
          n.read = true
        })
      }),

    clearNotifications: () =>
      set((state) => {
        state.notifications = []
      }),
  })),
)
