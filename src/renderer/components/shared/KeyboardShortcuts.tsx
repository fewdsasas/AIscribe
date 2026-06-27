import { useEffect } from 'react'
import { useToast } from './Toast'

export const KeyboardShortcutHandler: React.FC<{
  onNavigate?: (view: string) => void
  onNewProject?: () => void
  onSave?: () => void
}> = ({ onNavigate, onNewProject, onSave }) => {
  const { showToast } = useToast()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Global shortcuts
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
        onNavigate?.('ai-chat')
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
  }, [onNavigate, onNewProject, onSave, showToast])

  return null
}
