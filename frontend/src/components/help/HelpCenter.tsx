import { AnimatePresence, motion } from 'framer-motion'
import { HelpCircle, X } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

function Item({ label, description }: { label: string; description: string }) {
  return (
    <p>
      <span className="font-medium text-foreground">{label}</span> — {description}
    </p>
  )
}

export function HelpCenter() {
  const helpOpen = useUIStore((s) => s.helpOpen)
  const closeHelp = useUIStore((s) => s.closeHelp)

  return (
    <AnimatePresence>
      {helpOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={closeHelp}
          />
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-border bg-card shadow-xl"
            role="dialog"
            aria-label="Help Center"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft">
                  <HelpCircle className="h-4.5 w-4.5 text-primary" />
                </span>
                <h2 className="text-base font-semibold text-foreground">Hildr Scout Help Center</h2>
              </div>
              <button
                onClick={closeHelp}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close help center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <Section title="Getting Started">
                <Item label="Enter a keyword" description="e.g. Dentists, Plumbers, Cafés." />
                <Item label="Enter a location" description="e.g. Los Angeles, Miami." />
                <Item
                  label="Choose maximum results"
                  description="How many businesses to collect."
                />
                <Item label="Click Start Search" description="The scraper runs instantly." />
              </Section>

              <Section title="Search Process">
                <p>Businesses are discovered live while the search runs.</p>
                <p>Emails are extracted from each business website.</p>
                <p>Google Maps updates in real time with new markers.</p>
                <p>Progress updates automatically as businesses are processed.</p>
              </Section>

              <Section title="KPI Cards">
                <Item label="Businesses Collected" description="Total businesses successfully discovered." />
                <Item label="Emails Found" description="Total emails extracted from business websites." />
                <Item label="Phone Numbers" description="Business phone numbers found." />
                <Item label="Exports Completed" description="Total successful Excel exports." />
              </Section>

              <Section title="Google Maps">
                <p>Blue marker = Processing</p>
                <p>Green marker = Completed</p>
                <p>Orange marker = Current business</p>
              </Section>

              <Section title="Export">
                <p>
                  Export generates an Excel spreadsheet containing all collected leads. Use the
                  Export button in the Leads table.
                </p>
              </Section>

              <Section title="Troubleshooting">
                <Item label="No businesses found" description="Try a broader keyword or a larger city." />
                <Item
                  label="Google Maps API missing"
                  description="Add a valid VITE_GOOGLE_MAPS_KEY to frontend/.env and restart the dev server."
                />
                <Item label="No emails extracted" description="Some business websites do not list emails." />
                <Item
                  label="Website unavailable"
                  description="The site was unreachable; the business is still kept in the results."
                />
              </Section>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Version</span> 1.0.0
              </p>
              <p>
                <span className="font-medium text-foreground">Developer</span> Aaron
              </p>
              <p>
                <span className="font-medium text-foreground">Build</span> 2026.08.04
              </p>
              <p>
                <span className="font-medium text-foreground">Last Updated</span> August 2026
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}