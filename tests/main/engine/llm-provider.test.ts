import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/mock/userData' }
}))

import { LLMProvider } from '../../../src/main/engine/llm-provider'
import { SecureLLMConfig } from '../../../src/main/secure-config'

let provider: LLMProvider

function createMockStreamResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  let index = 0
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (index < chunks.length) {
            return { done: false, value: encoder.encode(chunks[index++]) }
          }
          return { done: true, value: undefined }
        },
        cancel: () => {},
        releaseLock: () => {}
      })
    }
  }
}

describe('LLMProvider', () => {
  beforeEach(() => {
    provider = new LLMProvider()
    provider.resetConfig()
  })

  function createMockStreamResponseWithSpies(chunks: string[]) {
    const encoder = new TextEncoder()
    let index = 0
    const cancel = vi.fn()
    const releaseLock = vi.fn()
    const read = vi.fn(async () => {
      if (index < chunks.length) {
        return { done: false, value: encoder.encode(chunks[index++]) }
      }
      return { done: true, value: undefined }
    })
    return {
      response: {
        ok: true,
        body: { getReader: () => ({ read, cancel, releaseLock }) }
      },
      cancel,
      releaseLock,
      read
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('configuration', () => {
    it('should configure a provider', () => {
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4o'
      })

      const config = provider.getConfig('openai')
      expect(config).toBeDefined()
      if (!config) throw new Error('config not set')
      expect(config.apiKey).toBe('sk-test-key')
      expect(config.model).toBe('gpt-4o')
    })

    it('should use default provider for chat when no specific provider given', () => {
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      })

      // Should not throw because we have a default configured
      expect(() => provider.getDefaultProvider()).not.toThrow()
    })

    it('should extract content from choices[0].text when message is absent', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ text: 'Text-style completion' }]
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      })

      const response = await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] })
      expect(response.content).toBe('Text-style completion')
    })

    it('should return empty usage when response has no usage field', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'No usage' } }]
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      })

      const response = await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] })
      expect(response.usage).toBeUndefined()
    })

    it('should throw when trying to chat without configuration', async () => {
      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      ).rejects.toThrow('未配置 LLM 提供商')
    })
  })

  describe('chat completion', () => {
    it('should make a chat completion request', async () => {
      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello! How can I help you?' } }],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4o'
      })

      const response = await provider.chat({
        messages: [{ role: 'user', content: 'Say hello' }]
      })

      expect(response.content).toBe('Hello! How can I help you?')
      expect(response.usage).toBeDefined()
      if (!response.usage) throw new Error('usage not set')
      expect(response.usage.totalTokens).toBe(18)

      // Verify the API call was made correctly
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toBe('https://api.openai.com/v1/chat/completions')

      const body = JSON.parse(callArgs[1].body)
      expect(body.model).toBe('gpt-4o')
      expect(body.messages[0].content).toBe('Say hello')
    })

    it('should handle API errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'openai',
        apiKey: 'sk-bad-key',
        model: 'gpt-4o'
      })

      await expect(
        provider.chat({
          messages: [{ role: 'user', content: 'test' }]
        })
      ).rejects.toThrow('API Error (401): Invalid API key')
    })

    it('should support system messages', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'You are a helpful assistant.' } }],
          usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      })

      await provider.chat({
        system: 'You are a novel writing assistant.',
        messages: [{ role: 'user', content: 'Help me write' }]
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messages[0].role).toBe('system')
      expect(body.messages[0].content).toBe('You are a novel writing assistant.')
    })
  })

  describe('provider routing', () => {
    it('should support multiple provider configs', () => {
      provider.configure({ provider: 'openai', apiKey: 'sk-1', model: 'gpt-4' })
      provider.configure({ provider: 'claude', apiKey: 'sk-2', model: 'claude-3' })

      const configs = provider.getAllConfigs()
      expect(Object.keys(configs).length).toBe(2)
    })

    it('should switch default provider', () => {
      provider.configure({ provider: 'claude', apiKey: 'sk-claude', model: 'claude-sonnet-4' })
      expect(provider.getDefaultProvider()).toBe('claude')
    })
  })

  describe('claude strategy', () => {
    beforeEach(() => {
      provider.configure({
        provider: 'claude',
        apiKey: 'sk-claude-key',
        model: 'claude-sonnet-4'
      })
    })

    it('should separate system message into `system` field, not in messages array', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Claude response' }],
          usage: { input_tokens: 5, output_tokens: 3 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.chat(
        {
          system: 'You are a helpful assistant.',
          messages: [{ role: 'user', content: 'Hi' }]
        },
        'claude'
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.system).toBe('You are a helpful assistant.')
      expect(body.messages).toHaveLength(1)
      expect(body.messages[0].role).toBe('user')
    })

    it('should extract content from data.content[0].text', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Hello from Claude' }],
          usage: { input_tokens: 10, output_tokens: 5 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      const response = await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'claude')

      expect(response.content).toBe('Hello from Claude')
    })

    it('should extract usage from data.usage with input_tokens/output_tokens and sum total', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'ok' }],
          usage: { input_tokens: 12, output_tokens: 8 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      const response = await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'claude')

      expect(response.usage).toBeDefined()
      if (!response.usage) throw new Error('usage not set')
      expect(response.usage.promptTokens).toBe(12)
      expect(response.usage.completionTokens).toBe(8)
      expect(response.usage.totalTokens).toBe(20)
    })

    it('should use x-api-key header for auth', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'ok' }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'claude')

      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['x-api-key']).toBe('sk-claude-key')
      expect(headers.Authorization).toBeUndefined()
    })

    it('should not include stream flag in chatStream body (shouldSendStreamFlag=false)', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockStreamResponse(['data: [DONE]\n']))
      vi.stubGlobal('fetch', mockFetch)

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError }, 'claude')

      expect(onError).not.toHaveBeenCalled()
      expect(onDone).toHaveBeenCalled()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.stream).toBeUndefined()
    })

    it('should use Claude default endpoint when no baseUrl configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'ok' }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'claude')

      expect(mockFetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages')
    })
  })

  describe('wenxin strategy', () => {
    beforeEach(() => {
      provider.configure({
        provider: 'wenxin',
        apiKey: 'wenxin-token',
        model: 'ernie-bot'
      })
    })

    it('should extract content from data.result (string)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: 'Wenxin response text',
          usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      const response = await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'wenxin')

      expect(response.content).toBe('Wenxin response text')
    })

    it('should use default wenxin endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'ok' })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'wenxin')

      expect(mockFetch.mock.calls[0][0]).toBe('https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat')
    })

    it('should use Authorization header with raw api key (no Bearer prefix)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'ok' })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'wenxin')

      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers.Authorization).toBe('wenxin-token')
    })
  })

  describe('tongyi strategy', () => {
    beforeEach(() => {
      provider.configure({
        provider: 'tongyi',
        apiKey: 'sk-tongyi',
        model: 'qwen-max'
      })
    })

    it('should build request body with input.messages + parameters nested structure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Tongyi response' } }],
          usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'tongyi')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.input).toBeDefined()
      expect(Array.isArray(body.input.messages)).toBe(true)
      expect(body.input.messages[0].content).toBe('Hi')
      expect(body.parameters).toBeDefined()
      expect(body.parameters.result_format).toBe('message')
      expect(body.parameters.temperature).toBe(0.7)
    })

    it('should extract content via OpenAI-like helper (choices[0].message.content)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Extracted via OpenAI-like helper' } }]
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      const response = await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'tongyi')

      expect(response.content).toBe('Extracted via OpenAI-like helper')
    })

    it('should extract usage from data.usage', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      const response = await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'tongyi')

      expect(response.usage).toBeDefined()
      if (!response.usage) throw new Error('usage not set')
      expect(response.usage.promptTokens).toBe(7)
      expect(response.usage.completionTokens).toBe(3)
      expect(response.usage.totalTokens).toBe(10)
    })
  })

  describe('mimo strategy', () => {
    beforeEach(() => {
      provider.configure({
        provider: 'mimo',
        apiKey: 'sk-mimo',
        model: 'mimo-model'
      })
    })

    it('should use OpenAI-like request body structure (no input/parameters nesting)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Mimo response' } }],
          usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'mimo')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.model).toBe('mimo-model')
      expect(body.messages).toBeDefined()
      expect(body.input).toBeUndefined()
      expect(body.parameters).toBeUndefined()
    })

    it('should use mimo default endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'mimo')

      expect(mockFetch.mock.calls[0][0]).toBe('https://api.mimo.ai/v1/chat/completions')
    })

    it('should use Authorization: Bearer header (shared openai buildAuthHeader)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'mimo')

      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers.Authorization).toBe('Bearer sk-mimo')
    })
  })

  describe('getOpenAILikeEndpoint edge cases', () => {
    it('should not append /chat/completions if baseUrl already ends with it', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'mimo',
        apiKey: 'sk-test',
        model: 'm',
        baseUrl: 'https://api.example.com/v1/chat/completions'
      })

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'mimo')

      expect(mockFetch.mock.calls[0][0]).toBe('https://api.example.com/v1/chat/completions')
    })

    it('should append /chat/completions when baseUrl has no suffix', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'mimo',
        apiKey: 'sk-test',
        model: 'm',
        baseUrl: 'https://api.example.com/v1'
      })

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'mimo')

      expect(mockFetch.mock.calls[0][0]).toBe('https://api.example.com/v1/chat/completions')
    })

    it('should strip trailing slashes before appending /chat/completions', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'mimo',
        apiKey: 'sk-test',
        model: 'm',
        baseUrl: 'https://api.example.com/v1/'
      })

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'mimo')

      expect(mockFetch.mock.calls[0][0]).toBe('https://api.example.com/v1/chat/completions')
    })

    it('should fall back to default endpoint when no baseUrl is set', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      })

      await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'openai')

      expect(mockFetch.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions')
    })
  })

  describe('isAbortError (via chat)', () => {
    beforeEach(() => {
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      })
    })

    it('should treat DOMException with name=AbortError as timeout', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))

      await expect(provider.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow('LLM 请求超时')
    })

    it('should treat Error with name=AbortError as timeout', async () => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err))

      await expect(provider.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow('LLM 请求超时')
    })

    it('should treat Error with code=ERR_ABORTED as timeout', async () => {
      const err = Object.assign(new Error('aborted'), { code: 'ERR_ABORTED' })
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err))

      await expect(provider.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow('LLM 请求超时')
    })

    it('should treat Error with code=20 as timeout', async () => {
      const err = Object.assign(new Error('aborted'), { code: 20 })
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err))

      await expect(provider.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow('LLM 请求超时')
    })

    it('should wrap non-abort errors with LLM 请求失败 prefix', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

      await expect(provider.chat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
        'LLM 请求失败: network down'
      )
    })

    it('should silently return on abort in chatStream (isAbortError branch)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onError).not.toHaveBeenCalled()
      expect(onDone).not.toHaveBeenCalled()
      expect(onChunk).not.toHaveBeenCalled()
    })
  })

  describe('chatStreamInstance', () => {
    beforeEach(() => {
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-stream-key',
        model: 'gpt-4o'
      })
    })

    afterEach(() => {
      provider.resetConfig()
      vi.restoreAllMocks()
    })

    it('should parse SSE lines and call onChunk with delta.content', async () => {
      const mock = createMockStreamResponseWithSpies(['data: {"choices":[{"delta":{"content":"hello"}}]}\n\n'])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledWith('hello')
      expect(onChunk).toHaveBeenCalledTimes(1)
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should call onDone and not onError when stream ends with [DONE]', async () => {
      const mock = createMockStreamResponseWithSpies([
        'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledWith('hi')
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should parse multiple SSE lines within a single chunk', async () => {
      const mock = createMockStreamResponseWithSpies([
        'data: {"choices":[{"delta":{"content":"a"}}]}\n\n' +
          'data: {"choices":[{"delta":{"content":"b"}}]}\n\n' +
          'data: {"choices":[{"delta":{"content":"c"}}]}\n\n'
      ])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledTimes(3)
      expect(onChunk).toHaveBeenNthCalledWith(1, 'a')
      expect(onChunk).toHaveBeenNthCalledWith(2, 'b')
      expect(onChunk).toHaveBeenNthCalledWith(3, 'c')
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should concatenate a single SSE line split across multiple chunks', async () => {
      const mock = createMockStreamResponseWithSpies([
        'data: {"choices":[{"delta":{"content":"he',
        'llo"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n'
      ])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledTimes(2)
      expect(onChunk).toHaveBeenNthCalledWith(1, 'hello')
      expect(onChunk).toHaveBeenNthCalledWith(2, ' world')
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should extract text from content array in SSE chunk', async () => {
      const mock = createMockStreamResponseWithSpies([
        'data: {"content":[{"type":"text","text":"from content array"}]}\n\n'
      ])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledWith('from content array')
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should extract text from Claude content_block_delta format', async () => {
      provider.configure({
        provider: 'claude',
        apiKey: 'sk-claude',
        model: 'claude-sonnet-4'
      })
      const mock = createMockStreamResponseWithSpies([
        'data: {"type":"content_block_delta","delta":{"text":"world"}}\n\n'
      ])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError }, 'claude')

      expect(onChunk).toHaveBeenCalledWith('world')
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should call onError when fetch throws a network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onError).toHaveBeenCalledWith('LLM stream failed: network down')
      expect(onDone).not.toHaveBeenCalled()
      expect(onChunk).not.toHaveBeenCalled()
    })

    it('should call reader.cancel and releaseLock when reader.read throws', async () => {
      const cancel = vi.fn()
      const releaseLock = vi.fn()
      const read = vi.fn().mockRejectedValue(new Error('reader broken'))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => ({ read, cancel, releaseLock }) }
        })
      )

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(cancel).toHaveBeenCalled()
      expect(releaseLock).toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith('LLM stream failed: reader broken')
      expect(onDone).not.toHaveBeenCalled()
    })

    it('should not call reader.cancel on normal stream completion', async () => {
      const mock = createMockStreamResponseWithSpies(['data: {"choices":[{"delta":{"content":"done"}}]}\n\n'])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      // cancel must never be called on a completed stream (would discard data),
      // but releaseLock IS expected on completion to release the stream lock.
      expect(mock.cancel).not.toHaveBeenCalled()
      expect(onDone).toHaveBeenCalled()
    })

    it('should trigger buffer overflow protection when buffer exceeds MAX_STREAM_BUFFER_SIZE', async () => {
      const encoder = new TextEncoder()
      const oversized = 'x'.repeat(1024 * 1024 + 1)
      const cancel = vi.fn()
      const releaseLock = vi.fn()
      let firstCall = true
      const read = vi.fn(async () => {
        if (firstCall) {
          firstCall = false
          return { done: false, value: encoder.encode(oversized) }
        }
        return { done: true, value: undefined }
      })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          body: { getReader: () => ({ read, cancel, releaseLock }) }
        })
      )

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onError).toHaveBeenCalledWith('Stream buffer overflow')
      expect(cancel).toHaveBeenCalled()
      expect(releaseLock).toHaveBeenCalled()
      expect(onDone).not.toHaveBeenCalled()
    })

    it('should call onError("No LLM provider configured") when no provider is configured', async () => {
      provider.resetConfig()
      vi.stubGlobal('fetch', vi.fn())

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onError).toHaveBeenCalledWith('No LLM provider configured')
      expect(onDone).not.toHaveBeenCalled()
      expect(onChunk).not.toHaveBeenCalled()
    })

    it('should call onError when response.body is not readable', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: null }))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onError).toHaveBeenCalledWith('Response body is not readable')
      expect(onDone).not.toHaveBeenCalled()
      expect(onChunk).not.toHaveBeenCalled()
    })

    it('should call onError with API Error message on HTTP error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: { message: 'rate limited' } })
        })
      )

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onError).toHaveBeenCalledWith('API Error (429): rate limited')
      expect(onDone).not.toHaveBeenCalled()
      expect(onChunk).not.toHaveBeenCalled()
    })

    it('should extract usage from final SSE chunk and pass to onDone', async () => {
      const mock = createMockStreamResponseWithSpies([
        'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
        'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":5,"completion_tokens":3,"total_tokens":8}}\n\n'
      ])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onDone).toHaveBeenCalled()
      const usage = onDone.mock.calls[0][0]
      expect(usage).toBeDefined()
      expect(usage.totalTokens).toBe(8)
      expect(usage.promptTokens).toBe(5)
      expect(usage.completionTokens).toBe(3)
      expect(onError).not.toHaveBeenCalled()
    })

    it('should skip lines that do not start with "data:"', async () => {
      const mock = createMockStreamResponseWithSpies([
        ': comment line\n\n' +
          'event: ping\n' +
          'data: {"choices":[{"delta":{"content":"kept"}}]}\n\n' +
          'retry: 1000\n\n'
      ])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledTimes(1)
      expect(onChunk).toHaveBeenCalledWith('kept')
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should skip unparseable SSE data lines without failing the stream', async () => {
      const mock = createMockStreamResponseWithSpies([
        'data: {invalid json}\n\n' + 'data: {"choices":[{"delta":{"content":"after"}}]}\n\n'
      ])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledTimes(1)
      expect(onChunk).toHaveBeenCalledWith('after')
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })
  })

  describe('additional content extraction branches', () => {
    it('should return empty string when choices[0].message.content is empty and text is missing', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      })

      const response = await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] })
      expect(response.content).toBe('')
    })

    it('should return empty string when Claude content block text is empty', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '' }],
          usage: { input_tokens: 1, output_tokens: 1 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      provider.configure({
        provider: 'claude',
        apiKey: 'sk-claude',
        model: 'claude-sonnet-4'
      })

      const response = await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'claude')
      expect(response.content).toBe('')
    })
  })

  describe('chatStream error branches', () => {
    it('should call onError with statusText when HTTP error body is not JSON', async () => {
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      })

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          body: { cancel: () => {} },
          json: async () => {
            throw new Error('not json')
          }
        })
      )

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onError).toHaveBeenCalledWith('API Error (503): Service Unavailable')
      expect(onDone).not.toHaveBeenCalled()
      expect(onChunk).not.toHaveBeenCalled()
    })

    it('should use choice.text fallback when delta exists without content', async () => {
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      })

      const mock = createMockStreamResponseWithSpies(['data: {"choices":[{"delta":{},"text":"fallback text"}]}\n\n'])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledWith('fallback text')
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })
  })

  describe('chatStream robustness', () => {
    beforeEach(() => {
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-stream-key',
        model: 'gpt-4o'
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should parse final SSE line without trailing newline', async () => {
      const mock = createMockStreamResponseWithSpies([
        'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n' + 'data: {"choices":[{"delta":{"content":" world"}}]}'
      ])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledWith('hello')
      expect(onChunk).toHaveBeenCalledWith(' world')
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should complete a high-volume stream without overflow', async () => {
      const chunks = Array.from(
        { length: 50 },
        (_, i) => `data: {"choices":[{"delta":{"content":"chunk-${i}-${'x'.repeat(400)}"}}]}\n\n`
      )
      const mock = createMockStreamResponseWithSpies(chunks)
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream({ messages: [{ role: 'user', content: 'Hi' }] }, { onChunk, onDone, onError })

      expect(onChunk).toHaveBeenCalledTimes(50)
      expect(onDone).toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })

    it('should remove controller from activeControllers after stream completion', async () => {
      const mock = createMockStreamResponseWithSpies(['data: {"choices":[{"delta":{"content":"done"}}]}\n\n'])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mock.response))

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      await provider.chatStream(
        { messages: [{ role: 'user', content: 'Hi' }] },
        { onChunk, onDone, onError },
        'openai',
        'req-cleanup'
      )

      expect(provider.cancelStream('req-cleanup')).toBe(false)
    })

    it('should trigger first byte timeout when no data arrives', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })

      let capturedSignal: AbortSignal | undefined
      const cancel = vi.fn()
      const releaseLock = vi.fn()

      const read = vi.fn().mockImplementation(() => {
        return new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
          if (capturedSignal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
            return
          }
          const handler = () => reject(new DOMException('Aborted', 'AbortError'))
          capturedSignal?.addEventListener('abort', handler)
        })
      })

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url, options) => {
          capturedSignal = options.signal
          return Promise.resolve({
            ok: true,
            body: { getReader: () => ({ read, cancel, releaseLock }) }
          })
        })
      )

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      const streamPromise = provider.chatStream(
        { messages: [{ role: 'user', content: 'Hi' }] },
        { onChunk, onDone, onError },
        'openai',
        'req-first-byte'
      )

      vi.advanceTimersByTime(31_000)
      await streamPromise

      expect(onError).toHaveBeenCalledWith('LLM stream first byte timeout')
      expect(onDone).not.toHaveBeenCalled()
      expect(provider.cancelStream('req-first-byte')).toBe(false)
    })
  })

  describe('cancelStream', () => {
    it('should return false when requestId is not found', () => {
      expect(provider.cancelStream('missing-id')).toBe(false)
    })

    it('should cancel active stream by requestId', async () => {
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-stream-key',
        model: 'gpt-4o'
      })

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(createMockStreamResponse(['data: {"choices":[{"delta":{"content":"hello"}}]}\n\n']))
      )

      const onChunk = vi.fn()
      const onDone = vi.fn()
      const onError = vi.fn()

      const streamPromise = provider.chatStream(
        { messages: [{ role: 'user', content: 'Hi' }] },
        { onChunk, onDone, onError },
        'openai',
        'req-123'
      )

      provider.cancelStream('req-123')

      await streamPromise

      expect(provider.cancelStream('req-123')).toBe(false)
    })
  })

  describe('initFromStorage', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should configure LLMProvider when SecureLLMConfig.load returns valid config', () => {
      vi.spyOn(SecureLLMConfig, 'load').mockReturnValue({
        provider: 'claude',
        apiKey: 'sk-stored',
        model: 'claude-sonnet',
        baseUrl: 'https://api.example.com',
        temperature: 0.5,
        maxTokens: 2048
      })

      provider.initFromStorage()

      const config = provider.getConfig('claude')
      expect(config).toBeDefined()
      if (!config) throw new Error('config not set')
      expect(config.apiKey).toBe('sk-stored')
      expect(config.model).toBe('claude-sonnet')
      expect(config.temperature).toBe(0.5)
      expect(config.maxTokens).toBe(2048)
    })

    it('should preserve customProtocol when loading from storage', () => {
      vi.spyOn(SecureLLMConfig, 'load').mockReturnValue({
        provider: 'custom',
        apiKey: 'sk-stored',
        model: 'custom-model',
        baseUrl: 'https://custom.example.com/v1',
        temperature: 0.5,
        maxTokens: 2048,
        customProtocol: 'anthropic'
      })

      provider.initFromStorage()

      const config = provider.getConfig('custom')
      expect(config).toBeDefined()
      if (!config) throw new Error('config not set')
      expect(config.customProtocol).toBe('anthropic')
    })

    it('should not throw when SecureLLMConfig.load returns null', () => {
      vi.spyOn(SecureLLMConfig, 'load').mockReturnValue(null)

      expect(() => provider.initFromStorage()).not.toThrow()
      expect(provider.getConfig('openai')).toBeUndefined()
    })

    it('should propagate errors thrown by SecureLLMConfig.load (no internal try/catch)', () => {
      vi.spyOn(SecureLLMConfig, 'load').mockImplementation(() => {
        throw new Error('disk read failure')
      })

      expect(() => provider.initFromStorage()).toThrow('disk read failure')
    })
  })

  describe('HTTP error handling', () => {
    beforeEach(() => {
      provider.configure({
        provider: 'wenxin',
        apiKey: 'wenxin-key',
        model: 'ernie'
      })
    })

    it('should extract error_msg field (wenxin-style) on HTTP error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error_msg: 'Invalid access token' })
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'wenxin')).rejects.toThrow(
        'Invalid access token'
      )
    })

    it('should pass through errors whose message starts with "API Error" unchanged', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('API Error: upstream failure')))

      await expect(provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'wenxin')).rejects.toThrow(
        'API Error: upstream failure'
      )
    })

    it('should fall back to statusText when error body JSON parsing fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => {
          throw new Error('not json')
        }
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'wenxin')).rejects.toThrow(
        'Service Unavailable'
      )
    })

    it('should fall back to statusText when error body has no error.message or error_msg', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({})
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }, 'wenxin')).rejects.toThrow(
        'Internal Server Error'
      )
    })
  })

  describe('testConnection', () => {
    it('should send a minimal request and return true on success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hi there' } }],
          usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await provider.testConnection({
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4o'
      })

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messages).toHaveLength(1)
      expect(body.messages[0].content).toBe('Hello')
    })

    it('should not modify internal config state', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'ok' } }] })
        })
      )

      await provider.testConnection({
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4o'
      })

      expect(provider.getConfig('openai')).toBeUndefined()
      expect(() => provider.getDefaultProvider()).toThrow('未配置 LLM 提供商')
    })

    it('should use provided baseUrl for connection test', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.testConnection({
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4o',
        baseUrl: 'https://proxy.example.com/v1'
      })

      expect(mockFetch.mock.calls[0][0]).toBe('https://proxy.example.com/v1/chat/completions')
    })

    it('should throw on API errors during connection test', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } })
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(
        provider.testConnection({
          provider: 'openai',
          apiKey: 'sk-test-key',
          model: 'gpt-4o'
        })
      ).rejects.toThrow('Invalid API key')
    })

    it('should throw on unknown provider', async () => {
      await expect(
        provider.testConnection({
          provider: 'unknown' as any,
          apiKey: 'sk-test-key',
          model: 'test'
        })
      ).rejects.toThrow('未知的提供商策略')
    })

    it('should use default custom strategy (openai) when custom provider has no protocol', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.testConnection({
        provider: 'custom',
        apiKey: 'sk-custom-key',
        model: 'custom-model',
        baseUrl: 'https://custom.example.com/v1'
      })

      expect(mockFetch.mock.calls[0][0]).toBe('https://custom.example.com/v1/chat/completions')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers.Authorization).toBe('Bearer sk-custom-key')
    })

    it('should use custom-openai strategy when custom provider with openai protocol', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.testConnection({
        provider: 'custom',
        apiKey: 'sk-custom-key',
        model: 'custom-model',
        baseUrl: 'https://custom.example.com/v1',
        customProtocol: 'openai'
      })

      expect(mockFetch.mock.calls[0][0]).toBe('https://custom.example.com/v1/chat/completions')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers.Authorization).toBe('Bearer sk-custom-key')
    })

    it('should use custom-anthropic strategy when custom provider with anthropic protocol', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'ok' }],
          usage: { input_tokens: 1, output_tokens: 2 }
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.testConnection({
        provider: 'custom',
        apiKey: 'sk-custom-key',
        model: 'custom-model',
        baseUrl: 'https://custom.example.com/v1',
        customProtocol: 'anthropic'
      })

      expect(mockFetch.mock.calls[0][0]).toBe('https://custom.example.com/v1/messages')
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['x-api-key']).toBe('sk-custom-key')
      expect(headers.Authorization).toBeUndefined()
    })
  })
})
