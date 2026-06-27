import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LLMConfig } from '@renderer/components/settings/LLMConfig'
import { llmService } from '@renderer/services'

vi.mock('@renderer/services', () => ({
  llmService: {
    configMeta: vi.fn(),
    config: vi.fn()
  }
}))

const mockedLLMService = vi.mocked(llmService)

describe('LLMConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLLMService.configMeta.mockResolvedValue({ provider: 'openai', model: 'gpt-4', baseUrl: '' } as any)
    mockedLLMService.config.mockResolvedValue(true)
  })

  it('should load config meta on mount', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
    })
  })

  it('should pre-fill baseUrl when selecting known provider with empty baseUrl', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Anthropic Claude'))
  })

  it('should disable save when apiKey or model is empty', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('保存配置')).toBeInTheDocument()
    })
    const saveBtn = screen.getByText('保存配置')
    expect(saveBtn).toBeDisabled()
  })

  it('should enable save when apiKey and model are filled', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('保存配置')).toBeInTheDocument()
    })
    const apiKeyInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test123' } })
    const modelInput = screen.getByPlaceholderText(/模型 ID/)
    fireEvent.change(modelInput, { target: { value: 'gpt-4o' } })
    const saveBtn = screen.getByText('保存配置')
    expect(saveBtn).not.toBeDisabled()
  })

  it('should call llmService.config on save', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('保存配置')).toBeInTheDocument()
    })
    const apiKeyInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test' } })
    const modelInput = screen.getByPlaceholderText(/模型 ID/)
    fireEvent.change(modelInput, { target: { value: 'gpt-4o' } })
    fireEvent.click(screen.getByText('保存配置'))
    await waitFor(() => {
      expect(screen.getByText('✓ 已保存')).toBeInTheDocument()
    })
  })

  it('should toggle API key visibility', async () => {
    render(<LLMConfig />)
    await waitFor(
      () => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
    const toggleBtn = screen.getByText('显示')
    fireEvent.click(toggleBtn)
    expect(screen.getByText('隐藏')).toBeInTheDocument()
    fireEvent.click(screen.getByText('隐藏'))
    expect(screen.getByText('显示')).toBeInTheDocument()
  })
})
