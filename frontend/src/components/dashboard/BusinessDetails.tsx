import { Mail, MapPin, Phone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import type { Business } from '../../types'
import { cn } from '../../lib/utils'

interface BusinessDetailsProps {
  selectedLead: Business | null
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground w-16">{label}</span>
      <div className="flex-1 min-w-0 text-right">{children}</div>
    </div>
  )
}

function FoundBadge({ found, label }: { found: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        found
          ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400'
          : 'bg-muted text-muted-foreground',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', found ? 'bg-green-500' : 'bg-muted-foreground/40')} />
      {label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <MapPin className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-xs text-muted-foreground">Click a pin on the map<br />to view business details</p>
    </div>
  )
}

export function BusinessDetails({ selectedLead }: BusinessDetailsProps) {
  return (
    <motion.div
      className="h-full min-h-0"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader>
          <MapPin className="h-4.5 w-4.5 text-primary" />
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-1">
          <AnimatePresence mode="wait">
            {selectedLead ? (
              <motion.div
                key={selectedLead.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <DetailRow label="Name">
                  <p className="text-sm font-semibold text-foreground truncate" title={selectedLead.name}>
                    {selectedLead.name}
                  </p>
                </DetailRow>

                <DetailRow label="Address">
                  <p className="text-xs text-muted-foreground leading-snug" title={selectedLead.address ?? undefined}>
                    {selectedLead.address ?? '—'}
                  </p>
                </DetailRow>

                <DetailRow label="Email">
                  {selectedLead.email?.length ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <FoundBadge found={true} label={`${selectedLead.email.length} found`} />
                      {selectedLead.email.slice(0, 2).map((e) => (
                        <a
                          key={e}
                          href={`mailto:${e}`}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline truncate max-w-full"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          {e}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <FoundBadge found={false} label="Not found" />
                  )}
                </DetailRow>

                <DetailRow label="Phone">
                  {selectedLead.phone ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <FoundBadge found={true} label="Found" />
                      <a
                        href={`tel:${selectedLead.phone}`}
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        {selectedLead.phone}
                      </a>
                    </div>
                  ) : (
                    <FoundBadge found={false} label="Not found" />
                  )}
                </DetailRow>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1"
              >
                <EmptyState />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}
