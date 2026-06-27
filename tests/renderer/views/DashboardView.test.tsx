// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DashboardView } from '@renderer/views/DashboardView'
import { projectService } from '@renderer/services/projectService'
import type { Project } from '@shared/types'

vi.mock('@renderer/services/projectService', () => ({
  projectService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    dashboardStats: vi.fn()
  }
}))

const mockedProjectService = vi.mocked(projectService)

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedProjectService.list.mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Test Project',
        description: 'A test project',
        genre: 'fantasy',
        status: 'planning',
        wordCount: 0
      } as Project
    ])
    mockedProjectService.dashboardStats.mockResolvedValue([
      { id: 'proj-1', novelCount: 1, chapterCount: 3 } as Project & { novelCount: number; chapterCount: number }
    ])
    mockedProjectService.delete.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render dashboard with projects', async () => {
    const onSelectProject = vi.fn()
    const onNewProject = vi.fn()

    render(<DashboardView onSelectProject={onSelectProject} onNewProject={onNewProject} />)

    await waitFor(() => {
      expect(screen.getByText('我的项目')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    expect(mockedProjectService.list).toHaveBeenCalled()
    expect(mockedProjectService.dashboardStats).toHaveBeenCalled()
  })

  it('should show empty state when no projects', async () => {
    mockedProjectService.list.mockResolvedValueOnce([])

    const onSelectProject = vi.fn()
    const onNewProject = vi.fn()

    render(<DashboardView onSelectProject={onSelectProject} onNewProject={onNewProject} />)

    await waitFor(() => {
      expect(screen.getByText('还没有创作项目')).toBeInTheDocument()
    })
  })

  it('should call onSelectProject when clicking a project', async () => {
    const onSelectProject = vi.fn()
    const onNewProject = vi.fn()

    render(<DashboardView onSelectProject={onSelectProject} onNewProject={onNewProject} />)

    await waitFor(() => {
      const projectCard = screen.getByText('Test Project')
      fireEvent.click(projectCard)
      expect(onSelectProject).toHaveBeenCalledWith('proj-1')
    })
  })

  it('should call projectService.delete when confirming deletion', async () => {
    const onSelectProject = vi.fn()
    const onNewProject = vi.fn()

    render(<DashboardView onSelectProject={onSelectProject} onNewProject={onNewProject} />)

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // ProjectCard renders a delete button with title
    const deleteButton = screen.getByTitle('删除')
    fireEvent.click(deleteButton)

    const confirmButton = screen.getByText('删除')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockedProjectService.delete).toHaveBeenCalledWith('proj-1')
    })
  })
})
