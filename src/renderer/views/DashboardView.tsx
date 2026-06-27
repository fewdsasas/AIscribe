import React, { useEffect, useState } from 'react'
import { ProjectCard } from '../components/project/ProjectCard'
import { ProjectDialog } from '../components/project/ProjectDialog'
import { ProjectSettings } from '../components/project/ProjectSettings'
import { ExportDialog } from '../components/project/ExportDialog'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'
import { logger } from '../utils/logger'
import { projectService } from '../services/projectService'
import type { Project } from '../../shared/types'

interface DashboardViewProps {
  onSelectProject: (id: string) => void
  onNewProject: () => void
}

interface WritingStats {
  totalProjects: number
  totalWordCount: number
  totalChapters: number
  dailyGoal: number
  todayWords: number
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectProject }) => {
  const { showToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null)
  const [exportProjectId, setExportProjectId] = useState<string | null>(null)
  const [exportProjectName, setExportProjectName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Writing stats
  const [stats, setStats] = useState<WritingStats>({
    totalProjects: 0,
    totalWordCount: 0,
    totalChapters: 0,
    dailyGoal: 2000,
    todayWords: 0
  })

  const loadProjects = async () => {
    try {
      const list = await projectService.list()
      setProjects(list ?? [])
      if (list) {
        const totalWords = list.reduce((s: number, p: Project) => s + (p.wordCount || 0), 0)
        const prefs = localStorage.getItem('aiscribe-editor-prefs')
        const dailyGoal = prefs
          ? (() => {
              try {
                return JSON.parse(prefs).dailyGoal ?? 2000
              } catch {
                return 2000
              }
            })()
          : 2000

        // Aggregate stats via single IPC call (avoids N+1)
        let totalChapters = 0
        try {
          const stats = await projectService.dashboardStats()
          if (Array.isArray(stats)) {
            totalChapters = stats.reduce((sum: number, s: { chapterCount?: number }) => sum + (s.chapterCount || 0), 0)
          }
        } catch (err) {
          logger.warn('DashboardView: 加载章节统计失败', err)
        }

        setStats({
          totalProjects: list.length,
          totalWordCount: totalWords,
          totalChapters,
          dailyGoal,
          todayWords: 0
        })
      }
    } catch (err) {
      logger.warn('DashboardView: 加载项目列表失败', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleCreated = (projectId: string) => {
    setShowDialog(false)
    loadProjects()
    onSelectProject(projectId)
  }

  // Shows confirm dialog instead of native confirm()
  const handleDeleteRequest = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    try {
      await projectService.delete(deleteConfirmId)
      loadProjects()
    } catch (err) {
      logger.error('删除项目失败:', err)
      showToast('删除失败，请重试', 'error')
    }
    setDeleteConfirmId(null)
  }

  const handleDeleteCancel = () => setDeleteConfirmId(null)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            我的项目
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            管理和创作你的小说作品
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="px-4 py-2 bg-[--color-primary] text-white rounded-lg text-sm font-medium hover:bg-[--color-primary-hover] transition-colors"
        >
          + 新建项目
        </button>
      </div>

      {/* Writing stats — C3: p-5, C4: 30px 楷书 */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-8">
          <div className="bg-surface rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              总字数
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 400,
                marginTop: 4,
                fontFamily: "'Ma Shan Zheng','ZCOOL XiaoWei','KaiTi',serif",
                letterSpacing: 2
              }}
            >
              {(stats.totalWordCount / 10000).toFixed(1)}
              <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.6, fontFamily: "'Noto Serif SC',serif" }}>
                万
              </span>
            </div>
          </div>
          <div className="bg-surface rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              项目数
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 400,
                marginTop: 4,
                fontFamily: "'Ma Shan Zheng','ZCOOL XiaoWei','KaiTi',serif",
                letterSpacing: 2
              }}
            >
              {stats.totalProjects}
            </div>
          </div>
          <div className="bg-surface rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              章节数
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 400,
                marginTop: 4,
                fontFamily: "'Ma Shan Zheng','ZCOOL XiaoWei','KaiTi',serif",
                letterSpacing: 2
              }}
            >
              {stats.totalChapters}
            </div>
          </div>
          <div className="bg-surface rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              今日目标
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 400,
                marginTop: 4,
                fontFamily: "'Ma Shan Zheng','ZCOOL XiaoWei','KaiTi',serif",
                letterSpacing: 2,
                color: 'var(--accent)'
              }}
            >
              {stats.todayWords}
              <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.6, fontFamily: "'Noto Serif SC',serif" }}>
                /{stats.dailyGoal}
              </span>
            </div>
            <div
              className="mt-2"
              style={{ height: 3, background: 'var(--ink-100)', borderRadius: 2, overflow: 'hidden' }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  transition: 'width .3s',
                  width: `${Math.min((stats.todayWords / stats.dailyGoal) * 100, 100)}%`,
                  backgroundColor: stats.todayWords >= stats.dailyGoal ? 'var(--success)' : 'var(--accent)'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface rounded-lg border border-[--color-border]" style={{ padding: 20 }}>
              <div className="animate-shimmer" style={{ width: '60%', height: 14, marginBottom: 10 }} />
              <div className="animate-shimmer" style={{ width: '80%', height: 10, marginBottom: 6 }} />
              <div className="animate-shimmer" style={{ width: '40%', height: 10, marginBottom: 14 }} />
              <div className="animate-shimmer" style={{ width: '100%', height: 3 }} />
            </div>
          ))}
        </div>
      )}

      {/* Project grid — C5: gap-3.5 (14px) */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={onSelectProject}
              onDelete={handleDeleteRequest}
              onSettings={setSettingsProjectId}
              onExport={id => {
                setExportProjectId(id)
                setExportProjectName(project.name)
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-[--color-text] mb-2">还没有创作项目</h3>
          <p className="text-sm text-[--color-text-secondary] mb-6">点击上方按钮开始你的第一部小说</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
            <div className="bg-surface rounded-xl p-4 border border-[--color-border] text-left">
              <div className="text-2xl mb-2">📖</div>
              <h4 className="text-sm font-medium mb-1">新手入门</h4>
              <p className="text-xs text-[--color-text-secondary]">从黄金三章开始，快速上手</p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-[--color-border] text-left">
              <div className="text-2xl mb-2">🎨</div>
              <h4 className="text-sm font-medium mb-1">创作工具</h4>
              <p className="text-xs text-[--color-text-secondary]">故事结构、角色设计、世界观</p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-[--color-border] text-left">
              <div className="text-2xl mb-2">🤖</div>
              <h4 className="text-sm font-medium mb-1">AI 辅助</h4>
              <p className="text-xs text-[--color-text-secondary]">智能润色、续写、去AI味检测</p>
            </div>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <ProjectDialog open={showDialog} onClose={() => setShowDialog(false)} onCreated={handleCreated} />

      {/* Settings dialog */}
      {settingsProjectId && (
        <ProjectSettings
          projectId={settingsProjectId}
          onClose={() => setSettingsProjectId(null)}
          onUpdated={loadProjects}
        />
      )}

      {/* Export dialog */}
      {exportProjectId && (
        <ExportDialog
          projectId={exportProjectId}
          projectName={exportProjectName}
          onClose={() => setExportProjectId(null)}
        />
      )}

      {/* Delete confirmation dialog (replaces native confirm) */}
      {deleteConfirmId && (
        <ConfirmDialog
          open={true}
          title="删除项目"
          message="确认删除该项目？所有写作数据将不可恢复。"
          confirmLabel="删除"
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  )
}
