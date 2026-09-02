import * as React from 'react'
import { cn } from '../../lib/utils'

function Progress({
  className,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-border', className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export { Progress }