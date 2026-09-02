import { motion } from 'framer-motion'
import { CircleSlash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { StatusBadge } from './StatusBadge'
import type { SearchRequest } from '../../types'

interface SearchDetailsProps {
  searchRequest: SearchRequest | null
  status: string
  startedAt?: string | null
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 items-center gap-3 border-b border-border/50 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

function Val({ v }: { v: string }) {
  return (
    <span className="text-sm font-medium text-foreground" title={v}>
      {v}
    </span>
  )
}

export function SearchDetails({ searchRequest, status, startedAt }: SearchDetailsProps) {
  const started = startedAt
    ? new Date(startedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="h-full">
        <CardHeader>
          <CircleSlash2 className="h-4.5 w-4.5 text-primary" />
          <CardTitle>Search Details</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 pt-1">
          <Row label="Keyword">
            <Val v={searchRequest?.keyword ?? '—'} />
          </Row>
          <Row label="Location">
            <Val v={searchRequest?.location ?? '—'} />
          </Row>
          <Row label="Radius">
            <Val v={searchRequest ? `${searchRequest.radius_km} km` : '—'} />
          </Row>
          <Row label="Max Results">
            <Val v={searchRequest ? String(searchRequest.max_results) : '—'} />
          </Row>
          <Row label="Started">
            <Val v={searchRequest ? started : '—'} />
          </Row>
          <Row label="Status">
            <StatusBadge status={status} />
          </Row>
        </CardContent>
      </Card>
    </motion.div>
  )
}
