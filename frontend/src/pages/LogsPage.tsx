import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, FileText, Globe, Mail, Phone, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/dashboard/StatusBadge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { useHistoryStore, type SearchSession } from '../store/historyStore'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">{value}</span>
      {label}
    </span>
  )
}

function LogCard({ session, onDelete }: { session: SearchSession; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasBusinesses = session.topBusinesses.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      {/* Card header */}
      <div className="flex flex-wrap items-start gap-3 p-5">
        <div className="flex-1 min-w-0">
          {/* Title: keyword in location */}
          <p className="text-base font-semibold text-foreground">
            {session.keyword}
            <span className="font-normal text-muted-foreground"> in {session.location}</span>
          </p>
          {/* Date searched */}
          <p className="mt-0.5 text-xs text-muted-foreground">
            Searched {formatDate(session.startedAt)}
            {session.completedAt && ` · Completed ${formatDate(session.completedAt)}`}
          </p>
        </div>

        {/* Status badge */}
        <StatusBadge status={session.status} />

        {/* Delete */}
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          title="Remove this log entry"
          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3 bg-accent/30">
        <StatPill label="leads" value={session.leadCount} />
        <StatPill label="emails" value={session.emailCount} />
        <StatPill label="phones" value={session.phoneCount} />

        {hasBusinesses && (
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Hide' : 'Show'} top businesses
          </button>
        )}
      </div>

      {/* Expandable top businesses */}
      <AnimatePresence>
        {expanded && hasBusinesses && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border border-t border-border">
              {session.topBusinesses.map((biz, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3">
                  {/* Name */}
                  <p className="font-medium text-sm text-foreground min-w-[140px]">{biz.name}</p>

                  {/* Phone */}
                  {biz.phone ? (
                    <a href={`tel:${biz.phone}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                      <Phone className="h-3 w-3" />{biz.phone}
                    </a>
                  ) : null}

                  {/* Email */}
                  {biz.email ? (
                    <a href={`mailto:${biz.email}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                      <Mail className="h-3 w-3" />{biz.email}
                    </a>
                  ) : null}

                  {/* Website */}
                  {biz.website ? (
                    <a href={biz.website} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline dark:text-green-400">
                      <Globe className="h-3 w-3" />{new URL(biz.website).hostname.replace(/^www\./, '')}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function LogsPage() {
  const sessions = useHistoryStore((s) => s.sessions)
  const deleteSession = useHistoryStore((s) => s.deleteSession)

  return (
    <AppLayout>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Logs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Summarized history of every scraping session. Expand a card to see the top businesses found.
          </p>
        </div>
        {sessions.length > 0 && (
          <span className="text-xs text-muted-foreground shrink-0 mt-1">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No logs yet</p>
            <p className="text-xs text-muted-foreground/70">
              Each completed or stopped scraping job will appear here as a log entry.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {sessions.map((session) => (
              <LogCard
                key={session.id}
                session={session}
                onDelete={() => deleteSession(session.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </AppLayout>
  )
}
