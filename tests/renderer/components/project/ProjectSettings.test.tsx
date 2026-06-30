// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProjectSettings } from '@renderer/components/project/ProjectSettings'
import { projectService } from '@renderer/services'
import type { Project } from '@shared/types'

vi.mock('@renderer/services', () => ({
  projectService: {
    get: vi.fn(),
    update: vi.fn()
  }
}))

const mockedProjectService = vi.mocked(projectService)

const mockProject: Project = {
  id: 'p1',
  name: '测试作品',
  description: '测试简介',
  genre: '科幻',
  status: 'writing',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T12:00:00Z',
  wordCount: 10000,
  targetWordCount: 50000
}

describe('ProjectSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedProjectService.get.mockResolvedValue(mockProject)
    mockedProjectService.update.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should load and render project data', async () => {
    render(<ProjectSettings projectId="p1" onClose={vi.fn()} onUpdated={vi.fn()} />)

    await waitFor(() => {
      expect(mockedProjectService.get).toHaveBeenCalledWith('p1')
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue('测试作品')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('测试简介')).toBeInTheDocument()

    const [genreSelect, statusSelect] = screen.getAllByRole('combobox')
    expect((genreSelect as HTMLSelectElement).value).toBe('科幻')
    expect((statusSelect as HTMLSelectElement).value).toBe('writing')

    expect(screen.getByDisplayValue('50000')).toBeInTheDocument()
  })

  it('should not render during loading', () => {
    mockedProjectService.get.mockImplementation(() => new Promise(() => {}))
    const { container } = render(<ProjectSettings projectId="p1" onClose={vi.fn()} onUpdated={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('should call update and close on save', async () => {
    const onClose = vi.fn()
    const onUpdated = vi.fn()

    render(<ProjectSettings projectId="p1" onClose={onClose} onUpdated={onUpdated} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('测试作品')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('测试作品'), { target: { value: '新名字' } })
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockedProjectService.update).toHaveBeenCalledWith('p1', {
        name: '新名字',
        description: '测试简介',
        genre: '科幻',
        status: 'writing',
        targetWordCount: 50000
      })
    })

    expect(onUpdated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('should handle load error gracefully', async () => {
    mockedProjectService.get.mockRejectedValue(new Error('load failed'))

    render(<ProjectSettings projectId="p1" onClose={vi.fn()} onUpdated={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('项目设置')).toBeInTheDocument()
    })
  })

  it('should show error when update fails', async () => {
    mockedProjectService.update.mockRejectedValue(new Error('save failed'))

    render(<ProjectSettings projectId="p1" onClose={vi.fn()} onUpdated={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('测试作品')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(screen.getByText('保存失败: save failed')).toBeInTheDocument()
    })
  })

  it('should close when cancel clicked', async () => {
    const onClose = vi.fn()
    render(<ProjectSettings projectId="p1" onClose={onClose} onUpdated={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('取消')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('取消'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should close when backdrop clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(<ProjectSettings projectId="p1" onClose={onClose} onUpdated={vi.fn()} />)

    await waitFor(() => {
      expect(container.firstChild).not.toBeNull()
    })

    fireEvent.click(container.firstChild as HTMLElement)
    expect(onClose).toHaveBeenCalled()
  })
})
