import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, Download, Globe, Mail, MapPin, Phone, Star, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn, formatNumber, getDomain } from '../lib/utils'
import type { Business } from '../types'
import { AppLayout } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/dashboard/StatusBadge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useHistoryStore } from '../store/historyStore'


// ─── Client-side CSV export ────────────────────────────────────────────────────

function exportCSV(leads: Business[], keyword: string, location: string) {
  const headers = ['Business', 'Phone', 'Website', 'Email', 'Rating', 'Reviews', 'Address', 'Facebook', 'Instagram', 'TikTok', 'Contact Page', 'Maps URL']
  const rows = leads.map((b) => [
    b.name, b.phone ?? '', b.website ?? '', (b.email ?? []).join('; '),
    b.rating ?? '', b.reviews ?? '', b.address ?? '',
    b.facebook ?? '', b.instagram ?? '', b.tiktok ?? '',
    b.contact_page ?? '', b.maps_url ?? '',
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hildr_leads_${keyword.replace(/\s+/g, '_')}_${location.replace(/\s+/g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function LeadsPage() {
  const sessions = useHistoryStore((s) => s.sessions)
  const storedLeads = useHistoryStore((s) => s.leads)
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const completedSessions = sessions.filter((s) => s.status !== 'running')
  const activeSession = completedSessions.find((s) => s.jobId === selectedJobId) ?? completedSessions[0] ?? null
  const leads: Business[] = activeSession ? (storedLeads[activeSession.jobId] ?? []) : []

  const columns = useMemo<ColumnDef<Business>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Business',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-foreground text-sm">{row.original.name}</p>
            {row.original.address && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[260px]">{row.original.address}</span>
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) =>
          row.original.phone ? (
            <a href={`tel:${row.original.phone}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
              <Phone className="h-3.5 w-3.5" />{row.original.phone}
            </a>
          ) : <span className="text-muted-foreground/40">—</span>,
      },
      {
        accessorKey: 'website',
        header: 'Website',
        cell: ({ row }) =>
          row.original.website ? (
            <a href={row.original.website} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:underline dark:text-green-400">
              <Globe className="h-3.5 w-3.5" />{getDomain(row.original.website)}
            </a>
          ) : <span className="text-muted-foreground/40">—</span>,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => {
          const emails = row.original.email ?? []
          if (emails.length === 0) return <span className="text-muted-foreground/40">—</span>
          return (
            <a href={`mailto:${emails[0]}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
              <Mail className="h-3.5 w-3.5" />{emails[0]}
              {emails.length > 1 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  +{emails.length - 1}
                </span>
              )}
            </a>
          )
        },
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) =>
          row.original.rating != null ? (
            <span className="inline-flex items-center gap-1 text-sm text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />{row.original.rating}
            </span>
          ) : <span className="text-muted-foreground/40">—</span>,
      },
      {
        accessorKey: 'reviews',
        header: 'Reviews',
        cell: ({ row }) =>
          row.original.reviews != null
            ? <span className="text-sm text-muted-foreground">{formatNumber(row.original.reviews)}</span>
            : <span className="text-muted-foreground/40">—</span>,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  return (
    <AppLayout>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Leads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse and export leads from past scraping sessions.
          </p>
        </div>

        {/* Session picker */}
        {completedSessions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Session:</label>
            <Select
              size="sm"
              className="w-72"
              value={selectedJobId || (activeSession?.jobId ?? '')}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              {completedSessions.map((s) => (
                <option key={s.jobId} value={s.jobId}>
                  {s.keyword} in {s.location} — {new Date(s.startedAt).toLocaleDateString()} ({s.leadCount} leads)
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Session summary badge */}
      {activeSession && (
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={activeSession.status} />
          <span className="text-sm text-muted-foreground">
            {activeSession.keyword} · {activeSession.location} · Searched {formatDate(activeSession.startedAt)}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">{leads.length} leads stored</span>
        </div>
      )}

      {/* No sessions at all */}
      {completedSessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No leads yet</p>
            <p className="text-xs text-muted-foreground/70">Run a search and complete it to see leads here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex flex-col">
          <CardContent className="flex flex-col gap-4 pt-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Input
                  placeholder="Filter leads..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {leads.length > 0 && activeSession && (
                <Button variant="outline" onClick={() => exportCSV(leads, activeSession.keyword, activeSession.location)}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>

            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No lead data stored for this session.
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Only sessions that ran while the app was open have stored leads.
                </p>
              </div>
            ) : (
              <>
                <Table containerClassName="rounded-lg border border-border">
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id} className="hover:bg-transparent">
                        {hg.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder ? null : header.column.getCanSort() ? (
                              <button
                                className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground cursor-pointer"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            ) : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.original.id} className={cn('transition-colors hover:bg-primary-soft/60')}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Rows per page
                    <Select size="sm" className="w-20"
                      value={String(table.getState().pagination.pageSize)}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}>
                      {[25, 50, 100].map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
                    <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</Button>
                    <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  )
}
