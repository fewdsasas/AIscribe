// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createSkillService } from '@renderer/services/skillService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { SkillDetailItem, SkillInvokeResult, SkillListItem } from '@shared/types/ipc'

describe('createSkillService', () => {
  it('should delegate list to api.skillList', async () => {
    const api = createMockAiscribeAPI()
    const service = createSkillService(api)
    const skills: SkillListItem[] = [{ name: 'novel-master', description: '...' }]
    vi.mocked(api.skillList).mockResolvedValue(skills)

    const result = await service.list()

    expect(api.skillList).toHaveBeenCalled()
    expect(result).toBe(skills)
  })

  it('should delegate get to api.skillGet', async () => {
    const api = createMockAiscribeAPI()
    const service = createSkillService(api)
    const detail: SkillDetailItem = { name: 'novel-master', description: '...', category: 'planning' }
    vi.mocked(api.skillGet).mockResolvedValue(detail)

    const result = await service.get('novel-master')

    expect(api.skillGet).toHaveBeenCalledWith('novel-master')
    expect(result).toBe(detail)
  })

  it('should return null when api.skillGet returns null', async () => {
    const api = createMockAiscribeAPI()
    const service = createSkillService(api)
    vi.mocked(api.skillGet).mockResolvedValue(null)

    const result = await service.get('missing')

    expect(result).toBeNull()
  })

  it('should delegate invoke to api.skillInvoke', async () => {
    const api = createMockAiscribeAPI()
    const service = createSkillService(api)
    const invokeResult: SkillInvokeResult = { skillName: 'novel-master', output: 'result' }
    vi.mocked(api.skillInvoke).mockResolvedValue(invokeResult)

    const result = await service.invoke('novel-master', { prompt: 'hello' })

    expect(api.skillInvoke).toHaveBeenCalledWith('novel-master', { prompt: 'hello' })
    expect(result).toBe(invokeResult)
  })
})
