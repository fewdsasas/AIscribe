// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createProjectService } from '@renderer/services/projectService'
import type { AiscribeAPI } from '@shared/types/electron'
import type { Project } from '@shared/types'
import type { CreateProjectData, UpdateProjectData } from '@shared/types/ipc'

function createMockApi(): AiscribeAPI {
  return {
    projectCreate: vi.fn(),
    projectList: vi.fn(),
    projectGet: vi.fn(),
    projectUpdate: vi.fn(),
    projectDelete: vi.fn(),
    projectDashboardStats: vi.fn(),

    novelCreate: vi.fn(),
    novelGet: vi.fn(),
    novelGetByProject: vi.fn(),

    chapterCreate: vi.fn(),
    chapterList: vi.fn(),
    chapterListWithContent: vi.fn(),
    chapterGet: vi.fn(),
    chapterUpdate: vi.fn(),
    chapterCounts: vi.fn(),

    characterCreate: vi.fn(),
    characterList: vi.fn(),

    plotStructureGetByNovel: vi.fn(),
    plotStructureSave: vi.fn(),

    worldGetByNovel: vi.fn(),
    worldSave: vi.fn(),

    outlineGet: vi.fn(),
    outlineSave: vi.fn(),

    checkpointCreate: vi.fn(),
    checkpointList: vi.fn(),
    checkpointRestore: vi.fn(),

    sessionCreate: vi.fn(),
    sessionList: vi.fn(),

    writerModelGet: vi.fn(),
    writerModelSave: vi.fn(),

    skillList: vi.fn(),
    skillGet: vi.fn(),
    skillInvoke: vi.fn(),

    learningRecord: vi.fn(),
    learningAnalyze: vi.fn(),
    learningSummary: vi.fn(),
    memorySearch: vi.fn(),

    llmChat: vi.fn(),
    llmConfig: vi.fn(),
    llmIsConfigured: vi.fn(),
    llmConfigMeta: vi.fn(),
    startLLMStream: vi.fn(),
    cancelLLMStream: vi.fn(),
    onLLMChunk: vi.fn(),
    onLLMDone: vi.fn(),
    onLLMError: vi.fn(),
    removeLLMListeners: vi.fn(),

    dbTables: vi.fn(),

    exportProject: vi.fn(),

    secureStorageSet: vi.fn(),
    secureStorageGet: vi.fn(),
    secureStorageRemove: vi.fn(),

    getMemoryUsage: vi.fn()
  } as unknown as AiscribeAPI
}

describe('createProjectService', () => {
  it('should delegate list to api.projectList', async () => {
    const api = createMockApi()
    const service = createProjectService(api)
    const projects: Project[] = [{ id: 'p1', name: 'Project 1' } as Project]
    vi.mocked(api.projectList).mockResolvedValue(projects)

    const result = await service.list()

    expect(api.projectList).toHaveBeenCalled()
    expect(result).toBe(projects)
  })

  it('should delegate get to api.projectGet', async () => {
    const api = createMockApi()
    const service = createProjectService(api)
    const project: Project = { id: 'p1', name: 'Project 1' } as Project
    vi.mocked(api.projectGet).mockResolvedValue(project)

    const result = await service.get('p1')

    expect(api.projectGet).toHaveBeenCalledWith('p1')
    expect(result).toBe(project)
  })

  it('should delegate create to api.projectCreate', async () => {
    const api = createMockApi()
    const service = createProjectService(api)
    const data: CreateProjectData = { name: 'New Project' }
    const project: Project = { id: 'p1', name: 'New Project' } as Project
    vi.mocked(api.projectCreate).mockResolvedValue(project)

    const result = await service.create(data)

    expect(api.projectCreate).toHaveBeenCalledWith(data)
    expect(result).toBe(project)
  })

  it('should delegate update to api.projectUpdate', async () => {
    const api = createMockApi()
    const service = createProjectService(api)
    const data: UpdateProjectData = { name: 'Updated' }
    vi.mocked(api.projectUpdate).mockResolvedValue(true)

    const result = await service.update('p1', data)

    expect(api.projectUpdate).toHaveBeenCalledWith('p1', data)
    expect(result).toBe(true)
  })

  it('should delegate delete to api.projectDelete', async () => {
    const api = createMockApi()
    const service = createProjectService(api)
    vi.mocked(api.projectDelete).mockResolvedValue(true)

    const result = await service.delete('p1')

    expect(api.projectDelete).toHaveBeenCalledWith('p1')
    expect(result).toBe(true)
  })

  it('should delegate dashboardStats to api.projectDashboardStats', async () => {
    const api = createMockApi()
    const service = createProjectService(api)
    const stats = [{ id: 'p1', name: 'Project 1', novelCount: 2, chapterCount: 10 } as Project & { novelCount: number; chapterCount: number }]
    vi.mocked(api.projectDashboardStats).mockResolvedValue(stats)

    const result = await service.dashboardStats()

    expect(api.projectDashboardStats).toHaveBeenCalled()
    expect(result).toBe(stats)
  })
})
