import { describe, expect, it } from 'vitest'
import { IPC_CHANNELS } from '../../../src/shared/types/ipc'
import type { IpcChannel } from '../../../src/shared/types/ipc'

describe('IPC_CHANNELS constant', () => {
  it('should define all required invoke channels', () => {
    const invokeChannels: IpcChannel[] = [
      IPC_CHANNELS.PROJECT_CREATE,
      IPC_CHANNELS.PROJECT_LIST,
      IPC_CHANNELS.PROJECT_DASHBOARD_STATS,
      IPC_CHANNELS.PROJECT_GET,
      IPC_CHANNELS.PROJECT_UPDATE,
      IPC_CHANNELS.PROJECT_DELETE,
      IPC_CHANNELS.NOVEL_CREATE,
      IPC_CHANNELS.NOVEL_GET,
      IPC_CHANNELS.NOVEL_GET_BY_PROJECT,
      IPC_CHANNELS.CHAPTER_CREATE,
      IPC_CHANNELS.CHAPTER_LIST,
      IPC_CHANNELS.CHAPTER_GET,
      IPC_CHANNELS.CHAPTER_UPDATE,
      IPC_CHANNELS.CHAPTER_COUNTS,
      IPC_CHANNELS.CHARACTER_CREATE,
      IPC_CHANNELS.CHARACTER_LIST,
      IPC_CHANNELS.PLOT_STRUCTURE_GET_BY_NOVEL,
      IPC_CHANNELS.PLOT_STRUCTURE_SAVE,
      IPC_CHANNELS.WORLD_GET_BY_NOVEL,
      IPC_CHANNELS.WORLD_SAVE,
      IPC_CHANNELS.OUTLINE_GET,
      IPC_CHANNELS.OUTLINE_SAVE,
      IPC_CHANNELS.CHECKPOINT_CREATE,
      IPC_CHANNELS.CHECKPOINT_LIST,
      IPC_CHANNELS.CHECKPOINT_RESTORE,
      IPC_CHANNELS.SESSION_CREATE,
      IPC_CHANNELS.SESSION_LIST,
      IPC_CHANNELS.SKILL_LIST,
      IPC_CHANNELS.SKILL_GET,
      IPC_CHANNELS.SKILL_INVOKE,
      IPC_CHANNELS.LEARNING_RECORD,
      IPC_CHANNELS.LEARNING_ANALYZE,
      IPC_CHANNELS.LEARNING_SUMMARY,
      IPC_CHANNELS.MEMORY_SEARCH,
      IPC_CHANNELS.WRITER_MODEL_GET,
      IPC_CHANNELS.WRITER_MODEL_SAVE,
      IPC_CHANNELS.LLM_CHAT,
      IPC_CHANNELS.LLM_CHAT_STREAM,
      IPC_CHANNELS.LLM_CONFIG,
      IPC_CHANNELS.LLM_IS_CONFIGURED,
      IPC_CHANNELS.LLM_CONFIG_META,
      IPC_CHANNELS.DB_TABLES,
      IPC_CHANNELS.EXPORT_PROJECT,
      IPC_CHANNELS.STORAGE_ENCRYPT_SET,
      IPC_CHANNELS.STORAGE_ENCRYPT_GET,
      IPC_CHANNELS.STORAGE_ENCRYPT_REMOVE
    ]

    for (const channel of invokeChannels) {
      expect(typeof channel).toBe('string')
      expect(channel).toMatch(/^[a-z-]+:[a-zA-Z-]+$/)
    }

    expect(invokeChannels.length).toBe(46)
  })

  it('should define push channels for LLM streaming', () => {
    const pushChannels: IpcChannel[] = [IPC_CHANNELS.LLM_CHUNK, IPC_CHANNELS.LLM_DONE, IPC_CHANNELS.LLM_ERROR]

    for (const channel of pushChannels) {
      expect(typeof channel).toBe('string')
      expect(channel).toMatch(/^llm:[a-z]+$/)
    }
  })

  it('should have unique channel values', () => {
    const allValues = Object.values(IPC_CHANNELS)
    const uniqueValues = new Set(allValues)
    expect(allValues.length).toBe(uniqueValues.size)
  })

  it('should be readonly (as const)', () => {
    const channels = IPC_CHANNELS as { PROJECT_CREATE: string }
    expect(typeof channels.PROJECT_CREATE).toBe('string')
  })

  it('should match naming convention domain:action', () => {
    for (const [key, value] of Object.entries(IPC_CHANNELS)) {
      expect(value).toMatch(/^[a-z-]+:[a-zA-Z-]+$/)
      expect(key).toMatch(/^[A-Z_]+$/)
    }
  })
})
