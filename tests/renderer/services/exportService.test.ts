// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createExportService } from '@renderer/services/exportService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { ExportResult } from '@shared/types/ipc'

describe('createExportService', () => {
  it('should delegate exportProject to api.exportProject', async () => {
    const api = createMockAiscribeAPI()
    const service = createExportService(api)
    const resultData: ExportResult = { content: '# Export', filename: 'export.md' }
    vi.mocked(api.exportProject).mockResolvedValue(resultData)

    const result = await service.exportProject({ projectId: 'p1', format: 'markdown', includeSynopsis: true })

    expect(api.exportProject).toHaveBeenCalledWith({ projectId: 'p1', format: 'markdown', includeSynopsis: true })
    expect(result).toBe(resultData)
  })

  it('should delegate exportProject without optional includeSynopsis', async () => {
    const api = createMockAiscribeAPI()
    const service = createExportService(api)
    const resultData: ExportResult = { content: '# Export', filename: 'export.docx' }
    vi.mocked(api.exportProject).mockResolvedValue(resultData)

    const result = await service.exportProject({ projectId: 'p1', format: 'docx' })

    expect(api.exportProject).toHaveBeenCalledWith({ projectId: 'p1', format: 'docx' })
    expect(result).toBe(resultData)
  })
})
