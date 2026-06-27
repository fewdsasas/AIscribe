// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createCheckpointService } from '@renderer/services/checkpointService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { Checkpoint } from '@shared/types'
import type { CreateCheckpointData } from '@shared/types/ipc'

describe('createCheckpointService', () => {
  it('should delegate list to api.checkpointList', async () => {
    const api = createMockAiscribeAPI()
    const service = createCheckpointService(api)
    const checkpoints: Checkpoint[] = [{ id: 'cp1', projectId: 'p1', label: 'v1' } as Checkpoint]
    vi.mocked(api.checkpointList).mockResolvedValue(checkpoints)

    const result = await service.list('p1')

    expect(api.checkpointList).toHaveBeenCalledWith('p1')
    expect(result).toBe(checkpoints)
  })

  it('should delegate create to api.checkpointCreate', async () => {
    const api = createMockAiscribeAPI()
    const service = createCheckpointService(api)
    const data: CreateCheckpointData = { projectId: 'p1', label: 'v1' }
    const checkpoint: Checkpoint = { id: 'cp1', projectId: 'p1', label: 'v1' } as Checkpoint
    vi.mocked(api.checkpointCreate).mockResolvedValue(checkpoint)

    const result = await service.create(data)

    expect(api.checkpointCreate).toHaveBeenCalledWith(data)
    expect(result).toBe(checkpoint)
  })

  it('should delegate restore to api.checkpointRestore', async () => {
    const api = createMockAiscribeAPI()
    const service = createCheckpointService(api)
    vi.mocked(api.checkpointRestore).mockResolvedValue(true)

    const result = await service.restore('cp1')

    expect(api.checkpointRestore).toHaveBeenCalledWith('cp1')
    expect(result).toBe(true)
  })
})
