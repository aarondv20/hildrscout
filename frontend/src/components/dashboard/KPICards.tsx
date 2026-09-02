import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Download, Mail, Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Card } from '../ui/card'
import { formatNumber } from '../../lib/utils'

interface KPICardsProps {
  businessCount: number
  emailCount: number
  phoneCount: number
  exportCount: number
}

function useCountUp(target: number, duration = 500): number {
  const [value, setValue] = useState(target)
  const prevRef = useRef(target)

  useEffect(() => {
    const from = prevRef.current
    const to = target
    if (from === to) return
    prevRef.current = to
    const start = performance.now()
    let raf: number

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (to - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

function KpiCard({
  icon: Icon,
  value,
  label,
  delay,
}: {
  icon: typeof Building2
  value: number
  label: string
  delay: number
}) {
  const animated = useCountUp(value)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
    >
      <Card className="flex items-center gap-3 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <AnimatePresence mode="popLayout">
            <motion.p
              key={animated}
              initial={{ opacity: 0.5, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-foreground leading-none"
            >
              {formatNumber(animated)}
            </motion.p>
          </AnimatePresence>
          <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        </div>
      </Card>
    </motion.div>
  )
}

export function KPICards({ businessCount, emailCount, phoneCount, exportCount }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard icon={Building2} value={businessCount} label="Businesses Collected" delay={0} />
      <KpiCard icon={Mail} value={emailCount} label="Emails Found" delay={0.1} />
      <KpiCard icon={Phone} value={phoneCount} label="Phone Numbers" delay={0.2} />
      <KpiCard icon={Download} value={exportCount} label="Exports Completed" delay={0.3} />
    </div>
  )
}