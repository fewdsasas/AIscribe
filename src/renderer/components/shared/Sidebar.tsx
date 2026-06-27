import React, { useEffect, useRef, useState } from 'react'
import { useResponsive } from '../../hooks/useResponsive'

interface SidebarProps {
  currentView: string
  onNavigate: (view: string) => void
}

interface NavItem {
  id: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: '项目',
    icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'
  },
  {
    id: 'editor',
    label: '写作',
    icon: 'M15.5 2H8.6c-.4 0-.8.2-1.1.5l-3 3.5c-.3.3-.5.7-.5 1.1V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4.5c0-.8-.7-1.5-1.5-1.5zM8 2v3c0 .6-.4 1-1 1H4'
  },
  {
    id: 'reader',
    label: '阅读',
    icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'
  },
  {
    id: 'studio',
    label: '工作室',
    icon: 'M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7m0 0v4a2 2 0 0 0 2 2h4'
  },
  { id: 'workshop', label: '技能', icon: 'M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7' },
  { id: 'ai-chat', label: 'AI 对话', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  {
    id: 'settings',
    label: '设置',
    icon: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'
  }
]

const NavIcon: React.FC<{ d: string }> = ({ d }) => (
  <svg
    className="sidebar-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
)

export const Sidebar = React.memo<SidebarProps>(({ currentView, onNavigate }) => {
  const { isMobile } = useResponsive()
  const [isOpen, setIsOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isMobile, isOpen])

  // Close sidebar on navigate (mobile)
  const handleNavigate = (id: string) => {
    onNavigate(id)
    if (isMobile) setIsOpen(false)
  }

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-3 left-3 z-[60] w-10 h-10 flex items-center justify-center rounded-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          aria-label="打开导航菜单"
          aria-expanded={isOpen}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && <div className="fixed inset-0 bg-black/30 z-[50]" onClick={() => setIsOpen(false)} />}

      <aside
        ref={sidebarRef}
        className={`sidebar transition-transform duration-200 ${
          isMobile ? `fixed top-0 left-0 h-full z-[55] transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}` : ''
        }`}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">A</div>
          <span className="sidebar-logo-text">AIscribe</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" role="navigation" aria-label="主导航">
          {navItems.map(item => {
            const active = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`sidebar-nav-item ${active ? 'sidebar-nav-item-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
              >
                <NavIcon d={item.icon} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">AIscribe · 0.1.0</div>
      </aside>
    </>
  )
})
