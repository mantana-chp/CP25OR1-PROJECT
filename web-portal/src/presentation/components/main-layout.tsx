'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Newspaper, LogOut, ChevronLeft } from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface MainLayoutProps {
  children: React.ReactNode
  /** Page title shown in the topbar */
  pageTitle?: string
  /** Sidebar navigation items — add/remove freely */
  navItems?: NavItem[]
  /** User info shown at the bottom of the sidebar */
  user?: {
    name: string
    role: string
    avatarUrl?: string
  }
  /** Logo area content */
  logo?: React.ReactNode
}

// ─────────────────────────────────────────────
// Default nav items — override via props
// ─────────────────────────────────────────────
const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    label: 'แดชบอร์ด',
    href: '/dashboard',
    icon: <LayoutDashboard size={18} />
  },
  {
    label: 'ข่าวสาร',
    href: '/news',
    icon: <Newspaper size={18} />
  }
]

const DEFAULT_USER = {
  name: 'สมชาย ใจดี',
  role: 'แอดมิน'
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function MainLayout({
  children,
  pageTitle = 'เฮดเดอร์',
  navItems = DEFAULT_NAV_ITEMS,
  user = DEFAULT_USER,
  logo
}: MainLayoutProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-secondary">
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col bg-white border-r border-light-grey transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0"
        style={{ width: collapsed ? 72 : 280 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 gap-2">
          {logo ?? (
            <div className="flex-1 h-[60px] bg-medium-grey rounded-lg flex items-center justify-center">
              {!collapsed && (
                <span className="small-text semibold-text text-grey">LOGO</span>
              )}
            </div>
          )}
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex-shrink-0 w-7 h-7 border border-light-grey rounded-md bg-transparent cursor-pointer flex items-center justify-center text-grey hover:bg-light-grey transition-colors p-0"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 p-2.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2.5 rounded-lg no-underline transition-all duration-150
                  ${isActive ? 'bg-primary-100' : 'hover:bg-light-grey'}
                  ${collapsed ? 'justify-center p-2.5' : 'justify-start px-3.5 py-2.5'}
                `}
                title={collapsed ? item.label : undefined}
              >
                <span
                  className={`flex-shrink-0 flex items-center justify-center w-5 h-5 ${isActive ? 'text-primary-600' : 'text-grey'}`}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <span
                    className={`small-text medium-text whitespace-nowrap ${isActive ? 'text-primary-900' : 'text-dark-grey'}`}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div
          className={`flex items-center gap-2.5 border-t border-light-grey mt-auto ${collapsed ? 'p-3' : 'p-3.5'}`}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-light-purple flex items-center justify-center overflow-hidden">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="small-text semibold-text text-dark-purple">
                {user.name.charAt(0)}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <span className="tiny-text semibold-text text-black truncate">
                {user.name}
              </span>
              <span className="tiny-text text-grey whitespace-nowrap">
                {user.role}
              </span>
            </div>
          )}
          {!collapsed && (
            <button
              className="flex-shrink-0 w-8 h-8 border-none bg-transparent cursor-pointer flex items-center justify-center text-grey hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors p-0"
              title="ออกจากระบบ"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-7 h-[60px] bg-white border-b border-light-grey flex-shrink-0">
          <h1 className="heading-5 text-black m-0">{pageTitle}</h1>
          {/* Add right-side topbar actions here */}
          <div className="flex items-center gap-3">
            {/* e.g. notifications, theme toggle */}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-7 bg-secondary">
          {children}
        </main>
      </div>
    </div>
  )
}
