import Link from 'next/link'
import { Fragment } from 'react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface BreadcrumbItem {
  label: string
  href?: string // omit for the last (active) item
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function Breadcrumb(props: BreadcrumbProps) {
  const { items, separator = '/' } = props
  return (
    <nav
      aria-label="breadcrumb"
      className="flex items-center gap-1.5 flex-wrap"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <Fragment key={index}>
            {isLast || !item.href ? (
              <span
                className={`small-text leading-none ${
                  isLast ? 'semibold-text text-primary-900' : 'text-dark-grey'
                }`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="small-text text-dark-grey no-underline hover:text-primary-600 transition-colors leading-none"
              >
                {item.label}
              </Link>
            )}
            {!isLast && (
              <span className="small-text text-grey select-none leading-none">
                {separator}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
