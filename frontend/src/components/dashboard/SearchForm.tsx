import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { CheckCircle2, Loader2, Search, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiBase, cn } from '../../lib/utils'
import { useHistoryStore } from '../../store/historyStore'
import { useLeadStore } from '../../store/leadStore'
import { buildProxyUrl, useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import type { SearchRequest, SearchResponse } from '../../types'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Progress } from '../ui/progress'
import { Select } from '../ui/select'

const schema = z.object({
  keyword: z.string().min(2, 'Keyword must be at least 2 characters'),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  radius_km: z.coerce.number().min(1).max(100),
  max_results: z.coerce.number().min(10).max(500),
  output_format: z.enum(['excel', 'csv', 'json']),
})

type FormValues = z.infer<typeof schema>

export function SearchForm({ showProgress = true }: { showProgress?: boolean }) {
  const jobs = useLeadStore((s) => s.jobs)
  const isSearching = useLeadStore((s) => s.isSearching)
  const activeJobId = useLeadStore((s) => s.activeJobId)
  const startJob = useLeadStore((s) => s.startJob)
  const stopJob = useLeadStore((s) => s.stopJob)
  const prefillSearch = useLeadStore((s) => s.prefillSearch)
  const setPrefillSearch = useLeadStore((s) => s.setPrefillSearch)
  const [localLoading, setLocalLoading] = useState(false)

  // Read defaults once from settingsStore (non-reactive — only used for form init)
  const settingsDefaults = useSettingsStore.getState()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      keyword: '',
      location: settingsDefaults.defaultLocation,
      radius_km: settingsDefaults.defaultRadius,
      max_results: settingsDefaults.defaultMaxResults,
      output_format: settingsDefaults.defaultOutputFormat,
    },
  })

  // Apply prefill from Re-run button
  useEffect(() => {
    if (prefillSearch) {
      reset(prefillSearch)
      setPrefillSearch(null)
    }
  }, [prefillSearch, reset, setPrefillSearch])

  const busy = isSearching || localLoading

  const onSubmit = handleSubmit(async (values) => {
    setLocalLoading(true)
    try {
      const settings = useSettingsStore.getState()
      const request: SearchRequest = {
        ...values,
        max_concurrent: settings.maxConcurrentEnrichments,
        website_timeout: settings.websiteTimeoutSecs,
        headless: settings.headlessMode,
        scroll_steps: settings.scrollSteps,
        proxy_url: buildProxyUrl(settings),
      }
      const { data } = await axios.post<SearchResponse>(`${apiBase()}/api/search`, request)
      startJob(data.job_id, request)

      useHistoryStore.getState().startSession({
        id: data.job_id,
        jobId: data.job_id,
        keyword: values.keyword,
        location: values.location,
        radius_km: values.radius_km,
        max_results: values.max_results,
        output_format: values.output_format,
        startedAt: new Date().toISOString(),
        leadCount: 0,
        emailCount: 0,
        phoneCount: 0,
        status: 'running',
      })

      useUIStore.getState().pushNotification({
        type: 'info',
        title: 'Search Started',
        description: `Searching ${values.keyword} in ${values.location}...`,
      })
    } catch (err) {
      console.error('Failed to start search', err)
    } finally {
      setLocalLoading(false)
    }
  })

  const onStop = async () => {
    if (!activeJobId) return
    try {
      await axios.delete(`${apiBase()}/api/stop/${activeJobId}`)
    } finally {
      stopJob(activeJobId)
    }
  }

  // Inline progress state
  const jobStatus = activeJobId ? jobs[activeJobId] : null
  const percent = Number.isFinite(jobStatus?.percent) ? (jobStatus?.percent ?? 0) : 0
  const progressStatus = jobStatus?.status ?? null

  const statusConfig: Record<string, { label: string; className: string }> = {
    running:   { label: 'Searching…',     className: 'text-primary' },
    completed: { label: 'Search Complete', className: 'text-green-600 dark:text-green-400' },
    stopped:   { label: 'Search Stopped', className: 'text-amber-600 dark:text-amber-400' },
    error:     { label: 'Search Error',   className: 'text-red-600 dark:text-red-400' },
  }
  const progressCfg = progressStatus ? (statusConfig[progressStatus] ?? statusConfig.running) : null

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <Search className="h-4.5 w-4.5 text-primary" />
        <CardTitle>New Search</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {/* ── Fields: 3 rows × 2 cols ───────────────────────────────── */}
        <form onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {/* Keyword */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Keyword</label>
              <Input placeholder="e.g. Dentists" {...register('keyword')} />
              {errors.keyword && <p className="mt-1 text-xs text-red-500">{errors.keyword.message}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Location</label>
              <Input placeholder="e.g. Los Angeles" {...register('location')} />
              {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location.message}</p>}
            </div>

            {/* Radius */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Radius (km)</label>
              <Input type="number" min={1} max={100} {...register('radius_km')} />
              {errors.radius_km && <p className="mt-1 text-xs text-red-500">Must be 1–100</p>}
            </div>

            {/* Max Results */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Max Results</label>
              <Input type="number" min={10} max={500} {...register('max_results')} />
              {errors.max_results && <p className="mt-1 text-xs text-red-500">Must be 10–500</p>}
            </div>

            {/* Output Format */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Output Format</label>
              <Select size="sm" {...register('output_format')}>
                <option value="excel">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button
                type="submit"
                disabled={busy}
                className="flex-1 text-sm transition-transform duration-200 hover:scale-[1.02]"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Start Search
                  </>
                )}
              </Button>
              {busy && (
                <Button type="button" variant="destructive" className="flex-1 text-sm" onClick={onStop}>
                  <Square className="h-4 w-4 fill-current" />
                  Stop
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* ── Inline progress bar (dashboard hides this via showProgress=false) ── */}
        {showProgress && progressStatus && progressCfg && (
          <div className="border-t border-border pt-3">
            <Progress
              value={percent}
              className={cn(
                'h-1.5',
                progressStatus === 'completed' && '[&>div]:bg-green-500',
                progressStatus === 'stopped'   && '[&>div]:bg-amber-500',
                progressStatus === 'error'     && '[&>div]:bg-red-500',
              )}
            />
            <p className={cn('mt-1.5 flex items-center gap-1.5 text-xs font-medium', progressCfg.className)}>
              {progressStatus === 'completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {progressCfg.label}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}