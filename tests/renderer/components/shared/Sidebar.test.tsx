import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Sidebar } from '../../../../src/renderer/components/shared/Sidebar'

const mockUseResponsive = vi.fn()
vi.mock('../../../../src/renderer/hooks/useResponsive', () => ({
  useResponsive: () => mockUseResponsive()
}))

describe('Sidebar', () => {
  beforeEach(() => {
    mockUseResponsive.mockReturnValue({ isMobile: false })
  })

  it('should render all nav items', () => {
    render(<Sidebar currentView="dashboard" onNavigate={vi.fn()} />)
    expect(screen.getByText('项目')).toBeInTheDocument()
    expect(screen.getByText('写作')).toBeInTheDocument()
    expect(screen.getByText('阅读')).toBeInTheDocument()
    expect(screen.getByText('工作室')).toBeInTheDocument()
    expect(screen.getByText('技能')).toBeInTheDocument()
    expect(screen.getByText('AI 对话')).toBeInTheDocument()
    expect(screen.getByText('设置')).toBeInTheDocument()
  })

  it('should highlight active nav item', () => {
    render(<Sidebar currentView="editor" onNavigate={vi.fn()} />)
    const editorBtn = screen.getByLabelText('写作')
    expect(editorBtn.getAttribute('aria-current')).toBe('page')
    expect(screen.getByLabelText('项目').getAttribute('aria-current')).toBeFalsy()
  })

  it('should call onNavigate when nav item clicked', () => {
    const onNavigate = vi.fn()
    render(<Sidebar currentView="dashboard" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByLabelText('写作'))
    expect(onNavigate).toHaveBeenCalledWith('editor')
  })

  it('should show version in footer', () => {
    render(<Sidebar currentView="dashboard" onNavigate={vi.fn()} />)
    expect(screen.getByText('AIscribe · 0.1.0')).toBeInTheDocument()
  })

  it('should not show hamburger on desktop', () => {
    render(<Sidebar currentView="dashboard" onNavigate={vi.fn()} />)
    expect(screen.queryByLabelText('打开导航菜单')).not.toBeInTheDocument()
  })

  it('should show hamburger and toggle on mobile', () => {
    mockUseResponsive.mockReturnValue({ isMobile: true })
    render(<Sidebar currentView="dashboard" onNavigate={vi.fn()} />)
    expect(screen.getByLabelText('打开导航菜单')).toBeInTheDocument()
  })

  it('should close sidebar on navigate when mobile', () => {
    mockUseResponsive.mockReturnValue({ isMobile: true })
    const onNavigate = vi.fn()
    render(<Sidebar currentView="dashboard" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByLabelText('写作'))
    expect(onNavigate).toHaveBeenCalledWith('editor')
  })
})
