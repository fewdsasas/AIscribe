// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createPlotStructureService } from '@renderer/services/plotStructureService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { PlotStructure } from '@shared/types'
import type { SavePlotStructureData } from '@shared/types/ipc'

describe('createPlotStructureService', () => {
  it('should delegate getByNovel to api.plotStructureGetByNovel', async () => {
    const api = createMockAiscribeAPI()
    const service = createPlotStructureService(api)
    const plot: PlotStructure = { id: 'ps1', novelId: 'n1' } as PlotStructure
    vi.mocked(api.plotStructureGetByNovel).mockResolvedValue(plot)

    const result = await service.getByNovel('n1')

    expect(api.plotStructureGetByNovel).toHaveBeenCalledWith('n1')
    expect(result).toBe(plot)
  })

  it('should return null when api.plotStructureGetByNovel returns null', async () => {
    const api = createMockAiscribeAPI()
    const service = createPlotStructureService(api)
    vi.mocked(api.plotStructureGetByNovel).mockResolvedValue(null)

    const result = await service.getByNovel('n1')

    expect(result).toBeNull()
  })

  it('should delegate save to api.plotStructureSave', async () => {
    const api = createMockAiscribeAPI()
    const service = createPlotStructureService(api)
    const data: SavePlotStructureData = { novelId: 'n1', framework: 'three_act', beats: [] }
    const plot: PlotStructure = { id: 'ps1', novelId: 'n1' } as PlotStructure
    vi.mocked(api.plotStructureSave).mockResolvedValue(plot)

    const result = await service.save(data)

    expect(api.plotStructureSave).toHaveBeenCalledWith(data)
    expect(result).toBe(plot)
  })
})
