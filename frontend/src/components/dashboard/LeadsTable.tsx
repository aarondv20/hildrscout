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
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Download,
  Filter,
  Globe,
  Mail,
  MapPin,
  Phone,
  Share2,
  Star,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn, formatNumber, getDomain } from '../../lib/utils'
import type { Business } from '../../types'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { NumberedPagination } from '../ui/NumberedPagination'
import { Skeleton } from '../ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { motion } from 'framer-motion'
import axios from 'axios'
import { apiBase } from '../../lib/utils'
import { useHistoryStore } from '../../store/historyStore'
import { useLeadStore } from '../../store/leadStore'
import { useUIStore } from '../../store/uiStore'

// ─── Filter type ──────────────────────────────────────────────────────────────
export type LeadFilter = 'all' | 'withEmail' | 'withPhone' | 'withSocial'

const FILTER_OPTIONS: {
  value: LeadFilter
  label: string
  icon: React.ReactNode
}[] = [
  { value: 'all',        label: 'All',               icon: <Filter  className="h-3.5 w-3.5 opacity-60" /> },
  { value: 'withEmail',  label: 'With Emails',        icon: <Mail    className="h-3.5 w-3.5 opacity-60" /> },
  { value: 'withPhone',  label: 'With Phone Numbers', icon: <Phone   className="h-3.5 w-3.5 opacity-60" /> },
  { value: 'withSocial', label: 'With Social Media',  icon: <Share2  className="h-3.5 w-3.5 opacity-60" /> },
]

// ─── Social icons ─────────────────────────────────────────────────────────────
interface LeadsTableProps {
  leads: Business[]
  isSearching: boolean
  onSelectLead: (business: Business) => void
  activeJobId: string | null
  selectedLead: Business | null
  /** Pre-select a filter when navigating from a KPI card */
  initialFilter?: LeadFilter
}

function SocialIcon({ href, children, label }: { href?: string | null; children: React.ReactNode; label: string }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-primary transition-transform hover:scale-110"
      title={`${label}: ${href}`}
    >
      {children}
    </a>
  )
}

function FacebookIcon({ href }: { href?: string | null }) {
  return (
    <SocialIcon href={href} label="Facebook">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
      </svg>
    </SocialIcon>
  )
}

function InstagramIcon({ href }: { href?: string | null }) {
  return (
    <SocialIcon href={href} label="Instagram">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    </SocialIcon>
  )
}

function TikTokIcon({ href }: { href?: string | null }) {
  return (
    <SocialIcon href={href} label="TikTok">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    </SocialIcon>
  )
}

