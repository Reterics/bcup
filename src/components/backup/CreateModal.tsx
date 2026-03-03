import type { ProjectConfig } from '../../lib/projects'
import type { BackupProgress } from '../../types/backup'
import { Spinner } from '../Spinner'

interface CreateModalProps {
  project: ProjectConfig
  creating: boolean
  selectedCollections: Set<string>
  onToggleCollection: (col: string) => void
  onSelectAll: () => void
  backupProgress: BackupProgress | null
  onClose: () => void
  onCreate: () => void
}

export function CreateModal({
  project,
  creating,
  selectedCollections,
  onToggleCollection,
  onSelectAll,
  backupProgress,
  onClose,
  onCreate,
}: CreateModalProps) {
  const progressLabel = backupProgress
    ? backupProgress.step === 'fetching'
      ? `Fetching collections... (${backupProgress.current}/${backupProgress.total})`
      : backupProgress.step === 'uploading'
        ? 'Uploading backup...'
        : 'Complete!'
    : ''

  const progressPercent = backupProgress
    ? backupProgress.step === 'fetching'
      ? (backupProgress.current / backupProgress.total) * 80
      : backupProgress.step === 'uploading'
        ? 90
        : 100
    : 0

  return (
    <div className='fixed inset-0 z-40 flex items-center justify-center'>
      <div
        className='fixed inset-0 bg-black/30 animate-fade-in'
        onClick={() => !creating && onClose()}
      />
      <div className='relative bg-white rounded shadow-lg max-w-md w-full mx-4 animate-fade-in overflow-hidden'>
        <div className='h-1 bg-blue-500' />
        <div className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Create Backup</h3>

          <p className='text-sm text-gray-600 mb-4'>
            Select collections to back up from{' '}
            <span className='font-medium'>{project.name}</span>:
          </p>

          <div className='mb-3'>
            <button
              onClick={onSelectAll}
              disabled={creating}
              className='text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50'
            >
              {selectedCollections.size === project.collections.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className='space-y-1 mb-6'>
            {project.collections.map(col => {
              const checked = selectedCollections.has(col)
              return (
                <label
                  key={col}
                  className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
                    checked ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  } ${creating ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={() => onToggleCollection(col)}
                    disabled={creating}
                    className='w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500'
                  />
                  <span className='text-sm text-gray-700'>{col}</span>
                </label>
              )
            })}
          </div>

          {backupProgress && (
            <div className='mb-6'>
              <div className='flex items-center justify-between mb-1.5'>
                <span className='text-xs font-medium text-gray-600'>{progressLabel}</span>
              </div>
              <div className='w-full bg-gray-200 rounded h-2 overflow-hidden'>
                <div
                  className='bg-blue-600 h-2 rounded transition-all duration-300 ease-out'
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className='flex justify-end gap-3'>
            <button
              onClick={onClose}
              disabled={creating}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50'
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={creating || selectedCollections.size === 0}
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2'
            >
              {creating && <Spinner />}
              {creating ? 'Backing up...' : 'Start Backup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
