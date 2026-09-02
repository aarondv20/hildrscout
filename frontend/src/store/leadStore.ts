import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Business, JobStatus, SearchRequest } from '../types'

interface LeadStore {
  jobs: Record<string, JobStatus>
  leads: Record<string, Business[]>
  activeJobId: string | null
  isSearching: boolean
  selectedLead: Business | null
  searchRequest: SearchRequest | null
  startedAt: string | null
  emailsFound: number
  exportsCompleted: number
  prefillSearch: SearchRequest | null

  startJob: (jobId: string, request: SearchRequest) => void
  addLead: (jobId: string, business: Business) => void
  updateProgress: (jobId: string, status: JobStatus) => void
  completeJob: (jobId: string) => void
  stopJob: (jobId: string) => void
  incrementEmails: (count: number) => void
  incrementExports: () => void
  phoneFound: (jobId: string, phone: string, businessName: string) => void
  selectLead: (business: Business | null) => void
  clearJob: (jobId: string) => void
  setPrefillSearch: (req: SearchRequest | null) => void
}

export const useLeadStore = create<LeadStore>()(
  immer((set) => ({
    jobs: {},
    leads: {},
    activeJobId: null,
    isSearching: false,
    selectedLead: null,
    searchRequest: null,
    startedAt: null,
    emailsFound: 0,
    exportsCompleted: 0,
    prefillSearch: null,

    startJob: (jobId, request) =>
      set((state) => {
        state.activeJobId = jobId
        state.isSearching = true
        state.searchRequest = request
        state.startedAt = new Date().toISOString()
        state.selectedLead = null
        state.emailsFound = 0
        state.leads[jobId] = []
        state.jobs[jobId] = {
          job_id: jobId,
          status: 'running',
          current: 0,
          total: request.max_results,
          percent: 0,
          current_business: null,
          elapsed: 0,
          remaining: null,
        }
      }),

    addLead: (jobId, business) =>
      set((state) => {
        if (!state.leads[jobId]) {
          state.leads[jobId] = [business]
          return
        }
        const idx = state.leads[jobId].findIndex((b) => b.id === business.id)
        if (idx !== -1) {
          // Merge incoming fields — do NOT reassign state.leads[jobId] (draft self-assignment
          // can cause immer to silently discard tracked mutations on that node).
          state.leads[jobId][idx] = { ...state.leads[jobId][idx], ...business }
        } else {
          state.leads[jobId].push(business)
        }
      }),

    updateProgress: (jobId, status) =>
      set((state) => {
        state.jobs[jobId] = status
      }),

    completeJob: (jobId) =>
      set((state) => {
        const job = state.jobs[jobId]
        if (job) {
          job.status = 'completed'
          job.percent = 100
        }
        state.isSearching = false
      }),

    stopJob: (jobId) =>
      set((state) => {
        const job = state.jobs[jobId]
        if (job) {
          job.status = 'stopped'
        }
        state.isSearching = false
      }),

    selectLead: (business) =>
      set((state) => {
        state.selectedLead = business
      }),

    incrementEmails: (count) =>
      set((state) => {
        state.emailsFound += count
      }),

    incrementExports: () =>
      set((state) => {
        state.exportsCompleted += 1
      }),

    phoneFound: (jobId, phone, businessName) =>
      set((state) => {
        const leads = state.leads[jobId]
        if (!leads) return
        const idx = leads.findIndex((b) => b.name === businessName)
        if (idx !== -1) {
          leads[idx] = { ...leads[idx], phone }
          // No reassignment of state.leads[jobId] — mutate through the draft proxy chain directly.
        }
      }),

    clearJob: (jobId) =>
      set((state) => {
        delete state.leads[jobId]
        delete state.jobs[jobId]
        state.emailsFound = 0
        if (state.activeJobId === jobId) {
          state.activeJobId = null
          state.isSearching = false
          state.selectedLead = null
          state.startedAt = null
        }
      }),

    setPrefillSearch: (req) =>
      set((state) => {
        state.prefillSearch = req
      }),
  })),
)
