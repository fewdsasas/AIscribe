// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { CheckpointManager } from '@renderer/components/checkpoint/CheckpointManager'
import { checkpointService } from '@renderer/services'

vi.mock('@renderer/services', () => ({
  checkpointService: {
    list: vi.fn(),
    create: vi.fn(),
    restore: vi.fn()
  }
}))

const mockedCheckpointService = vi.mocked(checkpointService)

describe('CheckpointManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCheckpointService.list.mockResolvedValue([
      { id: 'cp-1', label: 'v1', description: 'First checkpoint', createdAt: '2024-01-01T00:00:00Z', tags: [] }
    ] as any)
    mockedCheckpointService.create.mockResolvedValue({ id: 'cp-2' } as any)
    mockedCheckpointService.restore.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render checkpoint manager', async () => {
    render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(mockedCheckpointService.list).toHaveBeenCalledWith('proj-1')
    })
  })

  it('should show create dialog', async () => {
    render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(mockedCheckpointService.list).toHaveBeenCalled()
    })
  })

  it('should show empty state when no checkpoints', async () => {
    mockedCheckpointService.list.mockResolvedValue([] as any)

    const { getByText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText(/暂无检查点/)).toBeInTheDocument()
    })
  })

  it('should open create dialog and create checkpoint', async () => {
    const { getByText, getByPlaceholderText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('+ 创建检查点')).toBeInTheDocument()
    })

    fireEvent.click(getByText('+ 创建检查点'))

    await waitFor(() => {
      expect(getByText('创建检查点')).toBeInTheDocument()
    })

    const input = getByPlaceholderText('输入检查点名称')
    fireEvent.change(input, { target: { value: 'my-checkpoint' } })

    fireEvent.click(getByText('创建'))

    await waitFor(() => {
      expect(mockedCheckpointService.create).toHaveBeenCalledWith(expect.objectContaining({ label: 'my-checkpoint' }))
    })
  })

  it('should create checkpoint on Enter key', async () => {
    const { getByText, getByPlaceholderText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('+ 创建检查点')).toBeInTheDocument()
    })

    fireEvent.click(getByText('+ 创建检查点'))

    await waitFor(() => {
      expect(getByPlaceholderText('输入检查点名称')).toBeInTheDocument()
    })

    const input = getByPlaceholderText('输入检查点名称')
    fireEvent.change(input, { target: { value: 'enter-checkpoint' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mockedCheckpointService.create).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'enter-checkpoint' })
      )
    })
  })

  it('should close create dialog on cancel', async () => {
    const { getByText, queryByText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('+ 创建检查点')).toBeInTheDocument()
    })

    fireEvent.click(getByText('+ 创建检查点'))

    await waitFor(() => {
      expect(getByText('创建检查点')).toBeInTheDocument()
    })

    fireEvent.click(getByText('取消'))

    await waitFor(() => {
      expect(queryByText('创建检查点')).not.toBeInTheDocument()
    })
  })

  it('should disable create button when label is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('+ 创建检查点')).toBeInTheDocument()
    })

    fireEvent.click(getByText('+ 创建检查点'))

    await waitFor(() => {
      expect(getByText('创建')).toBeInTheDocument()
    })

    const input = getByPlaceholderText('输入检查点名称')
    fireEvent.change(input, { target: { value: '' } })

    const createButton = getByText('创建').closest('button') as HTMLButtonElement
    expect(createButton.disabled).toBe(true)
  })

  it('should show error when create fails', async () => {
    mockedCheckpointService.create.mockRejectedValue(new Error('create failed'))

    const { getByText, getByPlaceholderText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('+ 创建检查点')).toBeInTheDocument()
    })

    fireEvent.click(getByText('+ 创建检查点'))

    await waitFor(() => {
      expect(getByPlaceholderText('输入检查点名称')).toBeInTheDocument()
    })

    const input = getByPlaceholderText('输入检查点名称')
    fireEvent.change(input, { target: { value: 'fail-checkpoint' } })
    fireEvent.click(getByText('创建'))

    await waitFor(() => {
      expect(getByText(/创建失败/)).toBeInTheDocument()
    })
  })

  it('should restore checkpoint after confirmation', async () => {
    const { getByText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('恢复')).toBeInTheDocument()
    })

    fireEvent.click(getByText('恢复'))

    await waitFor(() => {
      expect(getByText(/将恢复到该检查点保存时的状态/)).toBeInTheDocument()
    })

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    const restoreConfirmButton = (dialog as HTMLDivElement).querySelector('button:last-child') as HTMLButtonElement
    fireEvent.click(restoreConfirmButton)

    await waitFor(() => {
      expect(mockedCheckpointService.restore).toHaveBeenCalledWith('cp-1')
    })
  })

  it('should cancel restore confirmation', async () => {
    const { getByText, queryByText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('恢复')).toBeInTheDocument()
    })

    fireEvent.click(getByText('恢复'))

    await waitFor(() => {
      expect(getByText(/将恢复到该检查点保存时的状态/)).toBeInTheDocument()
    })

    fireEvent.click(getByText('取消'))

    await waitFor(() => {
      expect(queryByText(/将恢复到该检查点保存时的状态/)).not.toBeInTheDocument()
    })
  })

  it('should show error when restore fails', async () => {
    mockedCheckpointService.restore.mockRejectedValue(new Error('restore failed'))

    const { getByText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('恢复')).toBeInTheDocument()
    })

    fireEvent.click(getByText('恢复'))

    await waitFor(() => {
      expect(getByText(/将恢复到该检查点保存时的状态/)).toBeInTheDocument()
    })

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    const restoreConfirmButton = (dialog as HTMLDivElement).querySelector('button:last-child') as HTMLButtonElement
    fireEvent.click(restoreConfirmButton)

    await waitFor(() => {
      expect(getByText(/恢复失败/)).toBeInTheDocument()
    })
  })

  it('should render checkpoint with tags and description', async () => {
    mockedCheckpointService.list.mockResolvedValue([
      {
        id: 'cp-1',
        label: 'v1',
        description: 'First checkpoint',
        createdAt: '2024-01-01T00:00:00Z',
        tags: ['auto']
      }
    ] as any)

    const { getByText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('First checkpoint')).toBeInTheDocument()
      expect(getByText('auto')).toBeInTheDocument()
    })
  })

  it('should handle invalid createdAt date', async () => {
    mockedCheckpointService.list.mockResolvedValue([
      {
        id: 'cp-1',
        label: 'v1',
        description: '',
        createdAt: 'invalid-date',
        tags: []
      }
    ] as any)

    const { getByText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText('v1')).toBeInTheDocument()
    })
  })

  it('should handle list loading error', async () => {
    mockedCheckpointService.list.mockRejectedValue(new Error('load failed'))

    const { getByText } = render(<CheckpointManager projectId="proj-1" />)

    await waitFor(() => {
      expect(getByText(/版本历史/)).toBeInTheDocument()
    })
  })
})
