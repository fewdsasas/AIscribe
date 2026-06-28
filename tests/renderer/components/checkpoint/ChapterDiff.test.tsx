// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChapterDiff } from '@renderer/components/checkpoint/ChapterDiff'
import { checkpointService } from '@renderer/services'

vi.mock('@renderer/services', () => ({
  checkpointService: {
    list: vi.fn(),
    restore: vi.fn()
  }
}))

const mockedCheckpointService = vi.mocked(checkpointService)

describe('ChapterDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should show message when fewer than 2 checkpoints', async () => {
    mockedCheckpointService.list.mockResolvedValue([
      { id: 'cp-1', label: 'v1', createdAt: '2024-01-01T00:00:00Z' }
    ] as any)

    render(<ChapterDiff projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText(/需要至少 2 个检查点/)).toBeInTheDocument()
    })
  })

  it('should render checkpoint selectors when at least 2 checkpoints exist', async () => {
    mockedCheckpointService.list.mockResolvedValue([
      { id: 'cp-1', label: 'v1', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'cp-2', label: 'v2', createdAt: '2024-01-02T00:00:00Z' }
    ] as any)

    render(<ChapterDiff projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('对比版本')).toBeInTheDocument()
    })
    expect(mockedCheckpointService.list).toHaveBeenCalledWith('proj-1')
  })

  it('should compare selected checkpoints', async () => {
    mockedCheckpointService.list.mockResolvedValue([
      { id: 'cp-1', label: 'v1', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'cp-2', label: 'v2', createdAt: '2024-01-02T00:00:00Z' }
    ] as any)
    mockedCheckpointService.restore
      .mockResolvedValueOnce({ novel: 'old content' } as any)
      .mockResolvedValueOnce({ novel: 'new content' } as any)

    render(<ChapterDiff projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('对比版本')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('对比版本'))

    await waitFor(() => {
      expect(mockedCheckpointService.restore).toHaveBeenCalledWith('cp-1')
      expect(mockedCheckpointService.restore).toHaveBeenCalledWith('cp-2')
    })

    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('should stringify non-string novel snapshots', async () => {
    mockedCheckpointService.list.mockResolvedValue([
      { id: 'cp-1', label: 'v1', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'cp-2', label: 'v2', createdAt: '2024-01-02T00:00:00Z' }
    ] as any)
    mockedCheckpointService.restore
      .mockResolvedValueOnce({ novel: { title: 'Old' } } as any)
      .mockResolvedValueOnce({ novel: { title: 'New' } } as any)

    render(<ChapterDiff projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('对比版本')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('对比版本'))

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument()
    })
  })

  it('should handle list loading error gracefully', async () => {
    mockedCheckpointService.list.mockRejectedValue(new Error('load failed'))

    render(<ChapterDiff projectId="proj-1" />)

    await waitFor(() => {
      expect(mockedCheckpointService.list).toHaveBeenCalledWith('proj-1')
    })
    expect(screen.getByText(/需要至少 2 个检查点/)).toBeInTheDocument()
  })

  it('should handle compare error gracefully', async () => {
    mockedCheckpointService.list.mockResolvedValue([
      { id: 'cp-1', label: 'v1', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'cp-2', label: 'v2', createdAt: '2024-01-02T00:00:00Z' }
    ] as any)
    mockedCheckpointService.restore.mockRejectedValue(new Error('compare failed'))

    render(<ChapterDiff projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('对比版本')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('对比版本'))

    await waitFor(() => {
      expect(mockedCheckpointService.restore).toHaveBeenCalled()
    })
  })
})
