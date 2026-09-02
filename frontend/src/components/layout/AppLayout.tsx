import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/**
 * Shared shell used by every page (Dashboard, Search, Leads, Exports, Logs).
 * Renders the sidebar + sticky header and animates the main content area in.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-1 flex-col gap-6 p-5 lg:p-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}
