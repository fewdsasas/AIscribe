import {
  DATABASE_TOKEN,
  LEARNING_ENGINE_TOKEN,
  LLM_PROVIDER_TOKEN,
  ServiceRegistry,
  SKILL_LOADER_TOKEN
} from '../../../src/main/di'
import type { IDatabase, ILearningEngine, ILLMProvider, ISkillLoader } from '../../../src/main/di'

export interface MockRegistryOptions {
  database?: IDatabase
  llmProvider?: ILLMProvider
  skillLoader?: ISkillLoader
  learningEngine?: ILearningEngine
}

export function createMockRegistry(options: MockRegistryOptions = {}): ServiceRegistry {
  const registry = new ServiceRegistry()
  if (options.database) registry.set(DATABASE_TOKEN, options.database)
  if (options.llmProvider) registry.set(LLM_PROVIDER_TOKEN, options.llmProvider)
  if (options.skillLoader) registry.set(SKILL_LOADER_TOKEN, options.skillLoader)
  if (options.learningEngine) registry.set(LEARNING_ENGINE_TOKEN, options.learningEngine)
  return registry
}
