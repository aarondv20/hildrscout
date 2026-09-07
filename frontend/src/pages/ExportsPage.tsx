import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { Archive, Download, FileDown, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { NumberedPagination } from '../components/ui/NumberedPagination'
import { apiBase } from '../lib/utils'
import { useHistoryStore, type ExportRecord } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'

const MAIN_LIMIT = 15
const ARCHIVE_PAGE_SIZE = 10

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

// ─── Shared export row (same layout in main list and archive modal) ─────────
function ExportRow({
  record,
  index,
  downloading,
  onDownload,
  onDelete,
}: {
  record: ExportRecord
  index: number
  downloading: string | null
  onDownload: (r: ExportRecord) => void
  onDelete: (id: string) => void
}) {
  return (
    <motion.div
      key={record.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="grid grid-cols-1 md:grid-cols-[1fr_120px_80px_150px_80px_100px] gap-2 md:gap-4 items-center px-5 py-4"
    >
      {/* Keyword / Location */}
      <div className="min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{record.keyword}</p>
        <p className="text-xs text-muted-foreground truncate">{record.location}</p>
      </div>

      {/* Format badge */}
      <Badge variant={formatBadgeVariant(record.format)}>{formatLabel(record.format)}</Badge>

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
          onClick={() => onDownload(record)}
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
          onClick={() => onDelete(record.id)}
          title="Remove from history"
          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Shared column header (reused in main list and modal) ─────────────────────
function ExportsColumnHeader({ className }: { className?: string }) {
  return (
    <div
      className={`hidden md:grid grid-cols-[1fr_120px_80px_150px_80px_100px] gap-4 px-5 py-2.5 border-b border-border bg-accent/40 text-xs font-medium text-muted-foreground uppercase tracking-wide ${className ?? ''}`}
    >
      <span>Keyword / Location</span>
      <span>Format</span>
      <span className="text-center">Leads</span>
      <span>Exported At</span>
      <span>Filename</span>
      <span />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function ExportsPage() {
  const exports = useHistoryStore((s) => s.exports)
  const deleteExport = useHistoryStore((s) => s.deleteExport)
  const [downloading, setDownloading] = useState<string | null>(null)

  // Archive modal state
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archivePage, setArchivePage] = useState(1)

  // Close modal on Escape
  useEffect(() => {
    if (!archiveOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArchiveOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [archiveOpen])

  // Reset archive page when modal closes
  useEffect(() => {
    if (!archiveOpen) setArchivePage(1)
  }, [archiveOpen])

  const mainExports = exports.slice(0, MAIN_LIMIT)
  const archivedExports = exports.slice(MAIN_LIMIT)
  const totalArchivePages = Math.ceil(archivedExports.length / ARCHIVE_PAGE_SIZE)
  const pagedArchives = archivedExports.slice(
    (archivePage - 1) * ARCHIVE_PAGE_SIZE,
    archivePage * ARCHIVE_PAGE_SIZE,
  )

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
        description:
          'This export is no longer available on the server. It may have expired after a server restart.',
      })
    } finally {
      setDownloading(null)
    }
  }

  return (
    <AppLayout>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Exports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            All previously exported files. Re-download or remove individual records.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setArchiveOpen(true)}
          className="shrink-0 gap-1.5"
        >
          <Archive className="h-3.5 w-3.5" />
          Archives{archivedExports.length > 0 && ` (${archivedExports.length})`}
        </Button>
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
            <span className="text-xs text-muted-foreground">
              {mainExports.length} of {exports.length} export{exports.length !== 1 ? 's' : ''}
              {archivedExports.length > 0 && ' · showing most recent'}
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              <ExportsColumnHeader className="rounded-t-xl" />
              <div className="divide-y divide-border">
                {mainExports.map((record, i) => (
                  <ExportRow
                    key={record.id}
                    record={record}
                    index={i}
                    downloading={downloading}
                    onDownload={handleRedownload}
                    onDelete={deleteExport}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Archive Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {archiveOpen && (
          <motion.div
            key="archive-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setArchiveOpen(false)}
            />

            {/* Modal panel */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-background shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Archived Exports</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {archivedExports.length} older export{archivedExports.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setArchiveOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Close archives"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto">
                <ExportsColumnHeader className="sticky top-0" />
                <div className="divide-y divide-border">
                  {pagedArchives.map((record, i) => (
                    <ExportRow
                      key={record.id}
                      record={record}
                      index={i}
                      downloading={downloading}
                      onDownload={handleRedownload}
                      onDelete={(id) => {
                        deleteExport(id)
                        // If this was the last item on the current page, go back one page
                        const remaining = archivedExports.length - 1
                        const maxPage = Math.ceil(remaining / ARCHIVE_PAGE_SIZE)
                        if (archivePage > maxPage) setArchivePage(Math.max(1, maxPage))
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Modal footer — pagination */}
              <div className="flex items-center justify-between border-t border-border px-5 py-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  Showing {(archivePage - 1) * ARCHIVE_PAGE_SIZE + 1}–
                  {Math.min(archivePage * ARCHIVE_PAGE_SIZE, archivedExports.length)} of{' '}
                  {archivedExports.length}
                </span>
                <NumberedPagination
                  currentPage={archivePage}
                  totalPages={totalArchivePages}
                  onPageChange={setArchivePage}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
