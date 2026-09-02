import { motion } from 'framer-motion'
import { Download, FileSpreadsheet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useHistoryStore } from '../../store/historyStore'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FormatBadge({ format }: { format: string }) {
  const color =
    format === 'excel'
      ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
      : format === 'csv'
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}
    >
      {format}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-5 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        <Download className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <p className="text-xs text-muted-foreground">No exports yet</p>
    </div>
  )
}

export function ExportsHistoryPanel() {
  const exports = useHistoryStore((s) => s.exports)
  const navigate = useNavigate()

  const recent = exports.slice(0, 6)

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4.5 w-4.5 text-primary" />
          <CardTitle>Exports History</CardTitle>
        </div>
        {exports.length > 6 && (
          <button
            onClick={() => navigate('/exports')}
            className="text-xs text-primary hover:underline"
          >
            View all ({exports.length})
          </button>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-0">
        {recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border">
            {recent.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                {/* Keyword title */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{exp.keyword}</p>
                  <p className="text-[11px] text-muted-foreground">{exp.filename}</p>
                </div>

                {/* Format badge */}
                <FormatBadge format={exp.format} />

                {/* Date */}
                <p className="shrink-0 text-[11px] text-muted-foreground">{formatDate(exp.exportedAt)}</p>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
