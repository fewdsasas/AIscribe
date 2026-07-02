import { useEffect, useState } from 'react'
import { useToast } from './Toast'

export const KeyboardShortcutHandler: React.FC<{
  onNavigate?: (view: string) => void
  onNewProject?: () => void
  onSave?: () => void
}> = ({ onNavigate, onNewProject, onSave }) => {
  const { showToast } = useToast()
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Shift+? — toggle help panel
      if (e.key === '?' && !ctrl) {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      // ESC — close help panel
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false)
        return
      }
      if (ctrl && e.key === 'n') {
        e.preventDefault()
        onNewProject?.()
        return
      }
      if (ctrl && e.key === 's') {
        e.preventDefault()
        onSave?.()
        showToast('已保存', 'success')
        return
      }
      if (ctrl && e.key === '1') {
        e.preventDefault()
        onNavigate?.('dashboard')
        return
      }
      if (ctrl && e.key === '2') {
        e.preventDefault()
        onNavigate?.('editor')
        return
      }
      if (ctrl && e.key === '3') {
        e.preventDefault()
        onNavigate?.('studio')
        return
      }
      if (ctrl && e.key === '4') {
        e.preventDefault()
        onNavigate?.('workshop')
        return
      }
      if (ctrl && e.key === '5') {
        e.preventDefault()
        onNavigate?.('aiChat')
        return
      }
      if (ctrl && e.key === '6') {
        e.preventDefault()
        onNavigate?.('settings')
        return
      }
      if (ctrl && e.key === '7') {
        e.preventDefault()
        onNavigate?.('reader')
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onNavigate, onNewProject, onSave, showToast, showHelp])

  return showHelp ? (
    <div
      className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="bg-[--color-surface] rounded-xl p-6 shadow-xl max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--color-text)' }}>
          快捷键帮助
        </h2>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <li className="flex justify-between">
            <span>切换视图</span>
            <kbd className="text-[10px] opacity-50">Ctrl+1~7</kbd>
          </li>
          <li className="flex justify-between">
            <span>新建项目</span>
            <kbd className="text-[10px] opacity-50">Ctrl+N</kbd>
          </li>
          <li className="flex justify-between">
            <span>保存</span>
            <kbd className="text-[10px] opacity-50">Ctrl+S</kbd>
          </li>
          <li className="flex justify-between">
            <span>打开设置</span>
            <kbd className="text-[10px] opacity-50">Ctrl+,</kbd>
          </li>
          <li className="flex justify-between">
            <span>全局搜索</span>
            <kbd className="text-[10px] opacity-50">Ctrl+K</kbd>
          </li>
          <li className="flex justify-between">
            <span>发送消息</span>
            <kbd className="text-[10px] opacity-50">Enter</kbd>
          </li>
          <li className="flex justify-between">
            <span>换行</span>
            <kbd className="text-[10px] opacity-50">Shift+Enter</kbd>
          </li>
        </ul>
        <button
          onClick={() => setShowHelp(false)}
          className="mt-6 w-full px-4 py-2 text-sm rounded-lg transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          关闭
        </button>
      </div>
    </div>
  ) : null
}
