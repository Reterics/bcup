import type { BackupElement } from '../../types/backup'
import type { ProjectConfig } from '../../lib/projects'
import { API, COLLECTION_COLORS, formatDate, timeAgo, formatBytes } from '../../lib/backupUtils'

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

function NoProjectState() {
  return (
    <div className='py-16 px-6 text-center'>
      <svg className='w-12 h-12 mx-auto text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={1.5}
          d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
        />
      </svg>
      <p className='mt-4 text-sm font-medium text-gray-900'>No active project</p>
      <p className='mt-1 text-sm text-gray-500'>Configure one in Project Settings to view its backups.</p>
    </div>
  )
}

interface BackupTableProps {
  backups: BackupElement[]
  totalCount: number
  loading: boolean
  error: string | null
  project: ProjectConfig | null
  filter: string
  onFilterChange: (f: string) => void
  actionFile: string | null
  creating: boolean
  onRestore: (file: string) => void
  onDelete: (file: string) => void
  onRefresh: () => void
  onCreateClick: () => void
}

export function BackupTable({
  backups,
  totalCount,
  loading,
  error,
  project,
  filter,
  onFilterChange,
  actionFile,
  creating,
  onRestore,
  onDelete,
  onRefresh,
  onCreateClick,
}: BackupTableProps) {
  return (
    <>
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
            onChange={e => onFilterChange(e.target.value)}
            className='w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
        </div>
        <div className='flex gap-2'>
          <button
            onClick={onRefresh}
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
            onClick={onCreateClick}
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
            onClick={onRefresh}
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
        ) : !project ? (
          <NoProjectState />
        ) : backups.length === 0 ? (
          <EmptyState hasFilter={!!filter} onClearFilter={() => onFilterChange('')} />
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
                {backups.map(backup => {
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
                            onClick={() => onRestore(backup.file)}
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
                            href={`${API}backup.php?action=download&file=${encodeURIComponent(backup.file)}&project=${encodeURIComponent(project?.firebaseConfig.projectId ?? '')}`}
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
                            onClick={() => onDelete(backup.file)}
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
      {!loading && backups.length > 0 && (
        <p className='mt-3 text-xs text-gray-400 text-right'>
          Showing {backups.length} of {totalCount} backup{totalCount !== 1 ? 's' : ''}
        </p>
      )}
    </>
  )
}
