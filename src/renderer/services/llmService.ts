import type { AiscribeAPI } from '@shared/types/electron'
import type { LLMConfig, LLMRequest, LLMResponse } from '@shared/types'
import type { LLMConfigMeta } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface LLMStreamCallbacks {
  onChunk: (chunk: string) => void
  onDone: (data: { usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }) => void
  onError: (error: string) => void
}

export interface ILLMService {
  isConfigured(): Promise<boolean>
  chat(request: LLMRequest): Promise<LLMResponse>
  config(config: LLMConfig): Promise<boolean>
  configMeta(): Promise<LLMConfigMeta>
  startStream(request: LLMRequest): Promise<boolean>
  cancelStream(requestId: string): Promise<boolean>
  onChunk(callback: (chunk: string) => void): void
  onDone(callback: LLMStreamCallbacks['onDone']): void
  onError(callback: (error: string) => void): void
  removeListeners(): void
}

export function createLLMService(api: AiscribeAPI): ILLMService {
  return {
    isConfigured: () => api.llmIsConfigured(),
    chat: request => api.llmChat(request),
    config: config => api.llmConfig(config),
    configMeta: () => api.llmConfigMeta(),
    startStream: request => api.startLLMStream(request),
    cancelStream: requestId => api.cancelLLMStream(requestId),
    onChunk: callback => api.onLLMChunk(callback),
    onDone: callback => api.onLLMDone(callback),
    onError: callback => api.onLLMError(callback),
    removeListeners: () => api.removeLLMListeners()
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const llmService: ILLMService = createLLMService(api)
