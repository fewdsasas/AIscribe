import React from 'react'

interface TopBarProps {
  currentView: string
  onNavigate?: (view: string) => void
  projectName?: string
  isDark?: boolean
  onToggleTheme?: () => void
}

const VIEW_META: Record<string, { label: string; icon: string }> = {
  dashboard: { label: '项目', icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' },
  editor: {
    label: '写作',
    icon: 'M15.5 2H8.6c-.4 0-.8.2-1.1.5l-3 3.5c-.3.3-.5.7-.5 1.1V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4.5c0-.8-.7-1.5-1.5-1.5z'
  },
  reader: { label: '阅读', icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
  studio: { label: '工作室', icon: 'M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7' },
  workshop: { label: '技能', icon: 'M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7' },
  'ai-chat': { label: 'AI 对话', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  settings: {
    label: '设置',
    icon: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42'
  }
}

const Icon: React.FC<{ d: string; size?: number }> = ({ d, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
)

const ThemeIcon: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  if (isDark) {
    return <span className="text-base leading-none">🌙</span>
  }
  return <span className="text-base leading-none">☀️</span>
}

const ChatIcon = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

export const TopBar = React.memo<TopBarProps>(
  ({ currentView, onNavigate, projectName, isDark: _isDark, onToggleTheme }) => {
    const meta = VIEW_META[currentView] ?? { label: 'AIscribe', icon: '' }

    return (
      <header className="topbar">
        <div className="topbar-left">
          <Icon d={meta.icon} />
          <span className="topbar-label">{meta.label}</span>
          {projectName && (
            <>
              <span className="topbar-sep">/</span>
              <span className="topbar-project">{projectName}</span>
            </>
          )}
        </div>

        <div className="topbar-right">
          {currentView !== 'ai-chat' && (
            <button
              className="topbar-btn"
              onClick={() => onNavigate?.('ai-chat')}
              title="AI 对话"
              aria-label="打开 AI 对话"
            >
              <ChatIcon />
            </button>
          )}
          <button className="topbar-btn" onClick={onToggleTheme} title={_isDark ? '切换到亮色模式' : '切换到暗色模式'} aria-label="切换明暗主题">
            <ThemeIcon isDark={_isDark ?? false} />
          </button>
        </div>
      </header>
    )
  }
)
