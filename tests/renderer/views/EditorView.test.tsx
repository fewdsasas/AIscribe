// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EditorView } from '@renderer/views/EditorView'
import { chapterService, llmService, novelService, projectService } from '@renderer/services'
import type { Chapter, ChapterSummary, Novel, Project } from '@shared/types'

vi.mock('@renderer/services', () => ({
  projectService: {
    list: vi.fn()
  },
  novelService: {
    getByProject: vi.fn()
  },
  chapterService: {
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn()
  },
  llmService: {
    isConfigured: vi.fn(),
    chat: vi.fn()
  }
}))

vi.mock('@renderer/components/editor/NovelEditor', () => ({
  NovelEditor: vi.fn(({ onSave }: { onSave?: () => void }) => (
    <div data-testid="novel-editor">
      <button data-testid="editor-save" onClick={onSave}>
        Save
      </button>
    </div>
  ))
}))

vi.mock('@renderer/components/shared/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}))

vi.mock('@renderer/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: vi.fn(({ onConfirm, onCancel }: { onConfirm?: () => void; onCancel?: () => void }) => (
    <div data-testid="confirm-dialog">
      <button data-testid="confirm-yes" onClick={onConfirm}>
        续写
      </button>
      <button data-testid="confirm-no" onClick={onCancel}>
        取消
      </button>
    </div>
  ))
}))

vi.mock('@renderer/hooks/useMemoryMonitor', () => ({
  useMemoryMonitor: vi.fn()
}))

const mockedProjectService = vi.mocked(projectService)
const mockedNovelService = vi.mocked(novelService)
const mockedChapterService = vi.mocked(chapterService)
const mockedLLMService = vi.mocked(llmService)

describe('EditorView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedProjectService.list.mockResolvedValue([
      { id: 'p1', name: 'Project 1' } as Project,
      { id: 'p2', name: 'Project 2' } as Project
    ])
    mockedNovelService.getByProject.mockResolvedValue({ id: 'n1', projectId: 'p1', title: 'Novel 1' } as Novel)
    mockedChapterService.list.mockResolvedValue([
      { id: 'c1', novelId: 'n1', title: 'Chapter 1' } as ChapterSummary
    ])
    mockedChapterService.get.mockResolvedValue({
      id: 'c1',
      novelId: 'n1',
      title: 'Chapter 1',
      content: '{}',
      wordCount: 0
    } as Chapter)
    mockedChapterService.update.mockResolvedValue(true)
    mockedLLMService.isConfigured.mockResolvedValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render empty state when no projectId', () => {
    render(<EditorView projectId={null} />)
    expect(screen.getByText('请选择一个项目或新建项目开始写作')).toBeInTheDocument()
  })

  it('should load novel and chapters on mount', async () => {
    render(<EditorView projectId="p1" />)

    await waitFor(() => {
      expect(mockedNovelService.getByProject).toHaveBeenCalledWith('p1')
    })
    expect(mockedChapterService.list).toHaveBeenCalledWith('n1')
    expect(screen.getByTestId('novel-editor')).toBeInTheDocument()
  })

  it('should fallback to projectId when novel is missing', async () => {
    mockedNovelService.getByProject.mockResolvedValueOnce(null)
    render(<EditorView projectId="p1" />)

    await waitFor(() => {
      expect(mockedChapterService.list).toHaveBeenCalledWith('p1')
    })
  })

  it('should call chapterService.update when saving', async () => {
    render(<EditorView projectId="p1" />)

    await waitFor(() => {
      expect(mockedChapterService.get).toHaveBeenCalledWith('c1')
    })

    fireEvent.click(screen.getByTestId('editor-save'))

    await waitFor(() => {
      expect(mockedChapterService.update).toHaveBeenCalled()
    })
  })

  it('should show AI confirm dialog and call llmService on confirm', async () => {
    render(<EditorView projectId="p1" />)

    await waitFor(() => {
      expect(screen.getByText('🤖 AI 续写')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('🤖 AI 续写'))

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('confirm-yes'))

    await waitFor(() => {
      expect(mockedLLMService.isConfigured).toHaveBeenCalled()
    })
  })

  it('should switch project via dropdown', async () => {
    const onSwitchProject = vi.fn()
    render(<EditorView projectId="p1" onSwitchProject={onSwitchProject} />)

    await waitFor(() => {
      expect(screen.getByText('📁 切换项目')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('📁 切换项目'))

    await waitFor(() => {
      expect(screen.getByText('Project 2')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Project 2'))
    expect(onSwitchProject).toHaveBeenCalledWith('p2')
  })
})
