import React, { useEffect, useRef, useState } from 'react'
import { DEFAULT_ENDPOINTS } from '@shared/constants'
import { llmService } from '../../services'

const PROVIDERS = [
  { id: 'openai' as const, label: 'OpenAI' },
  { id: 'claude' as const, label: 'Anthropic Claude' },
  { id: 'mimo' as const, label: '小米 MiMo' },
  { id: 'wenxin' as const, label: '百度文心' },
  { id: 'tongyi' as const, label: '阿里通义' },
  { id: 'custom' as const, label: '自定义' }
]

export const LLMConfig: React.FC = () => {
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load config meta from encrypted storage (main process, no apiKey exposed)
  useEffect(() => {
    const load = async () => {
      try {
        const meta = await llmService.configMeta()
        if (meta) {
          setProvider(meta.provider ?? 'openai')
          setModel(meta.model ?? '')
          setBaseUrl(meta.baseUrl ?? '')
        }
      } catch (err) {
        console.warn('LLM 配置加载失败:', err)
      }
    }
    load()
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current)
      }
    }
  }, [])

  const handleSave = async () => {
    const config = {
      provider: provider as (typeof PROVIDERS)[number]['id'],
      apiKey,
      model,
      baseUrl: baseUrl.trim() || undefined
    }
    if (baseUrl.trim()) config.baseUrl = baseUrl.trim()

    try {
      await llmService.config(config)
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save LLM config:', err)
    }
  }

  const isCustom = provider === 'custom'

  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium text-[--color-text]">LLM 配置</h3>
      <p className="text-xs text-[--color-text-secondary]">配置 AI 写作助手使用的大语言模型</p>

      {/* Provider select */}
      <div>
        <label className="block text-xs font-medium text-[--color-text] mb-1">服务商</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setProvider(p.id)
                // Pre-fill baseUrl only for known providers if empty
                if (p.id !== 'custom' && !baseUrl) {
                  setBaseUrl(DEFAULT_ENDPOINTS[p.id] ?? '')
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                provider === p.id
                  ? 'border-[--color-primary] bg-[--accent-bg] text-[--color-primary]'
                  : 'border-[--color-border] text-[--color-text-secondary] hover:border-[--color-primary]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-xs font-medium text-[--color-text] mb-1">API Key</label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={isCustom ? '输入你的 API Key' : 'sk-...'}
            className="flex-1 px-3 py-2 bg-surface border border-[--color-border] rounded-lg text-xs focus:outline-none focus:border-[--color-primary] font-mono"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="px-2 py-1 text-xs text-[--color-text-secondary] border border-[--color-border] rounded-lg hover:bg-[--color-bg]"
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      {/* Base URL (always shown, editable) */}
      <div>
        <label className="block text-xs font-medium text-[--color-text] mb-1">
          {isCustom ? 'API 地址 *' : 'API 地址'}
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder={
            isCustom
              ? 'https://your-api.example.com/v1/chat/completions'
              : (DEFAULT_ENDPOINTS[provider] ?? 'https://...')
          }
          className="w-full px-3 py-2 bg-surface border border-[--color-border] rounded-lg text-xs focus:outline-none focus:border-[--color-primary] font-mono"
        />
        <p className="text-[10px] text-[--color-text-secondary] mt-1">
          {isCustom ? '填写你的 API 完整地址，需支持 OpenAI 兼容接口格式' : '可修改为代理地址或中转地址'}
        </p>
      </div>

      {/* Model ID (manual input, no presets) */}
      <div>
        <label className="block text-xs font-medium text-[--color-text] mb-1">模型 ID *</label>
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="手动输入模型 ID，如 gpt-4o、claude-sonnet-4 等"
          className="w-full px-3 py-2 bg-surface border border-[--color-border] rounded-lg text-xs focus:outline-none focus:border-[--color-primary] font-mono"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!apiKey.trim() || !model.trim() || (isCustom && !baseUrl.trim())}
        className={`px-4 py-2 text-xs rounded-lg font-medium transition-colors disabled:opacity-50 ${
          saved
            ? 'bg-[--success-bg] text-[var(--success)]'
            : 'bg-[--color-primary] text-white hover:bg-[--color-primary-hover]'
        }`}
      >
        {saved ? '✓ 已保存' : '保存配置'}
      </button>
    </div>
  )
}
