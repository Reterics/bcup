import { useState, useEffect, useCallback, useRef } from 'react'
import { getDocuments, setDocument } from './lib/firebase'
import { getActiveProject } from './lib/projects'

interface BackupElement {
  file: string
  timestamp: number
  collections: string[]
  documents?: number
  size?: number
}

interface Toast {
  id: number
  type: 'success' | 'error'
  message: string
}

interface ConfirmAction {
  type: 'delete' | 'restore'
  file: string
}

const API = import.meta.env.VITE_API || '/api/v1/'

const COLLECTION_COLORS: Record<string, string> = {
  parts: 'bg-blue-100 text-blue-800',
  orders: 'bg-emerald-100 text-emerald-800',
  users: 'bg-violet-100 text-violet-800',
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeAgo(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function formatBytes(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '--'
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${sizes[i]}`
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill='none' viewBox='0 0 24 24'>
      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
      <path
        className='opacity-75'
        fill='currentColor'
        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
      />
    </svg>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='bg-white border border-gray-200 rounded p-3'>
      <p className='text-lg font-semibold text-gray-900'>{value}</p>
      <p className='text-xs text-gray-500'>{label}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className='p-6 space-y-4 animate-pulse'>
      {[...Array(5)].map((_, i) => (
        <div key={i} className='flex items-center gap-4'>
          <div className='h-6 w-20 bg-gray-200 rounded-full' />
          <div className='h-4 w-48 bg-gray-200 rounded' />
          <div className='h-4 w-32 bg-gray-200 rounded hidden sm:block' />
          <div className='ml-auto flex gap-2'>
            <div className='h-7 w-16 bg-gray-200 rounded' />
            <div className='h-7 w-16 bg-gray-200 rounded' />
            <div className='h-7 w-20 bg-gray-200 rounded' />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasFilter, onClearFilter }: { hasFilter: boolean; onClearFilter: () => void }) {
  return (
    <div className='py-16 px-6 text-center'>
      <svg className='w-12 h-12 mx-auto text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={1.5}
          d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
        />
      </svg>
      {hasFilter ? (
        <>
          <p className='mt-4 text-sm font-medium text-gray-900'>No matching backups</p>
          <p className='mt-1 text-sm text-gray-500'>Try adjusting your search filter.</p>
          <button
            onClick={onClearFilter}
            className='mt-4 text-sm font-medium text-blue-600 hover:text-blue-700'
          >
            Clear filter
          </button>
        </>
      ) : (
        <>
          <p className='mt-4 text-sm font-medium text-gray-900'>No backups yet</p>
          <p className='mt-1 text-sm text-gray-500'>Create your first backup to get started.</p>
        </>
      )}
    </div>
  )
}

const BackupManager = () => {
  const [backups, setBackups] = useState<BackupElement[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [actionFile, setActionFile] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())
  const [backupProgress, setBackupProgress] = useState<{
    step: 'fetching' | 'uploading' | 'done'
    current: number
    total: number
  } | null>(null)
  const tid = useRef(0)

  const toast = useCallback((type: Toast['type'], message: string) => {
    const id = ++tid.current
    setToasts(p => [...p, { id, type, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])

  const fetchBackups = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(API + 'backup.php?action=list')
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

  const openCreateModal = () => {
    const project = getActiveProject()
    if (!project) {
      toast('error', 'No active project. Configure one in Project Settings.')
      return
    }
    setSelectedCollections(new Set(project.collections))
    setShowCreateModal(true)
  }

  const createBackup = async () => {
    const project = getActiveProject()
    if (!project) return

    const cols = Array.from(selectedCollections)
    if (cols.length === 0) return

    setCreating(true)
    setBackupProgress({ step: 'fetching', current: 0, total: cols.length })

    try {
      // Fetch all selected collections' documents
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

      // Upload single backup
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
      setShowCreateModal(false)
    }
  }

  const deleteBackup = async (file: string) => {
    setActionFile(file)
    try {
      const res = await fetch(API + 'backup.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file }),
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
      setConfirm(null)
    }
  }

  const restoreBackup = async (file: string) => {
    setActionFile(file)
    try {
      const res = await fetch(API + 'backup.php?action=restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file }),
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
      setConfirm(null)
    }
  }

  const handleConfirm = () => {
    if (!confirm) return
    if (confirm.type === 'delete') deleteBackup(confirm.file)
    else restoreBackup(confirm.file)
  }

  const filtered = backups.filter(
    b =>
      b.collections.some(c => c.toLowerCase().includes(filter.toLowerCase())) ||
      b.file.toLowerCase().includes(filter.toLowerCase())
  )
  const allCollections = [...new Set(backups.flatMap(b => b.collections))]
  const latest = backups[0]
  const totalDocuments = backups.reduce(
    (sum, b) => sum + (typeof b.documents === 'number' ? b.documents : 0),
    0
  )

  const project = getActiveProject()

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
    <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
      {/* Toast Notifications */}
      <div className='fixed top-4 right-4 z-50 flex flex-col gap-2'>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded shadow-lg text-sm font-medium animate-slide-in ${
              t.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {t.type === 'success' ? (
              <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
              </svg>
            ) : (
              <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirm && (
        <div className='fixed inset-0 z-40 flex items-center justify-center'>
          <div className='fixed inset-0 bg-black/30 animate-fade-in' onClick={() => setConfirm(null)} />
          <div className='relative bg-white rounded shadow-lg max-w-md w-full mx-4 animate-fade-in overflow-hidden'>
            <div className={`h-1 ${confirm.type === 'delete' ? 'bg-red-500' : 'bg-blue-500'}`} />
            <div className='p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>
                {confirm.type === 'delete' ? 'Delete Backup' : 'Restore Backup'}
              </h3>
              <p className='text-sm text-gray-600 leading-relaxed'>
                {confirm.type === 'delete' ? (
                  <>
                    Are you sure you want to delete{' '}
                    <span className='font-medium text-gray-900'>{confirm.file}</span>? This action cannot be
                    undone.
                  </>
                ) : (
                  <>
                    This will restore all collections from{' '}
                    <span className='font-medium text-gray-900'>{confirm.file}</span>. Current data in the
                    collections will be overwritten.
                  </>
                )}
              </p>
              <div className='mt-6 flex justify-end gap-3'>
                <button
                  onClick={() => setConfirm(null)}
                  className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!!actionFile}
                  className={`px-4 py-2 text-sm font-medium text-white rounded flex items-center gap-2 transition-colors disabled:opacity-50 ${
                    confirm.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {actionFile && <Spinner />}
                  {confirm.type === 'delete' ? 'Delete' : 'Restore'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Backup Modal */}
      {showCreateModal && project && (
        <div className='fixed inset-0 z-40 flex items-center justify-center'>
          <div
            className='fixed inset-0 bg-black/30 animate-fade-in'
            onClick={() => !creating && setShowCreateModal(false)}
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
                  onClick={() => {
                    if (selectedCollections.size === project.collections.length) {
                      setSelectedCollections(new Set())
                    } else {
                      setSelectedCollections(new Set(project.collections))
                    }
                  }}
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
                        onChange={() => {
                          setSelectedCollections(prev => {
                            const next = new Set(prev)
                            if (next.has(col)) next.delete(col)
                            else next.add(col)
                            return next
                          })
                        }}
                        disabled={creating}
                        className='w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500'
                      />
                      <span className='text-sm text-gray-700'>{col}</span>
                    </label>
                  )
                })}
              </div>

              {/* Progress Bar */}
              {backupProgress && (
                <div className='mb-6'>
                  <div className='flex items-center justify-between mb-1.5'>
                    <span className='text-xs font-medium text-gray-600'>
                      {progressLabel}
                    </span>
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
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={createBackup}
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
      )}

      {/* Page Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Backup Manager</h1>
        <p className='mt-1 text-sm text-gray-500'>Manage your Firestore collection backups</p>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6'>
        <StatCard label='Total Backups' value={loading ? '...' : backups.length} />
        <StatCard label='Collections' value={loading ? '...' : allCollections.length} />
        <StatCard label='Documents' value={loading ? '...' : totalDocuments.toLocaleString()} />
        <StatCard label='Latest Backup' value={loading ? '...' : latest ? timeAgo(latest.timestamp) : 'None'} />
      </div>

      {/* Action Bar */}
      <div className='flex flex-col sm:flex-row gap-3 mb-6'>
        <div className='relative flex-1'>
          <svg
            className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
          <input
            type='text'
            placeholder='Filter by collection or filename...'
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className='w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => {
              setLoading(true)
              fetchBackups()
            }}
            disabled={loading}
            className='inline-flex items-center justify-center px-3 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 transition-colors'
            title='Refresh'
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
          </button>
          <button
            onClick={openCreateModal}
            disabled={creating}
            className='inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors'
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
            </svg>
            Create Backup
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded flex items-center gap-3'>
          <svg className='w-5 h-5 text-red-500 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <p className='text-sm text-red-700'>{error}</p>
          <button
            onClick={() => {
              setLoading(true)
              fetchBackups()
            }}
            className='ml-auto text-sm font-medium text-red-700 hover:text-red-800 underline'
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className='bg-white border border-gray-200 rounded shadow-sm overflow-hidden'>
        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState hasFilter={!!filter} onClearFilter={() => setFilter('')} />
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-200 bg-gray-50/80'>
                  <th className='text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3'>
                    Collections
                  </th>
                  <th className='text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3'>
                    Backup File
                  </th>
                  <th className='text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell'>
                    Documents
                  </th>
                  <th className='text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell'>
                    Size
                  </th>
                  <th className='text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell'>
                    Date
                  </th>
                  <th className='text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {filtered.map(backup => {
                  const isActing = actionFile === backup.file
                  return (
                    <tr
                      key={backup.file}
                      className={`hover:bg-gray-50/50 transition-colors ${isActing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <td className='px-6 py-4'>
                        <div className='flex flex-wrap gap-1'>
                          {backup.collections.map(col => {
                            const colors = COLLECTION_COLORS[col] || 'bg-gray-100 text-gray-800'
                            return (
                              <span
                                key={col}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}
                              >
                                {col}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <span className='text-sm text-gray-700 font-mono'>{backup.file}</span>
                        <span className='block text-xs text-gray-500 sm:hidden mt-0.5'>
                          {typeof backup.documents === 'number'
                            ? `${backup.documents.toLocaleString()} document${backup.documents !== 1 ? 's' : ''}`
                            : 'Documents: --'}
                          {' - '}
                          {formatBytes(backup.size)}
                        </span>
                        <span className='block text-xs text-gray-400 md:hidden mt-0.5'>
                          {formatDate(backup.timestamp)}
                        </span>
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-700 hidden sm:table-cell'>
                        {typeof backup.documents === 'number' ? backup.documents.toLocaleString() : '--'}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-500 hidden md:table-cell'>
                        {formatBytes(backup.size)}
                      </td>
                      <td
                        className='px-6 py-4 text-sm text-gray-500 hidden md:table-cell'
                        title={formatDate(backup.timestamp)}
                      >
                        <div>{formatDate(backup.timestamp)}</div>
                        <div className='text-xs text-gray-400'>{timeAgo(backup.timestamp)}</div>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='flex items-center justify-end gap-1.5'>
                          <button
                            onClick={() =>
                              setConfirm({ type: 'restore', file: backup.file })
                            }
                            disabled={isActing}
                            className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50'
                            title='Restore this backup'
                          >
                            <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                              />
                            </svg>
                            <span className='hidden sm:inline'>Restore</span>
                          </button>
                          <a
                            href={`${API}backup.php?action=download&file=${encodeURIComponent(backup.file)}`}
                            target='_blank'
                            rel='noreferrer'
                            className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors'
                            title='Download this backup'
                            download
                          >
                            <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4'
                              />
                            </svg>
                            <span className='hidden sm:inline'>Download</span>
                          </a>
                          <button
                            onClick={() =>
                              setConfirm({ type: 'delete', file: backup.file })
                            }
                            disabled={isActing}
                            className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50'
                            title='Delete this backup'
                          >
                            <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                              />
                            </svg>
                            <span className='hidden sm:inline'>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <p className='mt-3 text-xs text-gray-400 text-right'>
          Showing {filtered.length} of {backups.length} backup{backups.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default BackupManager
