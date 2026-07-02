import React, { useEffect, useRef, useState } from 'react'
import type { LLMCustomProtocol } from '@shared/types'
import { DEFAULT_ENDPOINTS, DEFAULT_MODELS } from '@shared/constants'
import { llmService } from '@renderer/services'
import Skeleton from '../shared/Skeleton'
import { ConfirmDialog } from '../shared/ConfirmDialog'

const PROVIDERS = [
  { id: 'openai' as const, label: 'OpenAI' },
  { id: 'claude' as const, label: 'Anthropic Claude' },
  { id: 'mimo' as const, label: '小米 MiMo' },
  { id: 'wenxin' as const, label: '百度文心' },
  { id: 'tongyi' as const, label: '阿里通义' },
  { id: 'custom' as const, label: '自定义' }
]

const CUSTOM_PROTOCOLS: { id: LLMCustomProtocol; label: string }[] = [
  { id: 'openai', label: 'OpenAI 兼容协议' },
  { id: 'anthropic', label: 'Anthropic 协议' }
]

export const LLMConfig: React.FC = () => {
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [customProtocol, setCustomProtocol] = useState<LLMCustomProtocol>('openai')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmProviderChange, setConfirmProviderChange] = useState(false)
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null)
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
          if (meta.customProtocol === 'anthropic' || meta.customProtocol === 'openai') {
            setCustomProtocol(meta.customProtocol)
          }
        }
      } catch (err) {
        console.warn('LLM 配置加载失败:', err)
      } finally {
        setLoading(false)
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
    setSaving(true)
    setError(null)
    setSaved(false)

    const config = {
      provider: provider as (typeof PROVIDERS)[number]['id'],
      apiKey,
      model,
      baseUrl: baseUrl.trim() || undefined,
      customProtocol: isCustom ? customProtocol : undefined
    }
    if (baseUrl.trim()) config.baseUrl = baseUrl.trim()

    try {
      await llmService.config(config)
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(`保存失败: ${(err as Error).message}`)
    }
    setSaving(false)
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setTestError(null)

    try {
      await llmService.testConnection({
        provider: provider as (typeof PROVIDERS)[number]['id'],
        apiKey,
        model,
        baseUrl: baseUrl.trim() || undefined,
        customProtocol: isCustom ? customProtocol : undefined
      })
      setTestStatus('success')
    } catch (err) {
      setTestStatus('error')
      setTestError(`连接失败: ${(err as Error).message}`)
    }
  }

  // Reset test result when config changes
  useEffect(() => {
    setTestStatus('idle')
    setTestError(null)
  }, [provider, apiKey, model, baseUrl, customProtocol])

  const handleProviderChange = (newProviderId: string) => {
    if (apiKey.trim()) {
      setPendingProviderId(newProviderId)
      setConfirmProviderChange(true)
    } else {
      applyProviderChange(newProviderId)
    }
  }

  const applyProviderChange = (newProviderId: string) => {
    setProvider(newProviderId)
    setSaved(false)
    setError(null)
    setApiKey('')
    if (newProviderId === 'custom') {
      setBaseUrl('')
      setModel('')
      return
    }
    setBaseUrl(DEFAULT_ENDPOINTS[newProviderId] ?? '')
    setModel(DEFAULT_MODELS[newProviderId] || '')
  }

  const handleConfirmProvider = () => {
    if (pendingProviderId) {
      applyProviderChange(pendingProviderId)
    }
    setConfirmProviderChange(false)
    setPendingProviderId(null)
  }

  const handleCancelProvider = () => {
    setConfirmProviderChange(false)
    setPendingProviderId(null)
  }

  const isCustom = provider === 'custom'
  const baseUrlValid =
    !isCustom ||
    (!!baseUrl.trim() &&
      (() => {
        try {
          const parsed = new URL(baseUrl.trim())
          return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        } catch {
          return false
        }
      })())
  const canSubmit = !!apiKey.trim() && !!model.trim() && baseUrlValid

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-medium text-[--color-text]">LLM 配置</h3>
        <Skeleton count={4} height="48px" />
      </div>
    )
  }

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
              onClick={() => handleProviderChange(p.id)}
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

      {/* Custom protocol selector */}
      {isCustom && (
        <div>
          <label className="block text-xs font-medium text-[--color-text] mb-1">接口协议</label>
          <div className="grid grid-cols-2 gap-2">
            {CUSTOM_PROTOCOLS.map(proto => (
              <button
                key={proto.id}
                onClick={() => {
                  setCustomProtocol(proto.id)
                  setSaved(false)
                  setError(null)
                }}
                className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                  customProtocol === proto.id
                    ? 'border-[--color-primary] bg-[--accent-bg] text-[--color-primary]'
                    : 'border-[--color-border] text-[--color-text-secondary] hover:border-[--color-primary]'
                }`}
              >
                {proto.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[--color-text-secondary] mt-1">选择你的自定义接口使用的协议格式</p>
        </div>
      )}

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
          {isCustom
            ? `填写你的 API 完整地址，当前使用 ${customProtocol === 'anthropic' ? 'Anthropic' : 'OpenAI'} 兼容格式`
            : '可修改为代理地址或中转地址'}
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

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !canSubmit}
          className={`px-4 py-2 text-xs rounded-lg font-medium transition-colors disabled:opacity-50 ${
            saved
              ? 'bg-[--success-bg] text-[var(--success)]'
              : 'bg-[--color-primary] text-white hover:bg-[--color-primary-hover]'
          }`}
        >
          {saving ? '保存中...' : saved ? '✓ 已保存' : '保存配置'}
        </button>
        <button
          onClick={handleTestConnection}
          disabled={testStatus === 'testing' || !canSubmit}
          className={`px-4 py-2 text-xs rounded-lg font-medium border transition-colors disabled:opacity-50 ${
            testStatus === 'success'
              ? 'bg-[--success-bg] border-[--success-bg] text-[var(--success)]'
              : testStatus === 'error'
                ? 'bg-[--danger-bg] border-[--danger-bg] text-[var(--danger)]'
                : 'border-[--color-border] text-[--color-text-secondary] hover:border-[--color-primary] hover:text-[--color-primary]'
          }`}
        >
          {testStatus === 'testing' ? '测试中...' : testStatus === 'success' ? '✓ 连接成功' : '测试连接'}
        </button>
      </div>

      {error && (
        <div
          className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}

      {testError && (
        <div
          className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
        >
          {testError}
        </div>
      )}

      <ConfirmDialog
        open={confirmProviderChange}
        title="切换供应商"
        message="切换供应商将清空当前 API Key，是否继续？"
        confirmLabel="继续"
        cancelLabel="取消"
        danger
        onConfirm={handleConfirmProvider}
        onCancel={handleCancelProvider}
      />
    </div>
  )
}
