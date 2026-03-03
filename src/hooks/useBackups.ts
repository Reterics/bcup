import { useState, useCallback, useRef, useEffect } from 'react'
import { getDocuments, setDocument } from '../lib/firebase'
import { getActiveProject } from '../lib/projects'
import { API } from '../lib/backupUtils'
import type { BackupElement, Toast, BackupProgress } from '../types/backup'

export function useBackups() {
  const [backups, setBackups] = useState<BackupElement[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [actionFile, setActionFile] = useState<string | null>(null)
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [error, setError] = useState<string | null>(null)
  const tid = useRef(0)

  const toast = useCallback((type: Toast['type'], message: string) => {
    const id = ++tid.current
    setToasts(p => [...p, { id, type, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  const fetchBackups = useCallback(async () => {
    setLoading(true)
    try {
      setError(null)
      const project = getActiveProject()
      if (!project) { setBackups([]); return }
      const res = await fetch(`${API}backup.php?action=list&project=${encodeURIComponent(project.firebaseConfig.projectId)}`)
      const data = await res.json()
      if (data.success) {
        setBackups(
          data.data
            .map((d: Record<string, unknown>) => {
              const legacy = d as unknown as { collection?: string }
              let collections: string[]
              if (Array.isArray(d.collections) && d.collections.length > 0) {
                collections = d.collections
              } else if (legacy.collection) {
                collections = [legacy.collection]
              } else {
                collections = [(d.file as string).split('_')[0]]
              }
              return { ...d, collections } as BackupElement
            })
            .sort((a: BackupElement, b: BackupElement) => b.timestamp - a.timestamp)
        )
      } else {
        setError(data.error || 'Failed to load backups')
      }
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  const createBackup = useCallback(async (selectedCollections: Set<string>) => {
    const project = getActiveProject()
    if (!project) return

    const cols = Array.from(selectedCollections)
    if (cols.length === 0) return

    setCreating(true)
    setBackupProgress({ step: 'fetching', current: 0, total: cols.length })

    try {
      const collectionsData: Record<string, Array<Record<string, unknown>>> = {}
      for (let i = 0; i < cols.length; i++) {
        setBackupProgress({ step: 'fetching', current: i, total: cols.length })
        try {
          collectionsData[cols[i]] = await getDocuments(cols[i])
        } catch (err) {
          toast('error', `Failed to fetch ${cols[i]}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          return
        }
      }

      setBackupProgress({ step: 'uploading', current: cols.length, total: cols.length })

      const backupData = {
        collections: collectionsData,
        project: {
          name: project.name,
          firebaseConfig: project.firebaseConfig,
        },
      }

      const res = await fetch(API + 'backup.php?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData),
      })
      const data = await res.json()

      setBackupProgress({ step: 'done', current: cols.length, total: cols.length })

      if (data.success) {
        const totalDocs = Object.values(collectionsData).reduce((sum, docs) => sum + docs.length, 0)
        toast('success', `Backup created: ${cols.length} collection(s), ${totalDocs} document(s)`)
      } else {
        toast('error', data.error || 'Backup creation failed')
      }
      fetchBackups()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Backup creation failed')
    } finally {
      setCreating(false)
      setBackupProgress(null)
    }
  }, [fetchBackups, toast])

  const deleteBackup = useCallback(async (file: string) => {
    setActionFile(file)
    try {
      const res = await fetch(API + 'backup.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, project: getActiveProject()?.firebaseConfig.projectId }),
      })
      const data = await res.json()
      if (data.success) {
        setBackups(p => p.filter(b => b.file !== file))
        toast('success', 'Backup deleted')
      } else {
        toast('error', data.error || 'Delete failed')
      }
    } catch {
      toast('error', 'Connection failed')
    } finally {
      setActionFile(null)
    }
  }, [toast])

  const restoreBackup = useCallback(async (file: string) => {
    const project = getActiveProject()
    if (!project) {
      toast('error', 'No active project. Configure one in Project Settings.')
      return
    }
    setActionFile(file)
    try {
      const res = await fetch(API + 'backup.php?action=restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, project: project.firebaseConfig.projectId }),
      })
      const data = await res.json()
      if (!data.success) {
        toast('error', data.error || 'Failed to read backup')
        return
      }

      const collections: Record<string, Array<Record<string, unknown>>> = data.collections
      let totalDocs = 0
      let totalErrors = 0

      for (const [collectionName, documents] of Object.entries(collections)) {
        for (const doc of documents) {
          const docId = doc.id as string
          if (!docId) continue
          totalDocs++
          try {
            await setDocument(collectionName, docId, doc)
          } catch {
            totalErrors++
          }
        }
      }

      const colNames = Object.keys(collections).join(', ')
      if (totalErrors === 0) {
        toast('success', `Restored ${totalDocs} documents across ${colNames}`)
      } else {
        toast('error', `Restored with ${totalErrors} error(s) out of ${totalDocs} documents`)
      }
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setActionFile(null)
    }
  }, [toast])

  return {
    backups,
    loading,
    error,
    creating,
    actionFile,
    backupProgress,
    toasts,
    toast,
    fetchBackups,
    createBackup,
    deleteBackup,
    restoreBackup,
  }
}
