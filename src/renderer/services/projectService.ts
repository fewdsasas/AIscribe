import type { AiscribeAPI } from '@shared/types/electron'
import type { Project } from '@shared/types'
import type { CreateProjectData, UpdateProjectData } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface ProjectDashboardStats {
  novelCount: number
  chapterCount: number
}

export interface IProjectService {
  create(data: CreateProjectData): Promise<Project>
  list(): Promise<Project[]>
  get(id: string): Promise<Project | null>
  update(id: string, data: UpdateProjectData): Promise<boolean>
  delete(id: string): Promise<boolean>
  dashboardStats(): Promise<Array<Project & ProjectDashboardStats>>
}

export function createProjectService(api: AiscribeAPI): IProjectService {
  return {
    create: data => api.projectCreate(data),
    list: () => api.projectList(),
    get: id => api.projectGet(id),
    update: (id, data) => api.projectUpdate(id, data),
    delete: id => api.projectDelete(id),
    dashboardStats: () => api.projectDashboardStats()
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const projectService: IProjectService = createProjectService(api)