export function LeadsTable({ leads, isSearching, onSelectLead, activeJobId, selectedLead, initialFilter }: LeadsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [leadFilters, setLeadFilters] = useState<LeadFilter[]>(
    initialFilter && initialFilter !== 'all' ? [initialFilter] : []
  )
  const [filterOpen, setFilterOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  // Initialize to current activeJobId so on first effect run prevId === activeJobId
  // (meaning "same job = apply filter", not "job changed = reset").
  // StrictMode-safe: ref is initialized before any effect runs.
  const prevJobIdRef = useRef<string | null | undefined>(activeJobId)

  // Single effect handles both navigation (initialFilter) and new-search (reset).
  //
  //  • prevId === activeJobId → same job or initial mount → apply initialFilter
  //  • prevId !== activeJobId → genuinely new search started  → reset everything
  //
  // This eliminates the ordering race between the old two-effect approach
  // and is immune to React StrictMode's double-invoke behaviour.
  useEffect(() => {
    const prevId = prevJobIdRef.current
    prevJobIdRef.current = activeJobId

    if (prevId !== activeJobId) {
      // New search started — clear all filter state
      setLeadFilters([])
      setGlobalFilter('')
    } else {
      // Same job (or initial mount / StrictMode re-run) — honour navigation filter
      if (initialFilter && initialFilter !== 'all') {
        setLeadFilters([initialFilter])
      } else {
        setLeadFilters([])
      }
    }
  }, [activeJobId, initialFilter])

  // Click-outside to close filter dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    return () => {
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current)
    }
  }, [])

  // ── Pre-filter by contact type (real-time: runs whenever leads or filter changes)
  const contactFilteredLeads = useMemo<Business[]>(() => {
    if (leadFilters.length === 0) return leads

    return leads.filter((l) => {
      let match = true
      if (leadFilters.includes('withEmail') && l.email.length === 0) match = false
      if (leadFilters.includes('withPhone') && !l.phone) match = false
      if (leadFilters.includes('withSocial') && !l.facebook && !l.instagram && !l.tiktok) match = false
      return match
    })
  }, [leads, leadFilters])

  const columns = useMemo<ColumnDef<Business>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Business',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-foreground">{row.original.name}</p>
            {row.original.address && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[300px]">{row.original.address}</span>
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
            <a
              href={`tel:${row.original.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" />
              {row.original.phone}
            </a>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          ),
      },
      {
        accessorKey: 'website',
        header: 'Website',
        cell: ({ row }) =>
          row.original.website ? (
            <a
              href={row.original.website}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:underline dark:text-green-400"
            >
              <Globe className="h-3.5 w-3.5" />
              {getDomain(row.original.website)}
            </a>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => {
          const emails = row.original.email ?? []
          if (emails.length === 0) return <span className="text-muted-foreground/50">—</span>
          return (
            <a
              href={`mailto:${emails[0]}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5" />
              {emails[0]}
              {emails.length > 1 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  +{emails.length - 1} more
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
              <Star className="h-3.5 w-3.5 fill-current" />
              {row.original.rating}
            </span>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          ),
      },
      {
        accessorKey: 'reviews',
        header: 'Reviews',
        cell: ({ row }) =>
          row.original.reviews != null ? (
            <span className="text-sm text-muted-foreground">{formatNumber(row.original.reviews)}</span>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          ),
      },
      {
        id: 'socials',
        header: 'Social',
        cell: ({ row }) => {
          const b = row.original
          const platforms: Array<[string, string | null | undefined]> = [
            ['facebook', b.facebook],
            ['instagram', b.instagram],
            ['tiktok', b.tiktok],
          ]
          const found = platforms.filter(([, href]) => Boolean(href)) as Array<[string, string]>
          if (found.length === 0) {
            return <span className="text-muted-foreground/50">—</span>
          }
          return (
            <div className="flex items-center gap-1.5">
              {found.map(([platform, href]) => {
                switch (platform) {
                  case 'facebook':
                    return <FacebookIcon key={platform} href={href} />
                  case 'instagram':
                    return <InstagramIcon key={platform} href={href} />
                  case 'tiktok':
                    return <TikTokIcon key={platform} href={href} />
                  default:
                    return null
                }
              })}
            </div>
          )
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data: contactFilteredLeads,   // ← contact-filtered; text search runs on top via globalFilter
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const pageIndex = table.getState().pagination.pageIndex

  useEffect(() => {
    if (!selectedLead) return
    const rows = table.getFilteredRowModel().rows
    const index = rows.findIndex((row) => row.original.id === selectedLead.id)
    if (index === -1) return
    const targetPage = Math.floor(index / table.getState().pagination.pageSize)
    if (targetPage !== pageIndex) {
      table.setPageIndex(targetPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead])

  useEffect(() => {
    if (!selectedLead) return
    const row = document.querySelector<HTMLElement>('[data-selected="true"]')
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedLead, pageIndex])

  const onExport = async () => {
    if (!activeJobId || exporting) return
    setExporting(true)
    try {
      const response = await axios.get<Blob>(`${apiBase()}/api/export/${activeJobId}`, {
        responseType: 'blob',
      })

      // ── Derive suggested filename from Content-Disposition header ──
      const disposition = (response.headers['content-disposition'] as string | undefined) ?? ''
      const match = disposition.match(/filename\*?=(?:UTF-8'')?\"?([^";]+)\"?/i)
      const mimeType = response.data.type
      let suggestedName: string
      if (match) {
        suggestedName = decodeURIComponent(match[1].trim())
      } else {
        suggestedName = mimeType.includes('csv')
          ? 'hildr_scout.csv'
          : mimeType.includes('json')
            ? 'hildr_scout.json'
            : 'hildr_scout.xlsx'
      }

      // ── File extension → MIME accept map for the Save dialog ───────
      const ext = suggestedName.split('.').pop()?.toLowerCase() ?? 'xlsx'
      const mimeForExt: Record<string, string> = {
        csv:  'text/csv',
        json: 'application/json',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
      const acceptMime = mimeForExt[ext] ?? mimeType

      let savedName = suggestedName

      // ── File System Access API (Save As dialog) ─────────────────────
      if ('showSaveFilePicker' in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName,
            types: [
              {
                description: `${ext.toUpperCase()} File`,
                accept: { [acceptMime]: [`.${ext}`] },
              },
            ],
            excludeAcceptAllOption: false,
          })
          // The handle's .name reflects whatever the user typed in the dialog
          savedName = fileHandle.name as string
          const writable = await fileHandle.createWritable()
          await writable.write(response.data)
          await writable.close()
        } catch (err: unknown) {
          // User dismissed the dialog — abort silently (finally still runs)
          if (err instanceof DOMException && err.name === 'AbortError') return
          throw err   // Re-throw any real errors to the outer catch
        }
      } else {
        // ── Fallback: classic <a> anchor download ──────────────────────
        const url = URL.createObjectURL(response.data)
        const a = document.createElement('a')
        a.href = url
        a.download = suggestedName
        a.click()
        URL.revokeObjectURL(url)
      }

      // ── Record in export history ────────────────────────────────────
      const searchRequest = useLeadStore.getState().searchRequest
      const allLeads = useLeadStore.getState().leads[activeJobId] ?? []
      useHistoryStore.getState().addExport({
        jobId: activeJobId,
        keyword: searchRequest?.keyword ?? 'Unknown',
        location: searchRequest?.location ?? '',
        format: searchRequest?.output_format ?? 'excel',
        filename: savedName,
        exportedAt: new Date().toISOString(),
        leadCount: allLeads.length,
      })

      setExportNotice(`Saved ${savedName}`)
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current)
      exportTimerRef.current = setTimeout(() => setExportNotice(null), 4000)
    } catch (err) {
      console.error('Export failed', err)
      useUIStore.getState().pushNotification({
        type: 'error',
        title: 'Export Failed',
        description: 'Could not export leads. Please try again.',
      })
    } finally {
      setExporting(false)
    }
  }

  // Label shown on the filter button
  const activeFilterOptions = FILTER_OPTIONS.filter((o) => leadFilters.includes(o.value))
  const filterLabel = leadFilters.length === 0 
    ? 'All' 
    : leadFilters.length === 1 
      ? activeFilterOptions[0]?.label 
      : `Filters (${leadFilters.length})`

  // Displayed count: after both contact filter + text search
  const visibleCount = table.getFilteredRowModel().rows.length

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-col gap-4 pt-5">

        {/* ── Toolbar: search input + filter dropdown ────────────────── */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Text search */}
          <div className="relative flex-1 min-w-[200px]">
            <Input
              placeholder="Search leads..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter dropdown */}
          <div className="relative shrink-0" ref={filterDropdownRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={cn(
                'flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                leadFilters.length > 0 && 'border-primary text-primary',
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              {filterLabel}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 opacity-60 transition-transform',
                  filterOpen && 'rotate-180',
                )}
              />
            </button>

            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-md border border-border bg-background shadow-md"
              >
                {FILTER_OPTIONS.map(({ value, label, icon }) => {
                  const isActive = value === 'all' ? leadFilters.length === 0 : leadFilters.includes(value)
                  return (
                  <button
                    key={value}
                    onClick={() => {
                      if (value === 'all') {
                        setLeadFilters([])
                        setFilterOpen(false)
                      } else {
                        setLeadFilters((prev) => 
                          prev.includes(value) 
                            ? prev.filter((v) => v !== value) 
                            : [...prev, value]
                        )
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                      isActive
                        ? 'font-medium text-primary'
                        : 'text-foreground',
                    )}
                  >
                    {/* Checkmark for active option, spacer otherwise */}
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {icon}
                    {label}
                  </button>
                )})}
              </motion.div>
            )}
          </div>

          {/* Showing X of Y — visible when leads are loaded */}
          {leads.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">{visibleCount}</span>
              {' '}of{' '}
              <span className="font-medium text-foreground">{leads.length}</span>
              {' '}lead{leads.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isSearching && leads.length === 0 ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No leads yet. Start a search.</p>
          </div>
        ) : visibleCount === 0 ? (
          /* Empty state when filter leaves 0 results */
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Filter className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No leads match this filter</p>
            <p className="text-xs text-muted-foreground/70">
              Try selecting a different filter or clearing your search.
            </p>
            <button
              onClick={() => { setLeadFilters([]); setGlobalFilter('') }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <Table containerClassName="rounded-lg border border-border">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground cursor-pointer"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.original.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => onSelectLead(row.original)}
                    data-selected={selectedLead?.id === row.original.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-primary-soft/60',
                      selectedLead?.id === row.original.id &&
                        'bg-primary-soft border-l-2 border-l-primary',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </TableBody>
            </Table>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              {/* Numbered pagination */}
              <NumberedPagination
                currentPage={table.getState().pagination.pageIndex + 1}
                totalPages={Math.max(1, table.getPageCount())}
                onPageChange={(page) => table.setPageIndex(page - 1)}
              />

              {/* Export button + success notice */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  disabled={!activeJobId || leads.length === 0 || exporting}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
                <motion.span
                  key={exportNotice ?? 'none'}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: exportNotice ? 1 : 0, x: 0 }}
                  className="text-xs font-medium text-green-500"
                  aria-live="polite"
                >
                  {exportNotice}
                </motion.span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}