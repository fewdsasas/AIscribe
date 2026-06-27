import type { LLMConfig, LLMProvider as LLMProviderType, LLMRequest, LLMResponse } from '../../shared/types'
import { SecureLLMConfig } from '../secure-config'
import { DEFAULT_ENDPOINTS, LLM_STREAM_TIMEOUT_MS } from '../../shared/constants'
import { validateEndpoint } from './url-validator'

const MAX_STREAM_BUFFER_SIZE = 1024 * 1024

// ===== Type Guards =====

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

function safeGetString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key]
  return isString(value) ? value : undefined
}

function safeGetNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const value = obj[key]
  return isNumber(value) ? value : undefined
}

function safeGetRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = obj[key]
  return isRecord(value) ? value : undefined
}

function safeGetArray(obj: Record<string, unknown>, key: string): unknown[] | undefined {
  const value = obj[key]
  return Array.isArray(value) ? value : undefined
}

// ===== Provider Config Interface =====

interface ProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
  temperature: number
  maxTokens: number
}

// ===== Provider Strategy Interface =====

interface ProviderStrategy {
  getEndpoint(config: ProviderConfig): string
  buildRequestBody(
    config: ProviderConfig,
    messages: { role: string; content: string }[],
    stream: boolean
  ): Record<string, unknown>
  extractContent(data: Record<string, unknown>): string
  extractUsage(
    data: Record<string, unknown>
  ): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined
  buildAuthHeader(config: ProviderConfig): Record<string, string>
  shouldSendStreamFlag(stream: boolean): boolean
}

const openaiStrategy: ProviderStrategy = {
  getEndpoint: config => getOpenAILikeEndpoint(DEFAULT_ENDPOINTS.openai, config),
  buildRequestBody: buildOpenAILikeRequestBody,
  extractContent: extractOpenAILikeContent,
  extractUsage: extractOpenAILikeUsage,
  buildAuthHeader: config => ({ Authorization: `Bearer ${config.apiKey}` }),
  shouldSendStreamFlag: () => true
}

// ===== Shared OpenAI-like helpers =====

function buildOpenAILikeRequestBody(
  config: ProviderConfig,
  messages: { role: string; content: string }[],
  stream: boolean
) {
  return {
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages,
    ...(stream ? { stream: true } : {})
  }
}

function extractOpenAILikeContent(data: Record<string, unknown>): string {
  const choices = safeGetArray(data, 'choices')
  if (choices && choices.length > 0) {
    const first = isRecord(choices[0]) ? choices[0] : undefined
    if (first) {
      const msg = safeGetRecord(first, 'message')
      if (msg) {
        const content = safeGetString(msg, 'content')
        if (content) return content
      }
      const text = safeGetString(first, 'text')
      if (text) return text
    }
  }
  return ''
}

function extractOpenAILikeUsage(
  data: Record<string, unknown>
): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined {
  const usage = safeGetRecord(data, 'usage')
  if (!usage) return undefined
  return {
    promptTokens: safeGetNumber(usage, 'prompt_tokens') ?? 0,
    completionTokens: safeGetNumber(usage, 'completion_tokens') ?? 0,
    totalTokens: safeGetNumber(usage, 'total_tokens') ?? 0
  }
}

function getOpenAILikeEndpoint(defaultUrl: string, config: ProviderConfig): string {
  if (config.baseUrl) {
    const validated = validateEndpoint(config.baseUrl)
    const url = validated.replace(/\/+$/, '')
    return url.endsWith('/chat/completions') ? url : `${url}/chat/completions`
  }
  return defaultUrl
}

// ===== Strategy Implementations =====

