import type { AiscribeAPI } from '@shared/types/electron'
import type { LearningAnalysisResult, RecordLearningData } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface ILearningService {
  record(data: RecordLearningData): Promise<boolean>
  analyze(projectId: string): Promise<LearningAnalysisResult>
}

export function createLearningService(api: AiscribeAPI): ILearningService {
  return {
    record: data => api.learningRecord(data),
    analyze: projectId => api.learningAnalyze(projectId)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const learningService: ILearningService = createLearningService(api)
