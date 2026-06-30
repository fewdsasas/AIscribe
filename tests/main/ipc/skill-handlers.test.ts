import { beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'path'
import { createMockRegistry } from '../helpers/mock-registry'
import type { ISkillLoader } from '../../../src/main/di'

const mockHandlers = new Map<string, Function>()
const mockIpcMain = {
  handle: (channel: string, handler: Function) => {
    mockHandlers.set(channel, handler)
  }
}

function getRegisteredHandler(channel: string): Function {
  const handler = mockHandlers.get(channel)
  if (!handler) throw new Error(`handler ${channel} not registered`)
  return handler
}

vi.mock('electron', () => ({
  app: {
    getPath: () => path.join(__dirname, '../../temp'),
    on: () => {}
  }
}))

const mockSkillLoader: ISkillLoader = {
  getRegistry: () => [{ name: 'test-skill', description: 'Test skill', category: 'test' }],
  getSkill: (name: string) => {
    if (name === 'test-skill') {
      return { name: 'test-skill', description: 'Test skill', category: 'test' }
    }
    return null
  },
  executeSkill: (name: string, input: any) => {
    return Promise.resolve({ result: `Executed ${name} with ${input.prompt}` } as any)
  }
}

import { registerSkillHandlers } from '../../../src/main/ipc/skill.ipc'

describe('Skill IPC Handlers', () => {
  beforeAll(() => {
    const registry = createMockRegistry({ skillLoader: mockSkillLoader })
    registerSkillHandlers(mockIpcMain as any, registry)
  })

  describe('skill:list', () => {
    it('should return list of skills', async () => {
      const handler = getRegisteredHandler('skill:list')
      const result = await handler(null)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('description')
    })
  })

  describe('skill:get', () => {
    it('should get a skill by name', async () => {
      const handler = getRegisteredHandler('skill:get')
      const result = await handler(null, 'test-skill')

      expect(result).toBeDefined()
      expect(result?.name).toBe('test-skill')
    })

    it('should return null for unknown skill', async () => {
      const handler = getRegisteredHandler('skill:get')
      const result = await handler(null, 'unknown-skill')

      expect(result).toBeNull()
    })

    it('should reject empty skill name', async () => {
      const handler = getRegisteredHandler('skill:get')
      await expect(handler(null, '')).rejects.toThrow('技能名称 不能为空')
    })
  })

  describe('skill:invoke', () => {
    it('should invoke a skill', async () => {
      const handler = getRegisteredHandler('skill:invoke')
      const result = await handler(null, 'test-skill', { prompt: 'test input' })

      expect(result).toBeDefined()
      expect(result.result).toContain('test-skill')
    })

    it('should reject empty skill name', async () => {
      const handler = getRegisteredHandler('skill:invoke')
      await expect(handler(null, '', { prompt: 'test' })).rejects.toThrow('技能名称 不能为空')
    })

    it('should reject empty prompt', async () => {
      const handler = getRegisteredHandler('skill:invoke')
      await expect(handler(null, 'test-skill', { prompt: '' })).rejects.toThrow('提示词 不能为空')
    })

    it('should reject non-object input', async () => {
      const handler = getRegisteredHandler('skill:invoke')
      await expect(handler(null, 'test-skill', null)).rejects.toThrow('技能输入 格式无效')
      await expect(handler(null, 'test-skill', undefined)).rejects.toThrow('技能输入 格式无效')
    })
  })
})
