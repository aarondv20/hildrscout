import * as React from 'react'
import { cn } from '../../lib/utils'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
type Size = 'default' | 'sm' | 'lg' | 'icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

const variantClasses: Record<Variant, string> = {
  default:
    'bg-primary text-white hover:bg-[#1aa84e] shadow-sm disabled:opacity-50 disabled:pointer-events-none',
  outline:
    'border border-border bg-card hover:bg-muted text-foreground disabled:opacity-50',
  ghost: 'hover:bg-accent text-foreground disabled:opacity-50',
  destructive: 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50',
  secondary: 'bg-muted text-foreground hover:bg-border disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-11 px-8 text-base',
  icon: 'h-9 w-9',
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', onPointerDown, disabled, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Ripple[]>([])
    const rippleId = React.useRef(0)

    const addRipple = (e: React.PointerEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2
      const id = ++rippleId.current
      setRipples((prev) => [
        ...prev,
        {
          id,
          x: e.clientX - rect.left - size / 2,
          y: e.clientY - rect.top - size / 2,
          size,
        },
      ])
    }

    const removeRipple = (id: number) => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        onPointerDown={(e) => {
          onPointerDown?.(e)
          if (!disabled) addRipple(e)
        }}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer select-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0">
          {ripples.map((r) => (
            <span
              key={r.id}
              onAnimationEnd={() => removeRipple(r.id)}
              className="absolute rounded-full bg-white/30 animate-ripple"
              style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
            />
          ))}
        </span>
        {props.children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button }