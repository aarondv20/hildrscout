import axios from 'axios'
import { motion } from 'framer-motion'
import { Download, FileDown, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { apiBase } from '../lib/utils'
import { useHistoryStore, type ExportRecord } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBadgeVariant(format: string): 'success' | 'default' | 'warning' {
  if (format === 'excel') return 'success'
  if (format === 'json') return 'warning'
  return 'default'
}

function formatLabel(format: string): string {
  if (format === 'excel') return 'Excel'
  if (format === 'csv') return 'CSV'
  if (format === 'json') return 'JSON'
  return format.toUpperCase()
}

export function ExportsPage() {
  const exports = useHistoryStore((s) => s.exports)
  const deleteExport = useHistoryStore((s) => s.deleteExport)
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleRedownload = async (record: ExportRecord) => {
    if (downloading) return
    setDownloading(record.id)
    try {
      const response = await axios.get<Blob>(`${apiBase()}/api/export/${record.jobId}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = record.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      useUIStore.getState().pushNotification({
        type: 'warning',
        title: 'Re-download Unavailable',
        description: 'This export is no longer available on the server. It may have expired after a server restart.',
      })
    } finally {
      setDownloading(null)
    }
  }

  return (
    <AppLayout>
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Exports</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          All previously exported files. Re-download or remove individual records.
        </p>
      </div>

      {exports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <FileDown className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No exports yet</p>
            <p className="text-xs text-muted-foreground/70">
              When you export leads from the Dashboard, they'll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{exports.length} export{exports.length !== 1 ? 's' : ''}</span>
          </div>

          <Card>
            <CardContent className="p-0">
              {/* Column header */}
              <div className="hidden md:grid grid-cols-[1fr_120px_80px_150px_80px_100px] gap-4 px-5 py-2.5 border-b border-border bg-accent/40 text-xs font-medium text-muted-foreground uppercase tracking-wide rounded-t-xl">
                <span>Keyword / Location</span>
                <span>Format</span>
                <span className="text-center">Leads</span>
                <span>Exported At</span>
                <span>Filename</span>
                <span />
              </div>

              <div className="divide-y divide-border">
                {exports.map((record, i) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-[1fr_120px_80px_150px_80px_100px] gap-2 md:gap-4 items-center px-5 py-4"
                  >
                    {/* Keyword (title) + Location */}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{record.keyword}</p>
                      <p className="text-xs text-muted-foreground truncate">{record.location}</p>
                    </div>

                    {/* Format badge */}
                    <Badge variant={formatBadgeVariant(record.format)}>
                      {formatLabel(record.format)}
                    </Badge>

                    {/* Lead count */}
                    <p className="text-sm font-medium text-center text-foreground">{record.leadCount}</p>

                    {/* Date */}
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(record.exportedAt)}</p>

                    {/* Filename (truncated) */}
                    <p className="text-xs text-muted-foreground truncate max-w-[180px] hidden md:block" title={record.filename}>
                      {record.filename}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRedownload(record)}
                        disabled={downloading === record.id}
                        title="Re-download this export"
                        className="h-7 px-2 text-xs"
                      >
                        <Download className="h-3 w-3" />
                        {downloading === record.id ? '...' : 'Download'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteExport(record.id)}
                        title="Remove from history"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  )
}
