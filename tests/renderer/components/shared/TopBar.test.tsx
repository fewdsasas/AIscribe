import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TopBar } from '../../../../src/renderer/components/shared/TopBar'

describe('TopBar', () => {
  it('should render view label for known views', () => {
    render(<TopBar currentView="editor" />)
    expect(screen.getByText('写作')).toBeInTheDocument()
  })

  it('should render fallback label for unknown views', () => {
    render(<TopBar currentView="unknown" />)
    expect(screen.getByText('AIscribe')).toBeInTheDocument()
  })

  it('should show project name when provided', () => {
    render(<TopBar currentView="editor" projectName="My Novel" />)
    expect(screen.getByText('My Novel')).toBeInTheDocument()
  })

  it('should not show project name when not provided', () => {
    render(<TopBar currentView="editor" />)
    expect(screen.queryByText('/')).not.toBeInTheDocument()
  })

  it('should show chat button and call onNavigate when not on ai-chat view', () => {
    const onNavigate = vi.fn()
    render(<TopBar currentView="editor" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByTitle('AI 对话'))
    expect(onNavigate).toHaveBeenCalledWith('ai-chat')
  })

  it('should hide chat button when on ai-chat view', () => {
    render(<TopBar currentView="ai-chat" />)
    expect(screen.queryByTitle('AI 对话')).not.toBeInTheDocument()
  })

  it('should call onToggleTheme when theme button clicked', () => {
    const onToggleTheme = vi.fn()
    render(<TopBar currentView="editor" onToggleTheme={onToggleTheme} />)
    fireEvent.click(screen.getByTitle('切换到暗色模式'))
    expect(onToggleTheme).toHaveBeenCalled()
  })

  it('should render all known view labels correctly', () => {
    const views = [
      ['dashboard', '项目'],
      ['reader', '阅读'],
      ['studio', '工作室'],
      ['workshop', '技能'],
      ['settings', '设置']
    ] as const
    for (const [view, label] of views) {
      const { unmount } = render(<TopBar currentView={view} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })
})
