import { useState, useMemo } from 'react'
import type { ProjectConfig } from './lib/projects'
import { useBackups } from './hooks/useBackups'
import { ToastContainer } from './components/ToastContainer'
import { ConfirmModal } from './components/backup/ConfirmModal'
import { CreateModal } from './components/backup/CreateModal'
import { BackupStats } from './components/backup/BackupStats'
import { BackupTable } from './components/backup/BackupTable'
import type { ConfirmAction } from './types/backup'

const BackupManager = ({ project }: { project: ProjectConfig | null }) => {
  const {
    backups, loading, error, creating, actionFile, backupProgress, toasts,
    toast, fetchBackups, createBackup, deleteBackup, restoreBackup,
  } = useBackups()

  const [filter, setFilter] = useState('')
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())

  const filtered = useMemo(
    () => backups.filter(
      b =>
        b.collections.some(c => c.toLowerCase().includes(filter.toLowerCase())) ||
        b.file.toLowerCase().includes(filter.toLowerCase())
    ),
    [backups, filter]
  )

  const openCreateModal = () => {
    if (!project) {
      toast('error', 'No active project. Configure one in Project Settings.')
      return
    }
    setSelectedCollections(new Set(project.collections))
    setShowCreateModal(true)
  }

  const handleConfirm = () => {
    if (!confirm) return
    const { type, file } = confirm
    setConfirm(null)
    if (type === 'delete') deleteBackup(file)
    else restoreBackup(file)
  }

  const handleToggleCollection = (col: string) => {
    setSelectedCollections(prev => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  const handleSelectAll = () => {
    if (!project) return
    if (selectedCollections.size === project.collections.length) {
      setSelectedCollections(new Set())
    } else {
      setSelectedCollections(new Set(project.collections))
    }
  }

  return (
    <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
      <ToastContainer toasts={toasts} />

      {confirm && (
        <ConfirmModal
          confirm={confirm}
          onClose={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      )}

      {showCreateModal && project && (
        <CreateModal
          project={project}
          creating={creating}
          selectedCollections={selectedCollections}
          onToggleCollection={handleToggleCollection}
          onSelectAll={handleSelectAll}
          backupProgress={backupProgress}
          onClose={() => setShowCreateModal(false)}
          onCreate={() => createBackup(selectedCollections).then(() => setShowCreateModal(false))}
        />
      )}

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Backup Manager</h1>
        <p className='mt-1 text-sm text-gray-500'>Manage your Firestore collection backups</p>
      </div>

      <BackupStats backups={backups} loading={loading} />

      <BackupTable
        backups={filtered}
        totalCount={backups.length}
        loading={loading}
        error={error}
        project={project}
        filter={filter}
        onFilterChange={setFilter}
        actionFile={actionFile}
        creating={creating}
        onRestore={file => setConfirm({ type: 'restore', file })}
        onDelete={file => setConfirm({ type: 'delete', file })}
        onRefresh={fetchBackups}
        onCreateClick={openCreateModal}
      />
    </div>
  )
}

export default BackupManager
