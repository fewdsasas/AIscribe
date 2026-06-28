import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LLMConfig } from '@renderer/components/settings/LLMConfig'
import { llmService } from '@renderer/services'

vi.mock('@renderer/services', () => ({
  llmService: {
    configMeta: vi.fn(),
    config: vi.fn(),
    testConnection: vi.fn()
  }
}))

const mockedLLMService = vi.mocked(llmService)

describe('LLMConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLLMService.configMeta.mockResolvedValue({ provider: 'openai', model: 'gpt-4', baseUrl: '' } as any)
    mockedLLMService.config.mockResolvedValue(true)
    mockedLLMService.testConnection.mockResolvedValue(true)
  })

  it('should load config meta on mount', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
    })
  })

  it('should pre-fill baseUrl and model when selecting known provider', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Anthropic Claude'))

    const baseUrlInput = screen.getByPlaceholderText(/api.anthropic.com/) as HTMLInputElement
    await waitFor(() => {
      expect(baseUrlInput.value).toBe('https://api.anthropic.com/v1/messages')
    })

    const modelInput = screen.getByPlaceholderText(/模型 ID/) as HTMLInputElement
    expect(modelInput.value).toBe('claude-sonnet-4-20250514')
  })

  it('should clear apiKey when switching provider', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByPlaceholderText('sk-...') as HTMLInputElement
    fireEvent.change(apiKeyInput, { target: { value: 'sk-openai-key' } })
    expect(apiKeyInput.value).toBe('sk-openai-key')

    fireEvent.click(screen.getByText('Anthropic Claude'))

    await waitFor(() => {
      expect(apiKeyInput.value).toBe('')
    })
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

  it('should show custom protocol selector only for custom provider', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
    })

    expect(screen.queryByText('接口协议')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('自定义'))

    await waitFor(() => {
      expect(screen.getByText('接口协议')).toBeInTheDocument()
      expect(screen.getByText('OpenAI 兼容协议')).toBeInTheDocument()
      expect(screen.getByText('Anthropic 协议')).toBeInTheDocument()
    })
  })

  it('should include customProtocol when saving custom provider', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('自定义')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('自定义'))
    fireEvent.click(screen.getByText('Anthropic 协议'))

    const apiKeyInput = screen.getByPlaceholderText('输入你的 API Key')
    fireEvent.change(apiKeyInput, { target: { value: 'sk-custom-key' } })
    const modelInput = screen.getByPlaceholderText(/模型 ID/)
    fireEvent.change(modelInput, { target: { value: 'custom-model' } })
    const baseUrlInput = screen.getByPlaceholderText(/your-api\.example\.com/)
    fireEvent.change(baseUrlInput, { target: { value: 'https://custom.example.com' } })

    fireEvent.click(screen.getByText('保存配置'))

    await waitFor(() => {
      expect(mockedLLMService.config).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'custom',
          customProtocol: 'anthropic',
          apiKey: 'sk-custom-key',
          model: 'custom-model'
        })
      )
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

  it('should show saving state and disable button during save', async () => {
    let resolveSave: (value: boolean) => void = () => {}
    mockedLLMService.config.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveSave = resolve
        })
    )

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
      expect(screen.getByText('保存中...')).toBeInTheDocument()
    })
    expect(screen.getByText('保存中...')).toBeDisabled()

    resolveSave(true)
    await waitFor(() => {
      expect(screen.getByText('✓ 已保存')).toBeInTheDocument()
    })
  })

  it('should display error message when save fails', async () => {
    mockedLLMService.config.mockRejectedValue(new Error('Network error'))

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
      expect(screen.getByText(/保存失败: Network error/)).toBeInTheDocument()
    })
  })

  it('should disable test connection when form is invalid', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('测试连接')).toBeInTheDocument()
    })
    const testBtn = screen.getByText('测试连接')
    expect(testBtn).toBeDisabled()
  })

  it('should call llmService.testConnection and show success', async () => {
    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('测试连接')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345' } })
    const modelInput = screen.getByPlaceholderText(/模型 ID/)
    fireEvent.change(modelInput, { target: { value: 'gpt-4o' } })

    fireEvent.click(screen.getByText('测试连接'))

    await waitFor(() => {
      expect(mockedLLMService.testConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          apiKey: 'sk-test12345',
          model: 'gpt-4o'
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByText('✓ 连接成功')).toBeInTheDocument()
    })
  })

  it('should display error message when test connection fails', async () => {
    mockedLLMService.testConnection.mockRejectedValue(new Error('Invalid API key'))

    render(<LLMConfig />)
    await waitFor(() => {
      expect(screen.getByText('测试连接')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345' } })
    const modelInput = screen.getByPlaceholderText(/模型 ID/)
    fireEvent.change(modelInput, { target: { value: 'gpt-4o' } })

    fireEvent.click(screen.getByText('测试连接'))

    await waitFor(() => {
      expect(screen.getByText(/连接失败: Invalid API key/)).toBeInTheDocument()
    })
  })
})
