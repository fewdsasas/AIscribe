import { afterEach, describe, expect, it, vi } from 'vitest'
import path from 'path'

vi.mock('electron', () => ({
  app: {
    getPath: () => path.join(__dirname, '../../temp/service-registry-test'),
    on: () => {}
  }
}))

vi.mock('../../../src/main/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

import {
  DATABASE_TOKEN,
  LEARNING_ENGINE_TOKEN,
  LLM_PROVIDER_TOKEN,
  ServiceRegistry,
  SKILL_LOADER_TOKEN
} from '../../../src/main/di/service-registry'
import type { IDatabase, ILearningEngine, ILLMProvider, ISkillLoader } from '../../../src/main/di/service-interfaces'

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should register and resolve services lazily', () => {
    registry = new ServiceRegistry()
    const factory = vi.fn(() => ({ value: 42 }))

    registry.register('my-service', factory)
    expect(registry.has('my-service')).toBe(true)

    const instance = registry.resolve<{ value: number }>('my-service')
    expect(instance.value).toBe(42)
    expect(factory).toHaveBeenCalledTimes(1)

    const cached = registry.resolve<{ value: number }>('my-service')
    expect(cached).toBe(instance)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('should throw when resolving unregistered service', () => {
    registry = new ServiceRegistry()
    expect(() => registry.resolve('unknown')).toThrow('Service not registered: unknown')
  })

  it('should set instance directly', () => {
    registry = new ServiceRegistry()
    registry.set('direct', { value: 1 })
    expect(registry.has('direct')).toBe(true)
    expect(registry.resolve<{ value: number }>('direct').value).toBe(1)
  })

  it('should resolve async services', async () => {
    registry = new ServiceRegistry()
    registry.register('async', () => Promise.resolve({ value: 2 }))
    const instance = await registry.resolveAsync<{ value: number }>('async')
    expect(instance.value).toBe(2)
  })

  it('should resolve services registered with registerAsync', async () => {
    registry = new ServiceRegistry()
    const factory = vi.fn().mockResolvedValue({ value: 3 })
    registry.registerAsync('async-service', factory)
    const instance = await registry.resolveAsync<{ value: number }>('async-service')
    expect(instance.value).toBe(3)
    expect(factory).toHaveBeenCalledTimes(1)

    const cached = await registry.resolveAsync<{ value: number }>('async-service')
    expect(cached).toBe(instance)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('should include async-registered services in has()', () => {
    registry = new ServiceRegistry()
    registry.registerAsync('async-only', async () => ({ value: 4 }))
    expect(registry.has('async-only')).toBe(true)
  })

  it('should close stateful services', async () => {
    registry = new ServiceRegistry()
    const learning: ILearningEngine = { close: vi.fn() } as unknown as ILearningEngine
    const db: IDatabase = { close: vi.fn() } as unknown as IDatabase

    registry.set(LEARNING_ENGINE_TOKEN, learning)
    registry.set(DATABASE_TOKEN, db)

    await registry.close()
    expect(learning.close).toHaveBeenCalled()
    expect(db.close).toHaveBeenCalled()
    expect(registry.has(LEARNING_ENGINE_TOKEN)).toBe(false)
  })

  it('should swallow errors when closing services', async () => {
    registry = new ServiceRegistry()
    const learning: ILearningEngine = {
      close: vi.fn(() => {
        throw new Error('learning close failed')
      })
    } as unknown as ILearningEngine
    const db: IDatabase = {
      close: vi.fn(() => {
        throw new Error('db close failed')
      })
    } as unknown as IDatabase

    registry.set(LEARNING_ENGINE_TOKEN, learning)
    registry.set(DATABASE_TOKEN, db)

    await expect(registry.close()).resolves.toBeUndefined()
  })

  it('should close without registered services', async () => {
    registry = new ServiceRegistry()
    await expect(registry.close()).resolves.toBeUndefined()
  })

  it('should use typed tokens for built-in services', () => {
    registry = new ServiceRegistry()
    const llm: ILLMProvider = { configure: vi.fn() } as unknown as ILLMProvider
    const skillLoader: ISkillLoader = { getRegistry: vi.fn(() => []) } as unknown as ISkillLoader

    registry.register(LLM_PROVIDER_TOKEN, () => llm)
    registry.register(SKILL_LOADER_TOKEN, () => skillLoader)

    expect(registry.resolve<ILLMProvider>(LLM_PROVIDER_TOKEN)).toBe(llm)
    expect(registry.resolve<ISkillLoader>(SKILL_LOADER_TOKEN)).toBe(skillLoader)
  })
})
