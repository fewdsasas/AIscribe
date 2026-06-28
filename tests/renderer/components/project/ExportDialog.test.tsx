// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ExportDialog } from '@renderer/components/project/ExportDialog'
import { exportService } from '@renderer/services'

vi.mock('@renderer/services', () => ({
  exportService: {
    exportProject: vi.fn()
  }
}))

const mockedExportService = vi.mocked(exportService)

describe('ExportDialog', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    mockedExportService.exportProject.mockResolvedValue({
      filename: 'test.md',
      content: '# Test Project'
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render export formats', () => {
    render(<ExportDialog projectId="p1" projectName="测试作品" onClose={vi.fn()} />)

    expect(screen.getByText('导出作品')).toBeInTheDocument()
    expect(screen.getByText('Markdown (.md)')).toBeInTheDocument()
    expect(screen.getByText('纯文本 (.txt)')).toBeInTheDocument()
    expect(screen.getByText('网页 (.html)')).toBeInTheDocument()
  })

  it('should change selected format on click', () => {
    render(<ExportDialog projectId="p1" projectName="测试作品" onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('纯文本 (.txt)'))
    expect(screen.getByText('纯文本 (.txt)').closest('button')).toHaveClass('border-[--color-primary]')
  })

  it('should toggle include synopsis checkbox', () => {
    render(<ExportDialog projectId="p1" projectName="测试作品" onClose={vi.fn()} />)

    const checkbox = screen.getByLabelText('包含简介') as HTMLInputElement
    expect(checkbox.checked).toBe(true)

    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(false)
  })

  it('should call exportService and download on export', async () => {
    render(<ExportDialog projectId="p1" projectName="测试作品" onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('导出并下载'))

    await waitFor(() => {
      expect(mockedExportService.exportProject).toHaveBeenCalledWith({
        projectId: 'p1',
        format: 'markdown',
        includeSynopsis: true
      })
    })

    expect(createObjectURLSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    expect(screen.getByText('✅ 已导出 test.md')).toBeInTheDocument()
  })

  it('should show error when export returns null', async () => {
    mockedExportService.exportProject.mockResolvedValue(null as any)

    render(<ExportDialog projectId="p1" projectName="测试作品" onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('导出并下载'))

    await waitFor(() => {
      expect(screen.getByText('❌ 导出失败：未获取到数据')).toBeInTheDocument()
    })
  })

  it('should show error when export throws', async () => {
    mockedExportService.exportProject.mockRejectedValue(new Error('network error'))

    render(<ExportDialog projectId="p1" projectName="测试作品" onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('导出并下载'))

    await waitFor(() => {
      expect(screen.getByText('❌ 导出失败: network error')).toBeInTheDocument()
    })
  })

  it('should close when backdrop clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<ExportDialog projectId="p1" projectName="测试作品" onClose={onClose} />)

    fireEvent.click(container.firstChild as HTMLElement)
    expect(onClose).toHaveBeenCalled()
  })

  it('should not close when dialog content clicked', () => {
    const onClose = vi.fn()
    render(<ExportDialog projectId="p1" projectName="测试作品" onClose={onClose} />)

    fireEvent.click(screen.getByText('导出作品').closest('div') as HTMLElement)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('should close when close button clicked', () => {
    const onClose = vi.fn()
    render(<ExportDialog projectId="p1" projectName="测试作品" onClose={onClose} />)

    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })
})
