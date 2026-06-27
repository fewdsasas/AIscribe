// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createCharacterService } from '@renderer/services/characterService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { Character } from '@shared/types'
import type { CreateCharacterData } from '@shared/types/ipc'

describe('createCharacterService', () => {
  it('should delegate create to api.characterCreate', async () => {
    const api = createMockAiscribeAPI()
    const service = createCharacterService(api)
    const data: CreateCharacterData = { novelId: 'n1', name: '张三', role: 'protagonist' }
    const character: Character = { id: 'c1', novelId: 'n1', name: '张三' } as Character
    vi.mocked(api.characterCreate).mockResolvedValue(character)

    const result = await service.create(data)

    expect(api.characterCreate).toHaveBeenCalledWith(data)
    expect(result).toBe(character)
  })

  it('should delegate list to api.characterList', async () => {
    const api = createMockAiscribeAPI()
    const service = createCharacterService(api)
    const characters: Character[] = [{ id: 'c1', novelId: 'n1', name: '张三' } as Character]
    vi.mocked(api.characterList).mockResolvedValue(characters)

    const result = await service.list('n1')

    expect(api.characterList).toHaveBeenCalledWith('n1')
    expect(result).toBe(characters)
  })
})
