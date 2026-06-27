import { vi } from 'vitest'
import type { AiscribeAPI } from '@shared/types/electron'

export function createMockAiscribeAPI(): AiscribeAPI {
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
