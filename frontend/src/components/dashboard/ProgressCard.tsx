import { motion } from 'framer-motion'
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
// R=82 (wide, fills most of the viewBox), strokeWidth=9 (thin)
function CircularProgress({ percent }: { percent: number }) {
  const R    = 82
  const CIRC = 2 * Math.PI * R
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
  const offset = CIRC - (safe / 100) * CIRC

  return (
    <div className="relative h-[130px] w-[130px] shrink-0">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle
          cx="100" cy="100" r={R}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="9"
        />
        <motion.circle
          cx="100" cy="100" r={R}
          fill="none"
          stroke="#22C55E"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none text-foreground">
          {Math.round(percent)}%
        </span>
        <span className="mt-1 text-xs text-muted-foreground">Complete</span>
      </div>
    </div>
  )
}

// ─── Three stats in a single unified container ────────────────────────────────
function StatsGroup({
  current,
  total,
  elapsed,
  remaining,
}: {
  current: number
  total: number
  elapsed: number
  remaining: number | null
}) {
  return (
    <div className="grid grid-cols-3 rounded-lg bg-muted/60 px-4 py-2.5">
      <div>
        <p className="text-[10px] font-medium text-muted-foreground">Collected</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
          {current} / {total}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-medium text-muted-foreground">Elapsed</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
          {formatDuration(elapsed)}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-medium text-muted-foreground">Remaining</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
          {formatDuration(remaining)}
        </p>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function ProgressCard({ jobStatus }: ProgressCardProps) {
  const status          = jobStatus?.status           ?? 'idle'
  const percent         = Number.isFinite(jobStatus?.percent) ? (jobStatus!.percent ?? 0) : 0
  const current         = jobStatus?.current          ?? 0
  const total           = jobStatus?.total            ?? 0
  const elapsed         = jobStatus?.elapsed          ?? 0
  const remaining       = jobStatus?.remaining        ?? null
  const currentBusiness = jobStatus?.current_business ?? '—'

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <Activity className="h-4.5 w-4.5 text-primary" />
        <CardTitle>Search Progress</CardTitle>
      </CardHeader>

      {/*
        justify-between → 3 rows fill the card height:
          Row 1 (top):    circle + progress bar (items-center → bar at ring center)
          Row 2 (middle): stats group (full width)
          Row 3 (bottom): current business + status badge
      */}
      <CardContent className="flex flex-1 flex-col justify-between px-5 pb-5 pt-3">

        {/* ── Row 1: Circle (left) · Bar perfectly center-aligned (right) ── */}
        <div className="flex items-center gap-5">
          <CircularProgress percent={percent} />
          {/* Progress bar is in the SAME items-center row → always at ring center */}
          <Progress value={percent} className="h-1.5 flex-1" />
        </div>

        {/* ── Row 2: Stats full width ──────────────────────────────────────── */}
        <StatsGroup
          current={current}
          total={total}
          elapsed={elapsed}
          remaining={remaining}
        />

        {/* ── Row 3: Current business (left) + Status (right) ─────────────── */}
        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
          <p className="truncate text-xs text-muted-foreground">
            Current:{' '}
            <span className="font-medium text-foreground">
              {currentBusiness.length > 54
                ? `${currentBusiness.slice(0, 54)}…`
                : currentBusiness}
            </span>
          </p>
          <StatusBadge status={status} />
        </div>

      </CardContent>
    </Card>
  )
}