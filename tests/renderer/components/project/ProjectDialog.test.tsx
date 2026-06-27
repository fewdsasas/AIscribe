// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProjectDialog } from '@renderer/components/project/ProjectDialog'
import { chapterService, novelService, projectService } from '@renderer/services'

vi.mock('@renderer/services', () => ({
  projectService: {
    create: vi.fn()
  },
  novelService: {
    create: vi.fn()
  },
  chapterService: {
    create: vi.fn()
  }
}))

const mockedProjectService = vi.mocked(projectService)
const mockedNovelService = vi.mocked(novelService)
const mockedChapterService = vi.mocked(chapterService)

describe('ProjectDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedProjectService.create.mockResolvedValue({ id: 'proj-1', name: 'Test Project' } as any)
    mockedNovelService.create.mockResolvedValue({ id: 'novel-1', projectId: 'proj-1' } as any)
    mockedChapterService.create.mockResolvedValue({ id: 'ch-1' } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render dialog when open', () => {
    const onClose = vi.fn()
    const onCreated = vi.fn()

    render(<ProjectDialog open={true} onClose={onClose} onCreated={onCreated} />)

    expect(screen.getByText('新建项目')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入小说名称')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    const onClose = vi.fn()
    const onCreated = vi.fn()

    render(<ProjectDialog open={false} onClose={onClose} onCreated={onCreated} />)

    expect(screen.queryByText('新建项目')).not.toBeInTheDocument()
  })

  it('should create project on submit', async () => {
    const onClose = vi.fn()
    const onCreated = vi.fn()

    render(<ProjectDialog open={true} onClose={onClose} onCreated={onCreated} />)

    const input = screen.getByPlaceholderText('输入小说名称')
    fireEvent.change(input, { target: { value: 'My Novel' } })

    const createButton = screen.getByText('创建项目')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockedProjectService.create).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith('proj-1')
    })
  })

  it('should not create project with empty name', async () => {
    const onClose = vi.fn()
    const onCreated = vi.fn()

    render(<ProjectDialog open={true} onClose={onClose} onCreated={onCreated} />)

    const createButton = screen.getByText('创建项目')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockedProjectService.create).not.toHaveBeenCalled()
    })
  })
})
