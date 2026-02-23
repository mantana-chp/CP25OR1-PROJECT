import { InputHTMLAttributes, Ref } from 'react'
import { Search } from 'lucide-react'

// ─────────────────────────────────────────────
// Base Input
// ─────────────────────────────────────────────
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  required?: boolean
  error?: string
  containerClassName?: string
  ref?: Ref<HTMLInputElement>
}

export default function InputText(props: InputProps) {
  const {
    label,
    required,
    error,
    containerClassName = '',
    className = '',
    ref,
    ...rest
  } = props
  return (
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && (
        <label className="small-text semibold-text text-primary-700">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={[
          'w-full px-4 py-2 text-sm text-black',
          'bg-white border-[1.5px] rounded-lg outline-none',
          'transition-all duration-150 box-border',
          'placeholder:text-grey',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          error
            ? 'border-danger-500 bg-danger-50 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-medium-grey',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error && <span className="tiny-text text-danger-600">{error}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────
// Search Input
// ─────────────────────────────────────────────
export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  containerClassName?: string
  ref?: Ref<HTMLInputElement>
}

export function SearchInput(props: SearchInputProps) {
  const { containerClassName = '', className = '', ref, ...rest } = props
  return (
    <div className={`relative flex items-center ${containerClassName}`}>
      <span className="absolute left-3.5 flex items-center pointer-events-none text-grey">
        <Search size={16} />
      </span>
      <input
        ref={ref}
        type="search"
        className={[
          'w-full pl-10 pr-4 py-2 text-sm text-black',
          'bg-white border-[1.5px] rounded-full outline-none',
          'transition-all duration-150 box-border',
          'placeholder:text-grey',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          'border-medium-grey',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    </div>
  )
}
