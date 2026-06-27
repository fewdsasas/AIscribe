import React from 'react'
import type { Project } from '../../../shared/types'

interface ProjectCardProps {
  project: Project
  onClick: (id: string) => void
  onDelete?: (id: string) => void
  onSettings?: (id: string) => void
  onExport?: (id: string) => void
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: '规划中', color: 'var(--accent)', bg: 'var(--accent-bg)' },
  outlining: { label: '大纲中', color: 'var(--accent)', bg: 'var(--accent-bg)' },
  writing: { label: '写作中', color: 'var(--success)', bg: 'var(--success-bg)' },
  revising: { label: '修改中', color: 'var(--accent)', bg: 'var(--accent-bg)' },
  completed: { label: '已完成', color: 'var(--success)', bg: 'var(--success-bg)' },
  on_hold: { label: '暂停', color: 'var(--text-secondary)', bg: 'var(--ink-100)' }
}

const GENRE_ICONS: Record<string, string> = {
  玄幻: '🐉',
  仙侠: '☯️',
  都市: '🏙️',
  悬疑: '🔍',
  科幻: '🚀',
  言情: '💕',
  轻小说: '📚',
  历史: '📜',
  游戏: '🎮',
  其他: '📖'
}

const SvgIcon = React.memo<{ d: string; size?: number }>(({ d, size = 14 }) => (
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
))

function safeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('zh-CN')
  } catch {
    return '—'
  }
}

export const ProjectCard = React.memo<ProjectCardProps>(({ project, onClick, onDelete, onSettings, onExport }) => {
  const statusInfo = STATUS_LABELS[project.status] ?? STATUS_LABELS.planning
  const progress =
    project.targetWordCount && project.targetWordCount > 0
      ? Math.min(Math.round((project.wordCount / project.targetWordCount) * 100), 100)
      : 0

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(project.id)
  }

  return (
    <div
      onClick={() => onClick(project.id)}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        transition: 'all .2s'
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{GENRE_ICONS[project.genre] ?? '📖'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--text)' }}>{project.name}</div>
              <div style={{ fontSize: 11, marginTop: 1, color: 'var(--text-secondary)' }}>{project.genre}</div>
            </div>
          </div>
          {/* Badge: 3px radius, 11px */}
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 3,
              backgroundColor: statusInfo.bg,
              color: statusInfo.color,
              flexShrink: 0
            }}
          >
            {statusInfo.label}
          </span>
        </div>

        {project.description && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginBottom: 12,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {project.description}
          </p>
        )}

        {project.targetWordCount && project.targetWordCount > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text-secondary)',
                marginBottom: 4
              }}
            >
              <span>
                {project.wordCount.toLocaleString()} / {project.targetWordCount.toLocaleString()} 字
              </span>
              <span>{progress}%</span>
            </div>
            {/* Progress bar: 3px */}
            <div style={{ height: 3, background: 'var(--ink-100)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  transition: 'width .3s',
                  width: `${progress}%`,
                  backgroundColor: progress >= 100 ? 'var(--success)' : 'var(--accent)'
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid var(--color-border)'
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{safeDate(project.updatedAt)} 更新</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={e => {
                e.stopPropagation()
                onExport?.(project.id)
              }}
              style={{
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: 'none',
                background: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all .15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--surface-hover)'
                e.currentTarget.style.color = 'var(--text)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              title="导出"
            >
              <SvgIcon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                onSettings?.(project.id)
              }}
              style={{
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: 'none',
                background: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all .15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--surface-hover)'
                e.currentTarget.style.color = 'var(--text)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              title="设置"
            >
              <SvgIcon d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2" />
            </button>
            <button
              onClick={handleDelete}
              style={{
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: 'none',
                background: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                transition: 'all .15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              title="删除"
            >
              <SvgIcon d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
