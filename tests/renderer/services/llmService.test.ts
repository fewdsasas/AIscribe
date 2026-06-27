// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createLLMService } from '@renderer/services/llmService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { LLMRequest, LLMResponse } from '@shared/types'

describe('createLLMService', () => {
  it('should delegate isConfigured to api.llmIsConfigured', async () => {
    const api = createMockAiscribeAPI()
    const service = createLLMService(api)
    vi.mocked(api.llmIsConfigured).mockResolvedValue(true)

    const result = await service.isConfigured()

    expect(api.llmIsConfigured).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('should delegate chat to api.llmChat', async () => {
    const api = createMockAiscribeAPI()
    const service = createLLMService(api)
    const request: LLMRequest = { messages: [{ role: 'user', content: 'hi' }] }
    const response: LLMResponse = { content: 'hello', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }
    vi.mocked(api.llmChat).mockResolvedValue(response)

    const result = await service.chat(request)

    expect(api.llmChat).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })

  it('should delegate startStream to api.startLLMStream', async () => {
    const api = createMockAiscribeAPI()
    const service = createLLMService(api)
    const request: LLMRequest = { messages: [{ role: 'user', content: 'stream' }] }
    vi.mocked(api.startLLMStream).mockResolvedValue(true)

    const result = await service.startStream(request)

    expect(api.startLLMStream).toHaveBeenCalledWith(request)
    expect(result).toBe(true)
  })

  it('should delegate cancelStream to api.cancelLLMStream', async () => {
    const api = createMockAiscribeAPI()
    const service = createLLMService(api)
    vi.mocked(api.cancelLLMStream).mockResolvedValue(true)

    const result = await service.cancelStream('req-1')

    expect(api.cancelLLMStream).toHaveBeenCalledWith('req-1')
    expect(result).toBe(true)
  })

  it('should delegate stream listeners to api', () => {
    const api = createMockAiscribeAPI()
    const service = createLLMService(api)

    const onChunk = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()

    service.onChunk(onChunk)
    service.onDone(onDone)
    service.onError(onError)
    service.removeListeners()

    expect(api.onLLMChunk).toHaveBeenCalledWith(onChunk)
    expect(api.onLLMDone).toHaveBeenCalledWith(onDone)
    expect(api.onLLMError).toHaveBeenCalledWith(onError)
    expect(api.removeLLMListeners).toHaveBeenCalled()
  })
})
