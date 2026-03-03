export interface BackupElement {
  file: string
  timestamp: number
  collections: string[]
  documents?: number
  size?: number
}

export interface Toast {
  id: number
  type: 'success' | 'error'
  message: string
}

export interface ConfirmAction {
  type: 'delete' | 'restore'
  file: string
}

export interface BackupProgress {
  step: 'fetching' | 'uploading' | 'done'
  current: number
  total: number
}
