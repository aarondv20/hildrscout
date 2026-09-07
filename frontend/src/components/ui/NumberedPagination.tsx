import { cn } from '../../lib/utils'

interface NumberedPaginationProps {
  /** 1-indexed current page */
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

/** Generate the visible page number sequence with ellipsis markers */
function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | 'ellipsis')[] = [1]
  if (current > 3) pages.push('ellipsis')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('ellipsis')
  pages.push(total)
  return pages
}

export function NumberedPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: NumberedPaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageRange(currentPage, totalPages)
  const btnBase =
    'flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(btnBase, 'border-input px-2.5 hover:bg-accent hover:text-accent-foreground')}
      >
        Prev
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span
            key={`e${i}`}
            className="flex h-8 w-6 items-center justify-center text-xs text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={cn(
              btnBase,
              'min-w-8 px-2',
              p === currentPage
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(btnBase, 'border-input px-2.5 hover:bg-accent hover:text-accent-foreground')}
      >
        Next
      </button>
    </div>
  )
}
