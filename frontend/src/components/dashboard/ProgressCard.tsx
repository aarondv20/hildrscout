import { motion, AnimatePresence } from 'framer-motion'
import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { formatDuration } from '../../lib/utils'
import { StatusBadge } from './StatusBadge'
import type { JobStatus } from '../../types'

interface ProgressCardProps {
  jobStatus: JobStatus | null
}

// ─── Circular ring ────────────────────────────────────────────────────────────
function CircularProgress({ percent }: { percent: number }) {
  const R = 68
  const CIRC = 2 * Math.PI * R
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
  const offset = CIRC - (safe / 100) * CIRC

  return (
    <div className="relative h-[80px] w-[80px] shrink-0">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle
          cx="100" cy="100" r={R}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="16"
        />
        <motion.circle
          cx="100" cy="100" r={R}
          fill="none"
          stroke="#22C55E"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={Math.round(percent)}
            initial={{ opacity: 0.4, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-bold leading-none text-foreground"
          >
            {Math.round(percent)}%
          </motion.span>
        </AnimatePresence>
        <span className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          Complete
        </span>
      </div>
    </div>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-muted px-3 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ProgressCard({ jobStatus }: ProgressCardProps) {
  const status          = jobStatus?.status          ?? 'idle'
  const percent         = Number.isFinite(jobStatus?.percent)   ? (jobStatus!.percent  ?? 0) : 0
  const current         = jobStatus?.current         ?? 0
  const total           = jobStatus?.total           ?? 0
  const elapsed         = jobStatus?.elapsed         ?? 0
  const remaining       = jobStatus?.remaining       ?? null
  const currentBusiness = jobStatus?.current_business ?? '—'

  return (
    <Card>
      {/* Header: title left — status badge right */}
      <CardHeader className="justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-primary" />
          <CardTitle>Search Progress</CardTitle>
        </div>
        <StatusBadge status={status} />
      </CardHeader>

      <CardContent className="pt-2 pb-5 px-5">
        <div className="flex items-center gap-6">
          {/* ── Left: circular ring ──────────────────────────────────── */}
          <CircularProgress percent={percent} />

          {/* ── Right: bar + stats + current ─────────────────────────── */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Progress bar with inline % label */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Progress</span>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {Math.round(percent)}%
                </span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>

            {/* Three stat pills */}
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Collected"  value={`${current} / ${total}`} />
              <Stat label="Elapsed"    value={formatDuration(elapsed)} />
              <Stat label="Remaining"  value={formatDuration(remaining)} />
            </div>

            {/* Current business */}
            <p className="truncate text-xs text-muted-foreground">
              Current:{' '}
              <span className="font-semibold text-foreground">
                {currentBusiness.length > 60
                  ? `${currentBusiness.slice(0, 60)}…`
                  : currentBusiness}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}