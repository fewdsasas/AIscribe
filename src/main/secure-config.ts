import { SecureStore } from './secure-store'
import { logger } from './utils/logger'

const CONFIG_FILE = 'aiscribe-config.enc'
const LLM_CONFIG_FILE = 'aiscribe-llm.enc'

const LLM_CONFIG_KEYS = new Set(['provider', 'apiKey', 'model', 'baseUrl', 'temperature', 'maxTokens'])

export const generalStore = new SecureStore(CONFIG_FILE)
export const llmStore = new SecureStore(LLM_CONFIG_FILE)

let migrationDone = false

function migrateLLMKeys(): void {
  if (migrationDone) return

  if (!generalStore.exists()) {
    migrationDone = true
    return
  }

  const data = generalStore.load()
  if (!data || typeof data !== 'object') {
    migrationDone = true
    return
  }

  const llmKeys: Record<string, unknown> = {}
  let hasLLMKeys = false

  for (const key of LLM_CONFIG_KEYS) {
    if (data[key] !== undefined) {
      llmKeys[key] = data[key]
      hasLLMKeys = true
    }
  }

  if (!hasLLMKeys) {
    migrationDone = true
    return
  }

  llmStore.save(llmKeys)
  for (const key of LLM_CONFIG_KEYS) {
    delete data[key]
  }
  if (Object.keys(data).length > 0) {
    generalStore.save(data)
  } else {
    generalStore.clear()
  }

  logger.info('SecureConfig: migrated LLM config keys to separate encrypted store')
  migrationDone = true
}

export class SecureConfig {
  static save(data: Record<string, unknown>): void {
    migrateLLMKeys()
    generalStore.save(data)
  }

  static load(): Record<string, unknown> | null {
    migrateLLMKeys()
    return generalStore.load()
  }

  static exists(): boolean {
    return generalStore.exists()
  }

  static clear(): void {
    generalStore.clear()
  }
}

export class SecureLLMConfig {
  static save(data: Record<string, unknown>): void {
    llmStore.save(data)
  }

  static load(): Record<string, unknown> | null {
    return llmStore.load()
  }

  static exists(): boolean {
    return llmStore.exists()
  }

  static clear(): void {
    llmStore.clear()
  }
}

export function isLLMConfigKey(key: string): boolean {
  return LLM_CONFIG_KEYS.has(key)
}
