import { AnimatePresence, motion } from 'framer-motion'
import { Bell, HelpCircle, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { HelpCenter } from '../help/HelpCenter'
import { NotificationCenter } from '../notifications/NotificationCenter'
import { useUIStore } from '../../store/uiStore'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export function Header() {
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const openHelp = useUIStore((s) => s.openHelp)
  const notifications = useUIStore((s) => s.notifications)
  const markAllNotificationsRead = useUIStore((s) => s.markAllNotificationsRead)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read).length

  const toggleNotifications = () => {
    if (!notificationsOpen) markAllNotificationsRead()
    setNotificationsOpen((prev) => !prev)
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex h-14 shrink-0 sticky top-0 z-40 items-center justify-between border-b border-border bg-card px-6"
    >
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          {getGreeting()}, Aaron <span className="inline-block">👋</span>
        </h1>
        <p className="text-[13px] text-muted-foreground">Find and collect business leads in seconds.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={toggleNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-4.5 w-4.5" />
            <AnimatePresence>
              {unread > 0 && (
                <motion.span
                  key={unread > 0 ? 'on' : 'off'}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white"
                >
                  {unread > 99 ? '99+' : unread}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <NotificationCenter open={notificationsOpen} onClose={toggleNotifications} />
        </div>

        <button
          onClick={openHelp}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
          aria-label="Help"
        >
          <HelpCircle className="h-4.5 w-4.5" />
        </button>

        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
          aria-label="Toggle dark mode"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <HelpCenter />
    </motion.header>
  )
}