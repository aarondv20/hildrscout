import * as React from 'react'
import { cn } from '../../lib/utils'

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'default' | 'sm'
}

function Select({ className, size = 'default', children, ...props }: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          'appearance-none w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer',
          size === 'default' ? 'h-10 py-2 pr-9' : 'h-9 py-1.5 pr-8',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

export { Select }