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

  it('should update genre and target word count', () => {
    render(<ProjectDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />)

    const [genreSelect, targetSelect] = screen.getAllByRole('combobox')

    fireEvent.change(genreSelect, { target: { value: '科幻' } })
    fireEvent.change(targetSelect, { target: { value: '300000' } })

    expect((genreSelect as HTMLSelectElement).value).toBe('科幻')
    expect((targetSelect as HTMLSelectElement).value).toBe('300000')
  })

  it('should show error when project creation returns no id', async () => {
    mockedProjectService.create.mockResolvedValue({ id: '', name: 'Bad' } as any)

    render(<ProjectDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('输入小说名称'), { target: { value: 'Bad' } })
    fireEvent.click(screen.getByText('创建项目'))

    await waitFor(() => {
      expect(screen.getByText('创建失败，请重试')).toBeInTheDocument()
    })
  })

  it('should show error when novel creation fails', async () => {
    mockedNovelService.create.mockResolvedValue(null as any)

    render(<ProjectDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('输入小说名称'), { target: { value: 'My Novel' } })
    fireEvent.click(screen.getByText('创建项目'))

    await waitFor(() => {
      expect(screen.getByText('小说创建失败，项目可能已部分创建')).toBeInTheDocument()
    })
  })

  it('should still call onCreated when chapter creation fails', async () => {
    mockedChapterService.create.mockRejectedValue(new Error('chapter error'))
    const onCreated = vi.fn()

    render(<ProjectDialog open={true} onClose={vi.fn()} onCreated={onCreated} />)

    fireEvent.change(screen.getByPlaceholderText('输入小说名称'), { target: { value: 'My Novel' } })
    fireEvent.click(screen.getByText('创建项目'))

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith('proj-1')
    })
  })

  it('should show error when project creation throws', async () => {
    mockedProjectService.create.mockRejectedValue(new Error('create error'))

    render(<ProjectDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('输入小说名称'), { target: { value: 'My Novel' } })
    fireEvent.click(screen.getByText('创建项目'))

    await waitFor(() => {
      expect(screen.getByText('创建失败: create error')).toBeInTheDocument()
    })
  })

  it('should not close when creating', () => {
    mockedProjectService.create.mockImplementation(() => new Promise(() => {}))
    const onClose = vi.fn()

    render(<ProjectDialog open={true} onClose={onClose} onCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('输入小说名称'), { target: { value: 'My Novel' } })
    fireEvent.click(screen.getByText('创建项目'))

    fireEvent.click(screen.getByText('✕'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('should not close backdrop when creating', () => {
    mockedProjectService.create.mockImplementation(() => new Promise(() => {}))
    const onClose = vi.fn()

    const { container } = render(<ProjectDialog open={true} onClose={onClose} onCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('输入小说名称'), { target: { value: 'My Novel' } })
    fireEvent.click(screen.getByText('创建项目'))

    fireEvent.click(container.firstChild as HTMLElement)
    expect(onClose).not.toHaveBeenCalled()
  })
})
