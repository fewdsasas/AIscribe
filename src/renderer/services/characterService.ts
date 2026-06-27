import type { AiscribeAPI } from '@shared/types/electron'
import type { Character } from '@shared/types'
import type { CreateCharacterData } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface ICharacterService {
  create(data: CreateCharacterData): Promise<Character>
  list(novelId: string): Promise<Character[]>
}

export function createCharacterService(api: AiscribeAPI): ICharacterService {
  return {
    create: data => api.characterCreate(data),
    list: novelId => api.characterList(novelId)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const characterService: ICharacterService = createCharacterService(api)
