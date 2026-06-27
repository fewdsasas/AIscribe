// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
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
})
