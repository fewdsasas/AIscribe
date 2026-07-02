import React, { useEffect, useState } from 'react'
import { useToast } from '../shared/Toast'
import { logger } from '@renderer/utils/logger'
import { characterService } from '@renderer/services'
import type { CharacterRole } from '@shared/types'

const ROLES: CharacterRole[] = [
  'protagonist',
  'antagonist',
  'supporting',
  'love_interest',
  'mentor',
  'sidekick',
  'foil',
  'confidant',
  'villain',
  'minor'
]
const MBTI_TYPES = [
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP'
]

interface CharacterFormProps {
  novelId: string
  characterId?: string | null
  onClose: () => void
  onSaved: () => void
}

export const CharacterForm: React.FC<CharacterFormProps> = ({ novelId, characterId, onClose, onSaved }) => {
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [role, setRole] = useState<CharacterRole>('supporting')
  const [mbti, setMbti] = useState('')
  const [traits, setTraits] = useState('')
  const [background, setBackground] = useState('')
  const [appearance, setAppearance] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!characterId) return
    // Load existing character data (simplified)
  }, [characterId])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await characterService.create({
        novelId,
        name: name.trim(),
        aliases: [],
        role,
        personality: {
          mbti: mbti || undefined,
          traits: traits
            .split(/[,，]/)
            .map(s => s.trim())
            .filter(Boolean),
          virtues: [],
          flaws: [],
          motivations: [],
          coreBelief: ''
        },
        background,
        appearance,
        abilities: [],
        goals: [],
        fears: [],
        secrets: [],
        arc: { type: 'positive', startingState: '', endingState: '', catalyst: '', keyMoments: [] },
        relationships: []
      })
      onSaved()
      onClose()
    } catch (err) {
      logger.error('Failed to save character:', err)
      showToast(`保存失败: ${(err as Error).message}`, 'error')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
            {characterId ? '编辑角色' : '新建角色'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--color-text-secondary)' }}>
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                角色名 *
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="输入角色名"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                角色类型
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as CharacterRole)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                MBTI 人格
              </label>
              <select
                value={mbti}
                onChange={e => setMbti(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <option value="">未设置</option>
                {MBTI_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                性格特质
              </label>
              <input
                value={traits}
                onChange={e => setTraits(e.target.value)}
                placeholder="冷静, 勇敢（逗号分隔）"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              背景故事
            </label>
            <textarea
              value={background}
              onChange={e => setBackground(e.target.value)}
              rows={3}
              placeholder="角色的出身、经历..."
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              外貌描述
            </label>
            <textarea
              value={appearance}
              onChange={e => setAppearance(e.target.value)}
              rows={2}
              placeholder="外貌特征、穿着风格..."
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm bg-[--color-primary] text-white rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存角色'}
          </button>
        </div>
      </div>
    </div>
  )
}