const claudeStrategy: ProviderStrategy = {
  getEndpoint: config => {
    if (config.baseUrl) {
      const validated = validateEndpoint(config.baseUrl)
      const url = validated.replace(/\/+$/, '')
      return url.endsWith('/messages') ? url : `${url}/messages`
    }
    return DEFAULT_ENDPOINTS.claude
  },
  buildRequestBody: (config, messages) => {
    const systemMsg = messages.find(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')
    return {
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: chatMessages.map(m => ({ role: m.role, content: m.content }))
    }
  },
  extractContent: data => {
    const content = data.content
    if (Array.isArray(content) && content.length > 0) {
      const first = isRecord(content[0]) ? content[0] : undefined
      if (first) {
        const text = safeGetString(first, 'text')
        if (text) return text
      }
    }
    return ''
  },
  extractUsage: data => {
    const usage = safeGetRecord(data, 'usage')
    if (!usage) return undefined
    const inputTokens = safeGetNumber(usage, 'input_tokens') ?? 0
    const outputTokens = safeGetNumber(usage, 'output_tokens') ?? 0
    return { promptTokens: inputTokens, completionTokens: outputTokens, totalTokens: inputTokens + outputTokens }
  },
  buildAuthHeader: config => ({ Authorization: `Bearer ${config.apiKey}` }),
  shouldSendStreamFlag: () => false
}

const wenxinStrategy: ProviderStrategy = {
  getEndpoint: config => getOpenAILikeEndpoint(DEFAULT_ENDPOINTS.wenxin, config),
  buildRequestBody: buildOpenAILikeRequestBody,
  extractContent: data => (typeof data.result === 'string' ? data.result : ''),
  extractUsage: extractOpenAILikeUsage,
  buildAuthHeader: config => ({ Authorization: config.apiKey }),
  shouldSendStreamFlag: () => true
}

const tongyiStrategy: ProviderStrategy = {
  getEndpoint: config => getOpenAILikeEndpoint(DEFAULT_ENDPOINTS.tongyi, config),
  buildRequestBody: (config, messages, stream) => ({
    model: config.model,
    input: { messages },
    parameters: { temperature: config.temperature, max_tokens: config.maxTokens, result_format: 'message' },
    ...(stream ? { stream: true } : {})
  }),
  extractContent: extractOpenAILikeContent,
  extractUsage: extractOpenAILikeUsage,
  buildAuthHeader: config => ({ Authorization: `Bearer ${config.apiKey}` }),
  shouldSendStreamFlag: () => true
}

const mimoStrategy: ProviderStrategy = {
  getEndpoint: config => getOpenAILikeEndpoint(DEFAULT_ENDPOINTS.mimo, config),
  buildRequestBody: buildOpenAILikeRequestBody,
  extractContent: extractOpenAILikeContent,
  extractUsage: extractOpenAILikeUsage,
  buildAuthHeader: openaiStrategy.buildAuthHeader,
  shouldSendStreamFlag: () => true
}

// ===== Strategy Registry =====

const strategies: Record<string, ProviderStrategy> = {
  openai: openaiStrategy,
  claude: claudeStrategy,
  mimo: mimoStrategy,
  wenxin: wenxinStrategy,
  tongyi: tongyiStrategy
}

export class LLMProvider {
  private configs: Partial<Record<LLMProviderType, ProviderConfig>> = {}
  private defaultProvider: LLMProviderType = 'openai'
  private activeControllers: Map<string, AbortController> = new Map()

  resetConfig(): void {
    this.configs = {}
    this.defaultProvider = 'openai'
  }

  initFromStorage(): void {
    const data = SecureLLMConfig.load()
    if (isRecord(data) && isString(data.apiKey) && isString(data.provider)) {
      this.configure({
        provider: data.provider,
        apiKey: data.apiKey,
        model: isString(data.model) ? data.model : undefined,
        baseUrl: isString(data.baseUrl) ? data.baseUrl : undefined,
        temperature: isNumber(data.temperature) ? data.temperature : undefined,
        maxTokens: isNumber(data.maxTokens) ? data.maxTokens : undefined
      } as LLMConfig)
    }
  }

  configure(config: LLMConfig): void {
    this.configs[config.provider] = {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096
    }
    this.defaultProvider = config.provider
  }

  getConfig(provider: LLMProviderType): ProviderConfig | undefined {
    return this.configs[provider]
  }

  getAllConfigs(): Partial<Record<LLMProviderType, ProviderConfig>> {
    return { ...this.configs }
  }

  getDefaultProvider(): LLMProviderType {
    const config = this.configs[this.defaultProvider]
    if (!config) throw new Error('未配置 LLM 提供商')
    return this.defaultProvider
  }

  private getStrategy(provider: LLMProviderType): ProviderStrategy {
    const strategy = strategies[provider]
    if (!strategy) throw new Error(`未知的提供商策略: ${provider}`)
    return strategy
  }

  private isAbortError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === 'AbortError') return true
    if (error instanceof Error && error.name === 'AbortError') return true
    if (error && typeof error === 'object') {
      const code = (error as Record<string, unknown>).code
      if (code === 'ERR_ABORTED' || code === 20) return true
    }
    return false
  }

  async chat(request: LLMRequest, provider?: LLMProviderType): Promise<LLMResponse> {
    const targetProvider = provider ?? this.defaultProvider
    const config = this.configs[targetProvider]
    if (!config) throw new Error('未配置 LLM 提供商')

    const strategy = this.getStrategy(targetProvider)
    const endpoint = strategy.getEndpoint(config)
    if (!endpoint) throw new Error(`未知的提供商: ${targetProvider}`)

    const messages = request.system
      ? [{ role: 'system' as const, content: request.system }, ...request.messages]
      : request.messages

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), LLM_STREAM_TIMEOUT_MS)

    try {
      const body = strategy.buildRequestBody(config, messages, false)
      if (!strategy.shouldSendStreamFlag(false)) delete body.stream

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...strategy.buildAuthHeader(config)
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMsg = response.statusText
        try {
          const error = await response.json()
          errorMsg = error.error?.message ?? error.error_msg ?? response.statusText
        } catch {
          /* non-JSON error body */
        }
        throw new Error(`API 错误 (${response.status}): ${errorMsg}`)
      }

      const data: Record<string, unknown> = await response.json()
      return { content: strategy.extractContent(data), usage: strategy.extractUsage(data) }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.message.startsWith('API Error')) throw error
      if (this.isAbortError(error)) throw new Error('LLM 请求超时')
      throw new Error(`LLM 请求失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async chatStream(
    request: LLMRequest,
    callbacks: {
      onChunk: (text: string) => void
      onDone: (usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => void
      onError: (error: string) => void
    },
    provider?: LLMProviderType,
    requestId?: string
  ): Promise<void> {
    const targetProvider = provider ?? this.defaultProvider
    const config = this.configs[targetProvider]
    if (!config) {
      callbacks.onError('No LLM provider configured')
      return
    }

    const strategy = this.getStrategy(targetProvider)
    const endpoint = strategy.getEndpoint(config)
    if (!endpoint) {
      callbacks.onError(`Unknown provider: ${targetProvider}`)
      return
    }

    const messages = request.system
      ? [{ role: 'system' as const, content: request.system }, ...request.messages]
      : request.messages

    const controller = new AbortController()
    let streamFinished = false

    if (requestId) {
      this.activeControllers.set(requestId, controller)
    }

    const timeoutId = setTimeout(() => {
      if (!streamFinished) {
        streamFinished = true
        controller.abort()
        callbacks.onError('LLM stream timed out')
      }
    }, LLM_STREAM_TIMEOUT_MS)

    const cleanup = () => {
      if (!streamFinished) {
        streamFinished = true
        clearTimeout(timeoutId)
      }
      if (requestId) this.activeControllers.delete(requestId)
    }

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

    try {
      const body = strategy.buildRequestBody(config, messages, true)
      if (!strategy.shouldSendStreamFlag(true)) delete body.stream

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...strategy.buildAuthHeader(config)
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      if (!response.ok) {
        cleanup()
        response.body?.cancel()
        let errorMsg = response.statusText
        try {
          const error = await response.json()
          errorMsg = error.error?.message ?? error.error_msg ?? response.statusText
        } catch {
          /* non-JSON error body */
        }
        callbacks.onError(`API Error (${response.status}): ${errorMsg}`)
        return
      }

      reader = response.body?.getReader() ?? null
      if (!reader) {
        cleanup()
        callbacks.onError('Response body is not readable')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          try {
            reader.releaseLock()
          } catch {
            /* already released */
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        if (buffer.length > MAX_STREAM_BUFFER_SIZE) {
          cleanup()
          try {
            reader.cancel()
            reader.releaseLock()
          } catch {
            /* ignore */
          }
          callbacks.onError('Stream buffer overflow')
          return
        }
        // Incremental line parsing: extract each complete line as soon as a
        // newline is found, avoiding a full buffer.split on every chunk.
        let newlineIdx: number
        while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIdx)
          buffer = buffer.slice(newlineIdx + 1)
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue

          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue

          try {
            const parsed: Record<string, unknown> = JSON.parse(data)
            let content = ''

            if (parsed.choices && Array.isArray(parsed.choices) && parsed.choices[0]) {
              const choice = isRecord(parsed.choices[0]) ? parsed.choices[0] : undefined
              if (choice) {
                const delta = safeGetRecord(choice, 'delta')
                if (delta) {
                  content = safeGetString(delta, 'content') ?? safeGetString(choice, 'text') ?? ''
                } else {
                  content = safeGetString(choice, 'text') ?? ''
                }
              }
            } else if (parsed.type === 'content_block_delta') {
              const delta = safeGetRecord(parsed, 'delta')
              content = delta ? (safeGetString(delta, 'text') ?? '') : ''
            } else if (parsed.content && Array.isArray(parsed.content) && parsed.content[0]) {
              const block = isRecord(parsed.content[0]) ? parsed.content[0] : undefined
              content = block ? (safeGetString(block, 'text') ?? '') : ''
            }

            if (content) callbacks.onChunk(content)

            if (parsed.usage) {
              usage = strategy.extractUsage(parsed)
            }
          } catch {
            /* skip unparseable chunks */
          }
        }
      }

      cleanup()
      callbacks.onDone(usage)
    } catch (error) {
      cleanup()
      if (reader) {
        try {
          reader.cancel()
          reader.releaseLock()
        } catch {
          /* reader already released */
        }
      }
      if (this.isAbortError(error)) return

      callbacks.onError(`LLM stream failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  cancelStream(requestId: string): boolean {
    const controller = this.activeControllers.get(requestId)
    if (!controller) return false
    try {
      controller.abort()
    } catch {
      /* ignore */
    }
    this.activeControllers.delete(requestId)
    return true
  }
}
