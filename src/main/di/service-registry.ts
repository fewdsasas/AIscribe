import path from 'path'
import crypto from 'crypto'
import { app } from 'electron'
import { Database } from '../memory/database'
import { LLMProviderFactory } from '../engine/llm-provider-factory'
import type { LLMProvider } from '../engine/llm-provider'
import { SkillLoader } from '../engine/skill-loader'
import { LearningEngine } from '../learning/engine'
import { logger } from '../utils/logger'
import type {
  IDatabase,
  ILearningEngine,
  ILLMProvider,
  ISkillLoader,
  SkillInput,
  SkillResult
} from './service-interfaces'

export const DATABASE_TOKEN = 'database'
export const LLM_PROVIDER_TOKEN = 'llm-provider'
export const SKILL_LOADER_TOKEN = 'skill-loader'
export const LEARNING_ENGINE_TOKEN = 'learning-engine'

export type ServiceToken =
  | typeof DATABASE_TOKEN
  | typeof LLM_PROVIDER_TOKEN
  | typeof SKILL_LOADER_TOKEN
  | typeof LEARNING_ENGINE_TOKEN

/**
 * Lightweight dependency-injection registry.
 *
 * The registry holds service factories and resolves them lazily. This keeps
 * the main process free of module-level singletons and makes IPC handlers,
 * business logic, and tests depend on abstractions instead of concrete
 * implementations.
 */
export class ServiceRegistry {
  private factories = new Map<ServiceToken | string, () => unknown>()
  private instances = new Map<ServiceToken | string, unknown>()

  register<T>(token: ServiceToken | string, factory: () => T): void {
    this.factories.set(token, factory as () => unknown)
  }

  resolve<T>(token: ServiceToken | string): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T
    }
    const factory = this.factories.get(token)
    if (!factory) {
      throw new Error(`Service not registered: ${token}`)
    }
    const instance = factory()
    this.instances.set(token, instance)
    return instance as T
  }

  /**
   * Replace a resolved (or unresolved) service with a custom instance.
   * Useful in tests to inject mocks without rebuilding the whole registry.
   */
  set<T>(token: ServiceToken | string, instance: T): void {
    this.instances.set(token, instance)
  }

  /** Return true if the token has a registered factory or instance. */
  has(token: ServiceToken | string): boolean {
    return this.factories.has(token) || this.instances.has(token)
  }

  /**
   * Async variant of resolve. The default implementation simply awaits the
   * synchronous resolver; callers may override this on the instance for
   * services that require async initialization (e.g. the Database).
   */
  resolveAsync = async <T>(token: ServiceToken | string): Promise<T> => {
    return this.resolve<T>(token)
  }

  /** Close stateful services in reverse initialization order. */
  async close(): Promise<void> {
    const learning = this.instances.get(LEARNING_ENGINE_TOKEN) as ILearningEngine | undefined
    if (learning) {
      try {
        learning.close()
      } catch (e) {
        logger.error('Failed to close learning engine:', e)
      }
    }

    const db = this.instances.get(DATABASE_TOKEN) as IDatabase | undefined
    if (db) {
      try {
        db.close()
      } catch (e) {
        logger.error('Failed to close database:', e)
      }
    }

    this.instances.clear()
  }
}

/**
 * Adapter that exposes an LLMProvider instance through the ILLMProvider
 * interface. This removes the direct dependency on static singletons while
 * keeping the public IPC-facing contract stable.
 */
class LLMProviderAdapter implements ILLMProvider {
  constructor(private provider: LLMProvider) {}

  configure(config: Parameters<ILLMProvider['configure']>[0]): void {
    this.provider.configure(config)
  }

  resetConfig(): void {
    this.provider.resetConfig()
  }

  chat(
    request: Parameters<ILLMProvider['chat']>[0],
    provider?: Parameters<ILLMProvider['chat']>[1]
  ): ReturnType<ILLMProvider['chat']> {
    return this.provider.chat(request, provider)
  }

  testConnection(config: Parameters<ILLMProvider['testConnection']>[0]): ReturnType<ILLMProvider['testConnection']> {
    return this.provider.testConnection(config)
  }

  chatStream(
    request: Parameters<ILLMProvider['chatStream']>[0],
    callbacks: Parameters<ILLMProvider['chatStream']>[1],
    provider?: Parameters<ILLMProvider['chatStream']>[2],
    requestId?: Parameters<ILLMProvider['chatStream']>[3]
  ): ReturnType<ILLMProvider['chatStream']> {
    return this.provider.chatStream(request, callbacks, provider, requestId)
  }

