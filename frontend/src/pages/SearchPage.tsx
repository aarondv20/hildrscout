import { motion } from 'framer-motion'
import { RotateCcw, Search, Trash2 } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { BusinessDetails } from '../components/dashboard/BusinessDetails'
import { LeadsTable } from '../components/dashboard/LeadsTable'
import { SearchForm } from '../components/dashboard/SearchForm'
import { StatusBadge } from '../components/dashboard/StatusBadge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { GoogleMap } from '../components/map/GoogleMap'
import { useHistoryStore, type SearchSession } from '../store/historyStore'
import { useLeadStore } from '../store/leadStore'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SearchPage() {
  // ── History store ───────────────────────────────────────────────
  const sessions = useHistoryStore((s) => s.sessions)
  const deleteSession = useHistoryStore((s) => s.deleteSession)

  // ── Lead store (live search state) ─────────────────────────────
  const jobs = useLeadStore((s) => s.jobs)
  const leads = useLeadStore((s) => s.leads)
  const activeJobId = useLeadStore((s) => s.activeJobId)
  const selectedLead = useLeadStore((s) => s.selectedLead)
  const searchRequest = useLeadStore((s) => s.searchRequest)
  const isSearching = useLeadStore((s) => s.isSearching)
  const selectLead = useLeadStore((s) => s.selectLead)
  const setPrefillSearch = useLeadStore((s) => s.setPrefillSearch)

  const currentLeads = activeJobId ? (leads[activeJobId] ?? []) : []
  const jobStatus = activeJobId ? (jobs[activeJobId] ?? null) : null

  const firstWithCoords = currentLeads.find((b) => b.latitude != null && b.longitude != null)
  const center = firstWithCoords
    ? { lat: firstWithCoords.latitude as number, lng: firstWithCoords.longitude as number }
    : null

  const handleRerun = (session: SearchSession) => {
    setPrefillSearch({
      keyword: session.keyword,
      location: session.location,
      radius_km: session.radius_km,
      max_results: session.max_results,
      output_format: session.output_format as 'excel' | 'csv' | 'json',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AppLayout>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Search</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Start a new scraping job, view live results on the map, and export leads.
        </p>
      </div>

      {/* ── Main 2-column grid — left stacks, map spans both rows ─── */}
      {/*
          Col 1 (50%): SearchForm (row 1) · BusinessDetails (row 2)
          Col 2 (50%): GoogleMap (row-span-2)
      */}
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto' }}
      >
        {/* Col 1 / Row 1 — New Search form (with inline progress at bottom) */}
        <SearchForm />

        {/* Col 2 / Rows 1-2 — Google Maps (spans full height) */}
        <div className="row-span-2 flex min-h-[440px] flex-col">
          <GoogleMap
            businesses={currentLeads}
            selectedLead={selectedLead}
            center={center}
            isSearching={isSearching}
            activeJobId={activeJobId}
            onSelectLead={selectLead}
            currentBusinessName={jobStatus?.current_business ?? null}
            searchLocation={searchRequest?.location ?? null}
            searchRadiusKm={searchRequest?.radius_km ?? null}
            jobStatus={jobStatus}
          />
        </div>

        {/* Col 1 / Row 2 — Business Details (pin click) */}
        <BusinessDetails selectedLead={selectedLead} />
      </div>

      {/* ── Current Search Results (full width) ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">Current Search Results</h3>
          {activeJobId && (
            <span className="text-xs text-muted-foreground">
              {currentLeads.length} business{currentLeads.length !== 1 ? 'es' : ''} collected
            </span>
          )}
        </div>
        <LeadsTable
          leads={currentLeads}
          isSearching={isSearching}
          onSelectLead={selectLead}
          activeJobId={activeJobId}
          selectedLead={selectedLead}
        />
      </div>

      {/* ── Search History backlog ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-foreground">Search History</h3>
          <span className="text-xs text-muted-foreground">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Search className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No searches yet</p>
              <p className="text-xs text-muted-foreground/70">Use the form above to start your first scraping job.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[1fr_140px_80px_70px_70px_110px_90px] gap-4 px-5 py-2.5 border-b border-border bg-accent/40 text-xs font-medium text-muted-foreground uppercase tracking-wide rounded-t-xl">
                <span>Keyword / Location</span>
                <span>Date</span>
                <span className="text-center">Leads</span>
                <span className="text-center">Emails</span>
                <span className="text-center">Phones</span>
                <span>Status</span>
                <span />
              </div>
              <div className="divide-y divide-border">
                {sessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_140px_80px_70px_70px_110px_90px] gap-2 sm:gap-4 items-center px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{session.keyword}</p>
                      <p className="text-xs text-muted-foreground truncate">{session.location}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(session.startedAt)}</p>
                    <p className="text-sm text-center font-medium text-foreground">{session.leadCount}</p>
                    <p className="text-sm text-center text-muted-foreground">{session.emailCount}</p>
                    <p className="text-sm text-center text-muted-foreground">{session.phoneCount}</p>
                    <StatusBadge status={session.status} />
                    <div className="flex items-center gap-1.5 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRerun(session)}
                        title="Pre-fill the form with this search"
                        className="h-7 px-2 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Re-run
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSession(session.id)}
                        title="Remove from history"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
