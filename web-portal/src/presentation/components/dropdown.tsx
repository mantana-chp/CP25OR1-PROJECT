'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface DropdownOption {
  label: string
  value: string
}

export interface DropdownProps {
  options: DropdownOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  label?: string
  required?: boolean
  error?: string
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function Dropdown(props: DropdownProps) {
  const {
    options,
    value,
    onChange,
    placeholder = 'เลือก...',
    disabled = false,
    className = '',
    label,
    required,
    error
  } = props
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (option: DropdownOption) => {
    onChange?.(option.value)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="small-text semibold-text text-primary-700">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}

      <div ref={containerRef} className="relative">
        {/* Trigger */}
        <div
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              !disabled && setOpen((o) => !o)
            }
            if (e.key === 'Escape') setOpen(false)
          }}
          className={[
            'flex items-center justify-between px-4 py-2 text-sm',
            'bg-white border-[1.5px] outline-none',
            'transition-all duration-150 select-none',
            open
              ? 'rounded-t-lg border-primary-500 ring-2 ring-primary-500/20'
              : 'rounded-lg',
            error
              ? 'border-danger-500 bg-danger-50'
              : open
                ? 'border-primary-500'
                : 'border-medium-grey',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            selected ? 'text-black' : 'text-grey',
            className
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span>{selected?.label ?? placeholder}</span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-grey transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Menu */}
        {open && (
          <div
            role="listbox"
            className="absolute top-full left-0 right-0 bg-white border-[1.5px] border-t-0 border-primary-500 rounded-b-lg z-50 overflow-hidden shadow-lg"
          >
            {options.map((option) => {
              const isActive = option.value === value
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(option)}
                  className={[
                    'px-4 py-2.5 small-text text-dark-grey cursor-pointer transition-colors duration-100',
                    isActive
                      ? 'bg-primary-100 font-medium text-primary-900'
                      : 'hover:bg-light-grey'
                  ].join(' ')}
                >
                  {option.label}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && <span className="tiny-text text-danger-600">{error}</span>}
    </div>
  )
}
