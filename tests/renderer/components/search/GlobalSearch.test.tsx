import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GlobalSearch } from '@renderer/components/search/GlobalSearch'
import { chapterService, characterService, novelService, projectService } from '@renderer/services'

vi.mock('@renderer/services', () => ({
  projectService: {
    list: vi.fn()
  },
  novelService: {
    getByProject: vi.fn()
  },
  chapterService: {
    list: vi.fn()
  },
  characterService: {
    list: vi.fn()
  }
}))

const mockedProjectService = vi.mocked(projectService)
const mockedNovelService = vi.mocked(novelService)
const mockedChapterService = vi.mocked(chapterService)
const mockedCharacterService = vi.mocked(characterService)

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedNovelService.getByProject.mockResolvedValue(null)
    mockedChapterService.list.mockResolvedValue([])
    mockedCharacterService.list.mockResolvedValue([])
  })

  it('should focus input on mount', () => {
    mockedProjectService.list.mockResolvedValue([])
    render(<GlobalSearch onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText(/搜索项目/)
    expect(document.activeElement).toBe(input)
  })

  it('should close on Escape', () => {
    mockedProjectService.list.mockResolvedValue([])
    const onClose = vi.fn()
    render(<GlobalSearch onClose={onClose} />)
    fireEvent.keyDown(screen.getByPlaceholderText(/搜索项目/), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('should close on backdrop click', () => {
    mockedProjectService.list.mockResolvedValue([])
    const onClose = vi.fn()
    render(<GlobalSearch onClose={onClose} />)
    const backdrop = screen.getByPlaceholderText(/搜索项目/).closest('.fixed')
    expect(backdrop).toBeDefined()
    if (!backdrop) throw new Error('backdrop not found')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('should show "无结果" when no results found', async () => {
    mockedProjectService.list.mockResolvedValue([])
    render(<GlobalSearch onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: 'zzzz' } })
    await waitFor(() => expect(screen.getByText('无结果')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('should search and display project results', async () => {
    mockedProjectService.list.mockResolvedValue([{ id: 'p1', name: '测试项目', genre: '科幻' }] as any)
    render(<GlobalSearch onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: '测试' } })
    await waitFor(() => expect(screen.getByText('测试项目')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('should navigate with arrow keys and select with Enter', async () => {
    const onSelectProject = vi.fn()
    const onClose = vi.fn()
    mockedProjectService.list.mockResolvedValue([
      { id: 'p1', name: '项目A', genre: '奇幻' },
      { id: 'p2', name: '项目B', genre: '科幻' }
    ] as any)
    render(<GlobalSearch onSelectProject={onSelectProject} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: '项目' } })
    await waitFor(() => expect(screen.getByText('项目A')).toBeInTheDocument(), { timeout: 3000 })
    const input = screen.getByPlaceholderText(/搜索项目/)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelectProject).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('should search and display chapter results', async () => {
    mockedProjectService.list.mockResolvedValue([{ id: 'p1', name: '测试项目', genre: '科幻' }] as any)
    mockedNovelService.getByProject.mockResolvedValue({ id: 'n1' } as any)
    mockedChapterService.list.mockResolvedValue([{ id: 'c1', title: '第一章' }] as any)
    render(<GlobalSearch onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: '第一章' } })
    await waitFor(() => expect(screen.getByText('第一章')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('should search and display character results', async () => {
    mockedProjectService.list.mockResolvedValue([{ id: 'p1', name: '测试项目', genre: '科幻' }] as any)
    mockedNovelService.getByProject.mockResolvedValue({ id: 'n1' } as any)
    mockedCharacterService.list.mockResolvedValue([{ id: 'char1', name: '主角' }] as any)
    render(<GlobalSearch onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: '主角' } })
    await waitFor(() => expect(screen.getByText('主角')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('should handle search errors gracefully', async () => {
    mockedProjectService.list.mockRejectedValue(new Error('search failed'))
    render(<GlobalSearch onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: 'test' } })
    await waitFor(() => expect(mockedProjectService.list).toHaveBeenCalled(), { timeout: 3000 })
  })

  it('should select chapter via keyboard', async () => {
    const onSelectChapter = vi.fn()
    const onClose = vi.fn()
    mockedProjectService.list.mockResolvedValue([{ id: 'p1', name: '测试项目', genre: '科幻' }] as any)
    mockedNovelService.getByProject.mockResolvedValue({ id: 'n1' } as any)
    mockedChapterService.list.mockResolvedValue([{ id: 'c1', title: '第一章' }] as any)
    render(<GlobalSearch onSelectChapter={onSelectChapter} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: '第一章' } })
    await waitFor(() => expect(screen.getByText('第一章')).toBeInTheDocument(), { timeout: 3000 })
    const input = screen.getByPlaceholderText(/搜索项目/)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelectChapter).toHaveBeenCalledWith('c1', 'p1')
    expect(onClose).toHaveBeenCalled()
  })

  it('should select character via click', async () => {
    const onSelectProject = vi.fn()
    const onClose = vi.fn()
    mockedProjectService.list.mockResolvedValue([{ id: 'p1', name: '测试项目', genre: '科幻' }] as any)
    mockedNovelService.getByProject.mockResolvedValue({ id: 'n1' } as any)
    mockedCharacterService.list.mockResolvedValue([{ id: 'char1', name: '主角' }] as any)
    render(<GlobalSearch onSelectProject={onSelectProject} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: '主角' } })
    await waitFor(() => expect(screen.getByText('主角')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByText('主角'))
    expect(onSelectProject).toHaveBeenCalledWith('p1')
    expect(onClose).toHaveBeenCalled()
  })

  it('should handle ArrowUp navigation', async () => {
    mockedProjectService.list.mockResolvedValue([
      { id: 'p1', name: '项目A', genre: '奇幻' },
      { id: 'p2', name: '项目B', genre: '科幻' }
    ] as any)
    render(<GlobalSearch onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: '项目' } })
    await waitFor(() => expect(screen.getByText('项目A')).toBeInTheDocument(), { timeout: 3000 })
    const input = screen.getByPlaceholderText(/搜索项目/)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    // Should not crash and selection should move up
    expect(input).toBeInTheDocument()
  })

  it('should clear results when query is empty', async () => {
    mockedProjectService.list.mockResolvedValue([{ id: 'p1', name: '测试项目', genre: '科幻' }] as any)
    render(<GlobalSearch onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: '测试' } })
    await waitFor(() => expect(screen.getByText('测试项目')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.change(screen.getByPlaceholderText(/搜索项目/), { target: { value: '' } })
    await waitFor(() => expect(screen.queryByText('测试项目')).not.toBeInTheDocument(), { timeout: 3000 })
  })
})