  cancelStream(requestId: string): boolean {
    return this.provider.cancelStream(requestId)
  }
}

/**
 * Adapter that exposes SkillLoader through the ISkillLoader interface.
 * SkillLoader is already instance-based, so this is a thin compatibility layer.
 */
class SkillLoaderAdapter implements ISkillLoader {
  constructor(private loader: SkillLoader) {}

  getRegistry(): { name: string; description: string; category: string }[] {
    return this.loader.getRegistry().map(s => ({
      name: s.name,
      description: s.description,
      category: s.category
    }))
  }

  getSkill(name: string): { name: string; description: string; category: string } | null {
    const skill = this.loader.getSkill(name)
    if (!skill) return null
    return {
      name: skill.name,
      description: skill.description,
      category: skill.category
    }
  }

  executeSkill(name: string, input: SkillInput): Promise<SkillResult> {
    return this.loader.executeSkill(name, input)
  }
}

/**
 * Adapter that exposes LearningEngine through the ILearningEngine interface.
 */
class LearningEngineAdapter implements ILearningEngine {
  constructor(private engine: LearningEngine) {}

  async recordInteraction(data: Parameters<ILearningEngine['recordInteraction']>[0]): Promise<void> {
    return this.engine.recordInteraction(data)
  }

  async analyzeProject(projectId: string): ReturnType<ILearningEngine['analyzeProject']> {
    return this.engine.analyzeProject(projectId)
  }

  getProjectSummary(projectId: string): ReturnType<ILearningEngine['getProjectSummary']> {
    return this.engine.getProjectSummary(projectId)
  }

  getRecorder(): ReturnType<ILearningEngine['getRecorder']> {
    return this.engine.getRecorder()
  }

  close(): void {
    return this.engine.close()
  }
}

/**
 * Create the production service registry with default implementations.
 *
 * The database path is resolved from Electron's userData directory. Callers
 * can override factories via `register()` or inject mocks via `set()` before
 * any handler resolves a service.
 */
export async function createDefaultServiceRegistry(): Promise<ServiceRegistry> {
  const registry = new ServiceRegistry()

  // Database is async to create; cache the promise so concurrent resolves share one instance.
  let dbPromise: Promise<IDatabase> | null = null
  const getDbInstance = async (): Promise<IDatabase> => {
    if (!dbPromise) {
      dbPromise = (async () => {
        const dbPath = path.join(app.getPath('userData'), 'aiscribe.db')
        return Database.create(dbPath)
      })().catch(e => {
        dbPromise = null
        logger.error('Database initialization failed:', e)
        throw e
      })
    }
    return dbPromise
  }

  registry.register(DATABASE_TOKEN, () => {
    throw new Error('Database must be resolved asynchronously via registry.resolveAsync()')
  })

  registry.register(LLM_PROVIDER_TOKEN, () => {
    const provider = LLMProviderFactory.create()
    provider.initFromStorage()
    return new LLMProviderAdapter(provider)
  })
  registry.register(SKILL_LOADER_TOKEN, () => {
    const llm = registry.resolve<ILLMProvider>(LLM_PROVIDER_TOKEN)
    return new SkillLoaderAdapter(new SkillLoader(llm))
  })
  registry.register(LEARNING_ENGINE_TOKEN, () => {
    // Wait for the actual Database instance; this is safe because handlers use async resolveAsync().
    throw new Error('LearningEngine must be resolved asynchronously')
  })

  // Patch resolveAsync for services that require async initialization.
  registry.resolveAsync = async <T>(token: ServiceToken | string): Promise<T> => {
    if (token === DATABASE_TOKEN) {
      return (await getDbInstance()) as T
    }
    if (token === LEARNING_ENGINE_TOKEN) {
      const db = await getDbInstance()
      const writerId = crypto.createHash('sha256').update(app.getPath('userData')).digest('hex').slice(0, 32)
      const engine = LearningEngine.create(db, writerId)
      engine.setSaveProfileCallback(async profile => {
        try {
          db.saveWriterModel(profile)
        } catch (e) {
          logger.error('Learning profile save failed:', e)
        }
      })
      registry.set(LEARNING_ENGINE_TOKEN, new LearningEngineAdapter(engine))
      return registry.resolve<T>(LEARNING_ENGINE_TOKEN)
    }
    return registry.resolve<T>(token)
  }

  // Seed the database instance eagerly so sync resolves work after init.
  const db = await getDbInstance()
  registry.set(DATABASE_TOKEN, db)

  return registry
}
