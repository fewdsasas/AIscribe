// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ImportNovelDialog } from '@renderer/components/project/ImportNovelDialog'
import { importService } from '@renderer/services'

vi.mock('@renderer/services', () => ({
  importService: {
    selectNovelFile: vi.fn(),
    novelImport: vi.fn()
  }
}))

const mockedImportService = vi.mocked(importService)

describe('ImportNovelDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render dialog when open', () => {
    render(<ImportNovelDialog open={true} onClose={vi.fn()} onImported={vi.fn()} />)
    expect(screen.getByText('导入小说')).toBeInTheDocument()
    expect(screen.getByText('浏览...')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<ImportNovelDialog open={false} onClose={vi.fn()} onImported={vi.fn()} />)
    expect(screen.queryByText('导入小说')).not.toBeInTheDocument()
  })

  it('should select file and show file name', async () => {
    mockedImportService.selectNovelFile.mockResolvedValue({
      canceled: false,
      filePath: 'C:\\Users\\test\\novel.txt'
    })

    render(<ImportNovelDialog open={true} onClose={vi.fn()} onImported={vi.fn()} />)

    fireEvent.click(screen.getByText('浏览...'))

    await waitFor(() => {
      expect(screen.getByText('novel.txt')).toBeInTheDocument()
    })
    expect(document.body.textContent).toMatch(/检测到格式:\s*TXT/)
  })

  it('should import novel and call onImported', async () => {
    mockedImportService.selectNovelFile.mockResolvedValue({
      canceled: false,
      filePath: 'C:\\Users\\test\\novel.txt'
    })
    mockedImportService.novelImport.mockResolvedValue({
      projectId: 'proj-1',
      novelId: 'novel-1',
      title: 'Imported Novel',
      author: '',
      chapterCount: 3,
      totalWordCount: 3000
    })
    const onImported = vi.fn()

    render(<ImportNovelDialog open={true} onClose={vi.fn()} onImported={onImported} />)

    fireEvent.click(screen.getByText('浏览...'))
    await waitFor(() => expect(screen.getByText('novel.txt')).toBeInTheDocument())

    fireEvent.click(screen.getByText('导入'))

    await waitFor(() => {
      expect(mockedImportService.novelImport).toHaveBeenCalledWith(
        expect.objectContaining({ filePath: 'C:\\Users\\test\\novel.txt', format: 'txt' })
      )
    })

    await waitFor(() => {
      expect(onImported).toHaveBeenCalledWith('proj-1', 'novel-1')
    })
  })

  it('should show error when import fails', async () => {
    mockedImportService.selectNovelFile.mockResolvedValue({
      canceled: false,
      filePath: 'C:\\Users\\test\\novel.txt'
    })
    mockedImportService.novelImport.mockRejectedValue(new Error('parse error'))

    render(<ImportNovelDialog open={true} onClose={vi.fn()} onImported={vi.fn()} />)

    fireEvent.click(screen.getByText('浏览...'))
    await waitFor(() => expect(screen.getByText('novel.txt')).toBeInTheDocument())

    fireEvent.click(screen.getByText('导入'))

    await waitFor(() => {
      expect(screen.getByText('导入失败: parse error')).toBeInTheDocument()
    })
  })

  it('should not import without file selection', () => {
    render(<ImportNovelDialog open={true} onClose={vi.fn()} onImported={vi.fn()} />)

    const importButton = screen.getByText('导入')
    expect(importButton).toBeDisabled()
  })
})
