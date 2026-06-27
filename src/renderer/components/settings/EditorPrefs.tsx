import React, { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'aiscribe-editor-prefs'

interface EditorPrefsData {
  autoSaveInterval: number
  dailyGoal: number
  fontSize: number
  fontFamily: 'serif' | 'sans'
}

const defaultPrefs: EditorPrefsData = {
  autoSaveInterval: 2,
  dailyGoal: 2000,
  fontSize: 16,
  fontFamily: 'serif'
}

export const EditorPrefs: React.FC = () => {
  const [prefs, setPrefs] = useState<EditorPrefsData>(defaultPrefs)
  const [saved, setSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setPrefs({ ...defaultPrefs, ...JSON.parse(saved) })
      } catch (err) {
        console.warn('编辑器偏好解析失败:', err)
      }
    }
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current)
      }
    }
  }, [])

  const update = (key: keyof EditorPrefsData, value: number | string) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium text-[--color-text]">编辑器偏好</h3>
      <p className="text-xs text-[--color-text-secondary]">自定义写作编辑器的默认行为</p>

      {/* Auto-save interval */}
      <div>
        <label className="block text-xs font-medium text-[--color-text] mb-1">
          自动保存间隔：{prefs.autoSaveInterval} 秒
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={prefs.autoSaveInterval}
          onChange={e => update('autoSaveInterval', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-[--color-text-secondary]">
          <span>1 秒</span>
          <span>30 秒</span>
          <span>60 秒</span>
        </div>
      </div>

      {/* Daily goal */}
      <div>
        <label className="block text-xs font-medium text-[--color-text] mb-1">
          每日写作目标：{prefs.dailyGoal.toLocaleString()} 字
        </label>
        <input
          type="range"
          min="500"
          max="10000"
          step="500"
          value={prefs.dailyGoal}
          onChange={e => update('dailyGoal', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-[--color-text-secondary]">
          <span>500</span>
          <span>5000</span>
          <span>10000</span>
        </div>
      </div>

      {/* Font size */}
      <div>
        <label className="block text-xs font-medium text-[--color-text] mb-1">正文字号：{prefs.fontSize}px</label>
        <div className="flex gap-2">
          {[14, 16, 18, 20].map(size => (
            <button
              key={size}
              onClick={() => update('fontSize', size)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                prefs.fontSize === size
                  ? 'border-[--color-primary] bg-[--amber-50] text-[--color-primary]'
                  : 'border-[--color-border] text-[--color-text-secondary]'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Font family */}
      <div>
        <label className="block text-xs font-medium text-[--color-text] mb-1">正文字体</label>
        <div className="flex gap-2">
          <button
            onClick={() => update('fontFamily', 'serif')}
            className={`px-3 py-1.5 rounded-lg text-xs border font-serif transition-colors ${
              prefs.fontFamily === 'serif'
                ? 'border-[--color-primary] bg-[--amber-50] text-[--color-primary]'
                : 'border-[--color-border] text-[--color-text-secondary]'
            }`}
          >
            Serif（衬线）
          </button>
          <button
            onClick={() => update('fontFamily', 'sans')}
            className={`px-3 py-1.5 rounded-lg text-xs border font-sans transition-colors ${
              prefs.fontFamily === 'sans'
                ? 'border-[--color-primary] bg-[--amber-50] text-[--color-primary]'
                : 'border-[--color-border] text-[--color-text-secondary]'
            }`}
          >
            Sans（无衬线）
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`px-4 py-2 text-xs rounded-lg font-medium transition-colors ${
          saved
            ? 'bg-[--success-bg] text-[var(--success)]'
            : 'bg-[--color-primary] text-white hover:bg-[--color-primary-hover]'
        }`}
      >
        {saved ? '✓ 已保存' : '保存偏好'}
      </button>
    </div>
  )
}
