import React, { useState } from 'react'
import { LLMConfig } from '../components/settings/LLMConfig'
import { EditorPrefs } from '../components/settings/EditorPrefs'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'
import { THEMES, useTheme } from '../hooks/useTheme'
import { logger } from '../utils/logger'
import { projectService } from '../services'

type SettingsTab = 'llm' | 'editor' | 'theme' | 'data'

export const SettingsView: React.FC = () => {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<SettingsTab>('llm')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleExportAll = async () => {
    try {
      const projects = await projectService.list()
      if (!projects || projects.length === 0) return
      const data = JSON.stringify(projects, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aiscribe-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      logger.error('导出数据失败:', err)
      showToast('导出失败，请重试', 'error')
    }
  }

  const handleImportData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      // Parse and import (simplified - would need proper merging logic)
      showToast('导入功能将在后续版本完善', 'info')
    }
    input.click()
  }

  const handleResetConfirm = async () => {
    setShowResetConfirm(false)
    localStorage.clear()
    window.location.reload()
  }

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'llm', label: 'LLM 配置', icon: '🤖' },
    { id: 'editor', label: '编辑器偏好', icon: '✍️' },
    { id: 'theme', label: '主题', icon: '🎨' },
    { id: 'data', label: '数据管理', icon: '💾' }
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[--color-text]">设置</h2>
        <p className="text-sm text-[--color-text-secondary] mt-1">配置应用偏好和 AI 模型</p>
      </div>

      {/* Tabs — 仅文字+底线 */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-bar-btn ${activeTab === tab.id ? 'tab-bar-btn-active' : ''}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-surface rounded-xl border border-[--color-border] p-6">
        {activeTab === 'llm' && <LLMConfig />}
        {activeTab === 'editor' && <EditorPrefs />}

        {activeTab === 'theme' && (
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[--color-text]">主题设置</h3>
            <p className="text-xs text-[--color-text-secondary] mt-1">选择你喜欢的界面主题</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    theme === t.id
                      ? 'border-[--color-primary] bg-[--accent-bg]'
                      : 'border-[--color-border] hover:border-[--color-primary]'
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div className="text-left">
                    <div className="text-sm font-medium text-[--color-text]">{t.label}</div>
                    <div className="text-xs text-[--color-text-secondary] mt-0.5">{t.desc}</div>
                  </div>
                  {theme === t.id && <span className="ml-auto text-sm text-[--color-primary]">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[--color-text]">数据管理</h3>
            <p className="text-xs text-[--color-text-secondary]">管理应用数据（开发中）</p>
            <div className="space-y-2">
              <button
                onClick={handleExportAll}
                className="w-full px-4 py-3 text-xs rounded-lg border border-[--color-border] text-left hover:bg-[--color-bg] transition-colors"
              >
                📤 导出所有数据
              </button>
              <button
                onClick={handleImportData}
                className="w-full px-4 py-3 text-xs rounded-lg border border-[--color-border] text-left hover:bg-[--color-bg] transition-colors"
              >
                📥 导入数据
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full px-4 py-3 text-xs rounded-lg border text-left transition-colors"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                🗑️ 重置所有数据
              </button>
            </div>

            {showResetConfirm && (
              <ConfirmDialog
                open={true}
                title="重置所有数据"
                message="此操作将删除所有本地数据（包括项目、章节、设置）。此操作不可撤销。"
                confirmLabel="确认重置"
                danger
                onConfirm={handleResetConfirm}
                onCancel={() => setShowResetConfirm(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
