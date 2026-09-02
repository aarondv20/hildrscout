import {
  Bell,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Globe,
  Palette,
  RefreshCw,
  Settings2,
  TriangleAlert,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Separator } from '../components/ui/separator'
import { useHistoryStore } from '../store/historyStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'
import { cn } from '../lib/utils'

// ─── Primitive components ─────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        checked ? 'bg-primary' : 'bg-input',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md',
          'transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

function SettingRow({
  label,
  description,
  children,
  danger,
}: {
  label: string
  description?: string
  children: ReactNode
  danger?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', danger ? 'text-destructive' : 'text-foreground')}>
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SliderRow({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit = '',
  lowLabel,
  highLabel,
  onChange,
}: {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  lowLabel?: string
  highLabel?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <span className="min-w-[3rem] rounded-md bg-primary/10 px-2 py-0.5 text-right text-sm font-mono font-semibold text-primary">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-input accent-primary"
      />
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  )
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="mt-4 divide-y divide-border">{children}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const settings = useSettingsStore()
  const update = useSettingsStore((s) => s.updateSettings)
  const reset = useSettingsStore((s) => s.resetSettings)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const pushNotification = useUIStore((s) => s.pushNotification)

  const [clearConfirm, setClearConfirm] = useState<null | 'search' | 'exports' | 'all'>(null)
  const [saved, setSaved] = useState(false)

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = (target: 'search' | 'exports' | 'all') => {
    if (clearConfirm !== target) {
      setClearConfirm(target)
      return
    }
    const store = useHistoryStore.getState()
    if (target === 'search' || target === 'all') {
      store.sessions.forEach((s) => store.deleteSession(s.id))
    }
    if (target === 'exports' || target === 'all') {
      store.exports.forEach((e) => store.deleteExport(e.id))
    }
    setClearConfirm(null)
    pushNotification({ type: 'success', title: 'Cleared', description: 'History data removed.' })
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-5 pb-10">

        {/* ── Page heading ─────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure scraper engine, proxy, notifications, and more.
          </p>
        </div>

        {/* ── General ─────────────────────────────────────────────────────── */}
        <SectionCard
          icon={<Settings2 className="h-5 w-5" />}
          title="General"
          description="Search form defaults applied to every new search."
        >
          <SettingRow label="Default Location" description="Pre-fills the Location field on the search form.">
            <Input
              value={settings.defaultLocation}
              onChange={(e) => update({ defaultLocation: e.target.value })}
              placeholder="e.g. Manila, Philippines"
              className="w-52 text-sm"
            />
          </SettingRow>
          <SettingRow label="Default Radius" description="Search radius in kilometres.">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                value={settings.defaultRadius}
                onChange={(e) => update({ defaultRadius: Number(e.target.value) })}
                className="w-20 text-sm"
              />
              <span className="text-xs text-muted-foreground">km</span>
            </div>
          </SettingRow>
          <SettingRow label="Default Max Results" description="Maximum businesses to collect per search.">
            <Input
              type="number"
              min={10}
              max={500}
              value={settings.defaultMaxResults}
              onChange={(e) => update({ defaultMaxResults: Number(e.target.value) })}
              className="w-24 text-sm"
            />
          </SettingRow>
          <SettingRow label="Default Export Format" description="Pre-selects the output format in the search form.">
            <Select
              size="sm"
              className="w-36"
              value={settings.defaultOutputFormat}
              onChange={(e) => update({ defaultOutputFormat: e.target.value as 'excel' | 'csv' | 'json' })}
            >
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </Select>
          </SettingRow>
        </SectionCard>

        {/* ── Scraper Engine ───────────────────────────────────────────────── */}
        <SectionCard
          icon={<Cpu className="h-5 w-5" />}
          title="Scraper Engine"
          description="Control parallelism, timeouts, and browser behaviour. Applied to every search run."
        >
          <SliderRow
            label="Max Concurrent Enrichments"
            description="Number of websites scraped in parallel. Higher = faster but more memory and IP exposure."
            value={settings.maxConcurrentEnrichments}
            min={1}
            max={10}
            lowLabel="1 — Conservative"
            highLabel="10 — Aggressive"
            onChange={(v) => update({ maxConcurrentEnrichments: v })}
          />
          <Separator />
          <SliderRow
            label="Website Scrape Timeout"
            description="Maximum seconds to wait for a business website to respond before skipping."
            value={settings.websiteTimeoutSecs}
            min={10}
            max={120}
            unit="s"
            lowLabel="10 s"
            highLabel="120 s"
            onChange={(v) => update({ websiteTimeoutSecs: v })}
          />
          <Separator />
          <SliderRow
            label="Maps Feed Scroll Steps"
            description="How many scroll iterations to perform on the Google Maps results feed per pass. More steps = more results loaded before clicking."
            value={settings.scrollSteps}
            min={5}
            max={30}
            lowLabel="5 — Quick"
            highLabel="30 — Thorough"
            onChange={(v) => update({ scrollSteps: v })}
          />
          <Separator />
          <SettingRow
            label="Headless Browser"
            description="Run Playwright in headless mode (no visible window). Disable for debugging only — visible mode is slower."
          >
            <Toggle checked={settings.headlessMode} onChange={(v) => update({ headlessMode: v })} />
          </SettingRow>
        </SectionCard>

        {/* ── Proxy & Network ──────────────────────────────────────────────── */}
        <SectionCard
          icon={<Globe className="h-5 w-5" />}
          title="Proxy & Network"
          description="Route scraper traffic through a proxy to avoid IP blocks. Supports HTTP, HTTPS, and SOCKS5 proxies."
        >
          <SettingRow
            label="Enable Proxy"
            description="All Playwright (Maps) requests will be routed through the configured proxy."
          >
            <Toggle checked={settings.proxyEnabled} onChange={(v) => update({ proxyEnabled: v })} />
          </SettingRow>
          {settings.proxyEnabled && (
            <>
              <SettingRow label="Proxy Protocol">
                <Select
                  size="sm"
                  className="w-28"
                  value={settings.proxyProtocol}
                  onChange={(e) => update({ proxyProtocol: e.target.value as 'http' | 'socks5' })}
                >
                  <option value="http">HTTP / HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </Select>
              </SettingRow>
              <SettingRow label="Proxy Host" description="Hostname or IP address of the proxy server.">
                <Input
                  value={settings.proxyHost}
                  onChange={(e) => update({ proxyHost: e.target.value })}
                  placeholder="proxy.example.com"
                  className="w-52 text-sm font-mono"
                />
              </SettingRow>
              <SettingRow label="Proxy Port">
                <Input
                  value={settings.proxyPort}
                  onChange={(e) => update({ proxyPort: e.target.value })}
                  placeholder="8080"
                  className="w-24 text-sm font-mono"
                  type="number"
                  min={1}
                  max={65535}
                />
              </SettingRow>
              <SettingRow label="Username" description="Leave blank for unauthenticated proxies.">
                <Input
                  value={settings.proxyUsername}
                  onChange={(e) => update({ proxyUsername: e.target.value })}
                  placeholder="Optional"
                  className="w-40 text-sm"
                  autoComplete="off"
                />
              </SettingRow>
              <SettingRow label="Password">
                <Input
                  value={settings.proxyPassword}
                  onChange={(e) => update({ proxyPassword: e.target.value })}
                  type="password"
                  placeholder="Optional"
                  className="w-40 text-sm"
                  autoComplete="new-password"
                />
              </SettingRow>
              <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Tip:</strong> Residential rotating proxies (e.g. Bright Data, Smartproxy)
                  significantly reduce Maps blocking. Datacenter proxies may still be detected.
                </p>
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Export ──────────────────────────────────────────────────────── */}
        <SectionCard
          icon={<Download className="h-5 w-5" />}
          title="Export"
          description="Control how and when leads are exported."
        >
          <SettingRow
            label="Filename Prefix"
            description="All exported files start with this prefix before the timestamp."
          >
            <Input
              value={settings.exportFilenamePrefix}
              onChange={(e) => update({ exportFilenamePrefix: e.target.value })}
              placeholder="hildr_leads"
              className="w-44 text-sm font-mono"
            />
          </SettingRow>
          <SettingRow
            label="Auto-Export on Completion"
            description="Automatically download the Excel file as soon as a search finishes."
          >
            <Toggle
              checked={settings.autoExportOnCompletion}
              onChange={(v) => update({ autoExportOnCompletion: v })}
            />
          </SettingRow>
        </SectionCard>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <SectionCard
          icon={<Bell className="h-5 w-5" />}
          title="Notifications"
          description="In-app notification toasts for scraper events."
        >
          <SettingRow
            label="Business Found"
            description="Show a toast every time a new business is discovered on Google Maps."
          >
            <Toggle
              checked={settings.notifyOnBusinessFound}
              onChange={(v) => update({ notifyOnBusinessFound: v })}
            />
          </SettingRow>
          <SettingRow
            label="Email Found"
            description="Show a toast every time an email address is extracted from a business website."
          >
            <Toggle
              checked={settings.notifyOnEmailFound}
              onChange={(v) => update({ notifyOnEmailFound: v })}
            />
          </SettingRow>
          <SettingRow
            label="Search Completed"
            description="Show a summary toast when a search run finishes, stops, or errors."
          >
            <Toggle
              checked={settings.notifyOnCompletion}
              onChange={(v) => update({ notifyOnCompletion: v })}
            />
          </SettingRow>
          <SettingRow
            label="Webhook URL"
            description="POST a JSON payload to this URL when a search completes (leave blank to disable)."
          >
            <Input
              value={settings.webhookUrl}
              onChange={(e) => update({ webhookUrl: e.target.value })}
              placeholder="https://hooks.slack.com/..."
              className="w-64 text-sm font-mono"
              type="url"
            />
          </SettingRow>
        </SectionCard>

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <SectionCard
          icon={<Palette className="h-5 w-5" />}
          title="Appearance"
          description="Choose your preferred colour scheme."
        >
          <SettingRow label="Theme">
            <div className="flex gap-1.5">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                    theme === t
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </SettingRow>
        </SectionCard>

        {/* ── Data Management ──────────────────────────────────────────────── */}
        <SectionCard
          icon={<Database className="h-5 w-5" />}
          title="Data Management"
          description="Control local history retention. All data is stored in your browser — nothing is sent to a server."
        >
          <SettingRow
            label="Max Sessions Retained"
            description="Oldest sessions are pruned automatically when this limit is exceeded."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={10}
                max={200}
                value={settings.maxSessionsRetained}
                onChange={(e) => update({ maxSessionsRetained: Number(e.target.value) })}
                className="w-20 text-sm"
              />
              <span className="text-xs text-muted-foreground">sessions</span>
            </div>
          </SettingRow>
          <SettingRow
            label="Clear Search History"
            description="Remove all search sessions and their lead snapshots from local storage."
            danger
          >
            <Button
              variant={clearConfirm === 'search' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleClear('search')}
            >
              <TriangleAlert className="h-3.5 w-3.5" />
              {clearConfirm === 'search' ? 'Confirm?' : 'Clear'}
            </Button>
          </SettingRow>
          <SettingRow
            label="Clear Export History"
            description="Remove all export records. The original Excel files on your device are not deleted."
            danger
          >
            <Button
              variant={clearConfirm === 'exports' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleClear('exports')}
            >
              <TriangleAlert className="h-3.5 w-3.5" />
              {clearConfirm === 'exports' ? 'Confirm?' : 'Clear'}
            </Button>
          </SettingRow>
          <SettingRow
            label="Clear All Data"
            description="Remove all sessions, lead snapshots, and export records. This cannot be undone."
            danger
          >
            <Button
              variant={clearConfirm === 'all' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleClear('all')}
            >
              <TriangleAlert className="h-3.5 w-3.5" />
              {clearConfirm === 'all' ? 'Confirm clear all?' : 'Clear All'}
            </Button>
          </SettingRow>
        </SectionCard>

        {/* ── Footer actions ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reset()
              showSaved()
            }}
            className="gap-2 text-muted-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset to Defaults
          </Button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
            <p className="text-xs text-muted-foreground">
              Settings auto-save to your browser as you change them.
            </p>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
