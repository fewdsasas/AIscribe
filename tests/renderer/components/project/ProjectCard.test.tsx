// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProjectCard } from '@renderer/components/project/ProjectCard'
import type { Project } from '@shared/types'

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: '测试作品',
    description: '简介内容',
    genre: '玄幻',
    status: 'writing',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-15T12:00:00Z',
    wordCount: 50000,
    targetWordCount: 100000,
    ...overrides
  }
}

describe('ProjectCard', () => {
  it('should render project info', () => {
    render(<ProjectCard project={createProject()} onClick={vi.fn()} />)

    expect(screen.getByText('测试作品')).toBeInTheDocument()
    expect(screen.getByText('玄幻')).toBeInTheDocument()
    expect(screen.getByText('写作中')).toBeInTheDocument()
  })

  it('should call onClick when card clicked', () => {
    const onClick = vi.fn()
    render(<ProjectCard project={createProject()} onClick={onClick} />)

    fireEvent.click(screen.getByText('测试作品').closest('div') as HTMLElement)
    expect(onClick).toHaveBeenCalledWith('p1')
  })

  it('should render default icon for unknown genre', () => {
    render(<ProjectCard project={createProject({ genre: '未知' })} onClick={vi.fn()} />)
    expect(screen.getByText('📖')).toBeInTheDocument()
  })

  it('should render progress bar when targetWordCount > 0', () => {
    render(<ProjectCard project={createProject({ wordCount: 25000, targetWordCount: 100000 })} onClick={vi.fn()} />)
    expect(screen.getByText('25,000 / 100,000 字')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('should not render progress when targetWordCount is 0', () => {
    const { container } = render(<ProjectCard project={createProject({ targetWordCount: 0 })} onClick={vi.fn()} />)
    expect(container.textContent).not.toContain('字')
  })

  it('should cap progress at 100%', () => {
    render(<ProjectCard project={createProject({ wordCount: 150000, targetWordCount: 100000 })} onClick={vi.fn()} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('should use planning status as fallback for unknown status', () => {
    render(<ProjectCard project={createProject({ status: 'unknown' as any })} onClick={vi.fn()} />)
    expect(screen.getByText('规划中')).toBeInTheDocument()
  })

  it('should call onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<ProjectCard project={createProject()} onClick={vi.fn()} onDelete={onDelete} />)

    fireEvent.click(screen.getByTitle('删除'))
    expect(onDelete).toHaveBeenCalledWith('p1')
  })

  it('should call onSettings when settings button clicked', () => {
    const onSettings = vi.fn()
    render(<ProjectCard project={createProject()} onClick={vi.fn()} onSettings={onSettings} />)

    fireEvent.click(screen.getByTitle('设置'))
    expect(onSettings).toHaveBeenCalledWith('p1')
  })

  it('should call onExport when export button clicked', () => {
    const onExport = vi.fn()
    render(<ProjectCard project={createProject()} onClick={vi.fn()} onExport={onExport} />)

    fireEvent.click(screen.getByTitle('导出'))
    expect(onExport).toHaveBeenCalledWith('p1')
  })

  it('should not call onClick when action button clicked', () => {
    const onClick = vi.fn()
    render(<ProjectCard project={createProject()} onClick={onClick} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByTitle('删除'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('should format updatedAt date', () => {
    render(<ProjectCard project={createProject()} onClick={vi.fn()} />)
    expect(screen.getByText(/2024.*更新/)).toBeInTheDocument()
  })

  it('should show dash for invalid date', () => {
    render(<ProjectCard project={createProject({ updatedAt: 'invalid' })} onClick={vi.fn()} />)
    expect(screen.getByText('— 更新')).toBeInTheDocument()
  })
})
