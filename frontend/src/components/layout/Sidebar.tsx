import { motion } from 'framer-motion'
import {
  Download,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  Users,
  Zap,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Search', icon: Search, to: '/search' },
  { label: 'Leads', icon: Users, to: '/leads' },
  { label: 'Exports', icon: Download, to: '/exports' },
  { label: 'Logs', icon: FileText, to: '/logs' },
  { label: 'Settings', icon: Settings, to: '/settings' },
]

export function Sidebar() {
  const { pathname } = useLocation()

  return (
    <motion.aside
      initial={{ x: -250, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-[250px] shrink-0 h-screen sticky top-0 bg-card border-r border-border flex flex-col"
    >
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
          <Zap className="h-5 w-5" fill="currentColor" />
        </div>
        <span className="text-lg font-bold text-foreground">Hildr Scout</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ label, icon: Icon, to }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <Link
              key={label}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-soft text-primary'
                  : 'text-muted-foreground hover:bg-[#f3f4f6] hover:text-foreground',
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </Link>
          )
        })}
      </nav>

    </motion.aside>
  )
}