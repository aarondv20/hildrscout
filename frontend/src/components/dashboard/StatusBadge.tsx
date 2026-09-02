import { cn } from '../../lib/utils'

const STATUS_MAP: Record<string, { dot: string; label: string; text: string }> = {
  running: {
    dot: 'bg-primary animate-pulse',
    label: 'Searching',
    text: 'bg-primary/10 text-primary',
  },
  completed: {
    dot: 'bg-primary',
    label: 'Completed',
    text: 'bg-primary/10 text-primary',
  },
  paused: {
    dot: 'bg-amber-500',
    label: 'Paused',
    text: 'bg-amber-500/10 text-amber-600',
  },
  stopped: {
    dot: 'bg-red-500',
    label: 'Stopped',
    text: 'bg-red-500/10 text-red-600',
  },
  error: {
    dot: 'bg-red-500',
    label: 'Error',
    text: 'bg-red-500/10 text-red-600',
  },
  idle: {
    dot: 'bg-muted-foreground',
    label: 'Idle',
    text: 'bg-accent text-muted-foreground',
  },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.idle
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
        cfg.text,
        className,
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
