import { FirebaseConfig } from './firebase'

export interface ProjectConfig {
  name: string
  firebaseConfig: FirebaseConfig
  collections: string[]
}

const STORAGE_KEY = 'bcup-projects'
const ACTIVE_KEY = 'bcup-active-project'

export function getProjects(): ProjectConfig[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveProject(project: ProjectConfig): void {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.name === project.name)
  if (idx >= 0) {
    projects[idx] = project
  } else {
    projects.push(project)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function deleteProject(name: string): void {
  const projects = getProjects().filter(p => p.name !== name)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  if (getActiveProjectName() === name) {
    localStorage.removeItem(ACTIVE_KEY)
  }
}

export function getActiveProjectName(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveProject(name: string): void {
  localStorage.setItem(ACTIVE_KEY, name)
}

export function getActiveProject(): ProjectConfig | null {
  const name = getActiveProjectName()
  if (!name) return null
  return getProjects().find(p => p.name === name) || null
}
