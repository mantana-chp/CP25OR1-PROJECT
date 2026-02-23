import { ButtonHTMLAttributes, Ref } from 'react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type ButtonVariant = 'primary' | 'ghost' | 'grey'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  ref?: Ref<HTMLButtonElement>
}

// ─────────────────────────────────────────────
// Style maps
// ─────────────────────────────────────────────
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-white border-transparent hover:bg-primary-600 active:bg-primary-700',
  ghost:
    'bg-white text-dark-grey border border-medium-grey hover:bg-light-grey active:bg-medium-grey',
  grey: 'bg-light-grey text-dark-grey border-transparent hover:bg-medium-grey active:bg-grey'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2 text-sm',
  lg: 'px-8 py-3 text-base'
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled,
    className = '',
    children,
    ref,
    ...rest
  } = props

  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2',
        'rounded-full font-medium whitespace-nowrap',
        'transition-all duration-150 outline-none',
        'hover:-translate-y-px active:translate-y-0',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        isDisabled
          ? 'opacity-50 cursor-not-allowed pointer-events-none'
          : 'cursor-pointer',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
