import { motion } from 'framer-motion'
import { Clock, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { StatusBadge } from '../dashboard/StatusBadge'
import { useHistoryStore, type SearchSession } from '../../store/historyStore'
import { useLeadStore } from '../../store/leadStore'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-5 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        <Search className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <p className="text-xs text-muted-foreground">No searches yet</p>
    </div>
  )
}

export function SearchHistoryPanel() {
  const sessions = useHistoryStore((s) => s.sessions)
  const deleteSession = useHistoryStore((s) => s.deleteSession)
  const setPrefillSearch = useLeadStore((s) => s.setPrefillSearch)
  const navigate = useNavigate()

  const recent = sessions.slice(0, 6)

  const handleRerun = (session: SearchSession) => {
    setPrefillSearch({
      keyword: session.keyword,
      location: session.location,
      radius_km: session.radius_km,
      max_results: session.max_results,
      output_format: session.output_format as 'excel' | 'csv' | 'json',
    })
    navigate('/search')
  }

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-primary" />
          <CardTitle>Search History</CardTitle>
        </div>
        {sessions.length > 6 && (
          <button
            onClick={() => navigate('/search')}
            className="text-xs text-primary hover:underline"
          >
            View all ({sessions.length})
          </button>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-0">
        {recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border">
            {recent.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                {/* Keyword + location */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{session.keyword}</p>
                  <p className="truncate text-xs text-muted-foreground">{session.location}</p>
                </div>

                {/* Date */}
                <p className="shrink-0 text-[11px] text-muted-foreground">{formatDate(session.startedAt)}</p>

                {/* Status */}
                <StatusBadge status={session.status} />

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRerun(session)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                    title="Re-run"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteSession(session.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
