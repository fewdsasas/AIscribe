import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ReaderView } from '@renderer/views/ReaderView'
import { chapterService, novelService } from '@renderer/services'
import type { Chapter, Novel } from '@shared/types'

const sampleContent = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: '第一章内容' }] }]
})

vi.mock('@renderer/services', () => ({
  novelService: {
    get: vi.fn()
  },
  chapterService: {
    listWithContent: vi.fn()
  }
}))

const mockedNovelService = vi.mocked(novelService)
const mockedChapterService = vi.mocked(chapterService)

describe('ReaderView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedNovelService.get.mockResolvedValue({ id: 'novel-1' } as Novel)
    mockedChapterService.listWithContent.mockResolvedValue([
      { id: 'ch1', title: '第一章', content: sampleContent },
      { id: 'ch2', title: '第二章', content: sampleContent }
    ] as Chapter[])
  })

  it('should show empty state when no projectId', () => {
    render(<ReaderView projectId={null} />)
    expect(screen.getByText('请选择一个项目开始阅读')).toBeInTheDocument()
  })

  it('should load chapters from service and render', async () => {
    render(<ReaderView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument()
    })
    expect(screen.getByText('第一章内容')).toBeInTheDocument()
  })

  it('should allow font size adjustment', async () => {
    mockedChapterService.listWithContent.mockResolvedValue([
      { id: 'ch1', title: '第一章', content: sampleContent }
    ] as Chapter[])
    render(<ReaderView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('第一章内容')).toBeInTheDocument()
    })
    expect(screen.getByText('18px')).toBeInTheDocument()
    fireEvent.click(screen.getByText('A+'))
    expect(screen.getByText('20px')).toBeInTheDocument()
    fireEvent.click(screen.getByText('A-'))
    expect(screen.getByText('18px')).toBeInTheDocument()
  })

  it('should clamp font size between 14 and 28', async () => {
    mockedChapterService.listWithContent.mockResolvedValue([
      { id: 'ch1', title: '第一章', content: sampleContent }
    ] as Chapter[])
    render(<ReaderView projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('第一章内容')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('A-'))
    expect(screen.getByText('16px')).toBeInTheDocument()
  })
})
