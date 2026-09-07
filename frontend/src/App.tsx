import { motion } from 'framer-motion'
import { Route, Routes } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { KPICards } from './components/dashboard/KPICards'
import { ProgressCard } from './components/dashboard/ProgressCard'
import { SearchDetails } from './components/dashboard/SearchDetails'
import { SearchForm } from './components/dashboard/SearchForm'
import { SearchHistoryPanel } from './components/dashboard/SearchHistoryPanel'
import { NotFound } from './components/NotFound'
import { useWebSocket } from './hooks/useWebSocket'
import { useLeadStore } from './store/leadStore'
import { SearchPage } from './pages/SearchPage'
import { LeadsPage } from './pages/LeadsPage'
import { ExportsPage } from './pages/ExportsPage'
import { LogsPage } from './pages/LogsPage'
import { SettingsPage } from './pages/SettingsPage'

// ─── Always-on WebSocket layer ────────────────────────────────────────────────
// Renders null but keeps the WS alive regardless of which route is active,
// so the Search Page receives live updates when a search is started there.
function WebSocketLayer() {
  const activeJobId = useLeadStore((s) => s.activeJobId)
  useWebSocket(activeJobId)
  return null
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const jobs = useLeadStore((s) => s.jobs)
  const leads = useLeadStore((s) => s.leads)
  const activeJobId = useLeadStore((s) => s.activeJobId)
  const searchRequest = useLeadStore((s) => s.searchRequest)
  const startedAt = useLeadStore((s) => s.startedAt)
  const emailsFound = useLeadStore((s) => s.emailsFound)
  const exportsCompleted = useLeadStore((s) => s.exportsCompleted)

  const currentLeads = activeJobId ? (leads[activeJobId] ?? []) : []
  const jobStatus = activeJobId ? (jobs[activeJobId] ?? null) : null

  const businessCount = currentLeads.length
  const phoneCount = currentLeads.filter((b) => b.phone).length

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 p-5 lg:p-6"
        >
          {/* ── Row 1: KPI Cards ──────────────────────────────────────── */}
          <KPICards
            businessCount={businessCount}
            emailCount={emailsFound}
            phoneCount={phoneCount}
            exportCount={exportsCompleted}
          />

          {/* ── Row 2: New Search (50%) | Search Progress (50%) ────────── */}
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <SearchForm showProgress={false} />
            <ProgressCard jobStatus={jobStatus} />
          </div>

          {/* ── Row 3: Search Details (25%) | Search History (75%) ─────── */}
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_3fr]">
            <SearchDetails
              searchRequest={searchRequest}
              status={jobStatus?.status ?? 'idle'}
              startedAt={startedAt}
            />
            <SearchHistoryPanel />
          </div>
        </motion.main>
      </div>
    </div>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      {/* WebSocketLayer must live outside Routes so it persists across navigation */}
      <WebSocketLayer />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/exports" element={<ExportsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}