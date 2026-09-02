import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import type { Business } from '../types'

// ─── Shape ────────────────────────────────────────────────────────────────────

export interface SearchSession {
  /** Same as jobId — used as the row key throughout the UI. */
  id: string
  jobId: string
  keyword: string
  location: string
  radius_km: number
  max_results: number
  output_format: string
  startedAt: string
  completedAt?: string | null
  leadCount: number
  emailCount: number
  phoneCount: number
  status: 'running' | 'completed' | 'stopped' | 'error'
  topBusinesses: Array<{
    name: string
    phone?: string | null
    email?: string | null
    website?: string | null
  }>
}

export interface ExportRecord {
  id: string
  jobId: string
  keyword: string
  location: string
  format: string
  filename: string
  exportedAt: string
  leadCount: number
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface HistoryStore {
  sessions: SearchSession[]
  exports: ExportRecord[]
  /** Lead snapshots keyed by jobId. Capped at MAX_LEADS_PER_SESSION entries. */
  leads: Record<string, Business[]>

  startSession: (session: Omit<SearchSession, 'topBusinesses' | 'completedAt'>) => void
  finalizeSession: (
    jobId: string,
    update: {
      status: SearchSession['status']
      leadCount: number
      emailCount: number
      phoneCount: number
      completedAt: string
      leads: Business[]
      topBusinesses: SearchSession['topBusinesses']
    },
  ) => void
  addExport: (record: Omit<ExportRecord, 'id'>) => void
  deleteSession: (id: string) => void
  deleteExport: (id: string) => void
}

const MAX_SESSIONS = 50
const MAX_LEADS_PER_SESSION = 200

export const useHistoryStore = create<HistoryStore>()(
  persist(
    immer((set) => ({
      sessions: [],
      exports: [],
      leads: {},

      startSession: (session) =>
        set((state) => {
          // Deduplicate: remove any stale entry with the same jobId
          state.sessions = state.sessions.filter((s) => s.jobId !== session.jobId)
          state.sessions.unshift({ ...session, topBusinesses: [] })
          if (state.sessions.length > MAX_SESSIONS) {
            const removed = state.sessions.splice(MAX_SESSIONS)
            removed.forEach((s) => {
              delete state.leads[s.jobId]
            })
          }
        }),

      finalizeSession: (jobId, update) =>
        set((state) => {
          const idx = state.sessions.findIndex((s) => s.jobId === jobId)
          if (idx !== -1) {
            Object.assign(state.sessions[idx], {
              status: update.status,
              leadCount: update.leadCount,
              emailCount: update.emailCount,
              phoneCount: update.phoneCount,
              completedAt: update.completedAt,
              topBusinesses: update.topBusinesses,
            })
          }
          state.leads[jobId] = update.leads.slice(0, MAX_LEADS_PER_SESSION)
        }),

      addExport: (record) =>
        set((state) => {
          state.exports.unshift({
            ...record,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          })
        }),

      deleteSession: (id) =>
        set((state) => {
          const session = state.sessions.find((s) => s.id === id)
          if (session) delete state.leads[session.jobId]
          state.sessions = state.sessions.filter((s) => s.id !== id)
        }),

      deleteExport: (id) =>
        set((state) => {
          state.exports = state.exports.filter((e) => e.id !== id)
        }),
    })),
    { name: 'hildr-history' },
  ),
)
