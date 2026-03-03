import type { BackupElement } from '../../types/backup'
import { timeAgo } from '../../lib/backupUtils'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='bg-white border border-gray-200 rounded p-3'>
      <p className='text-lg font-semibold text-gray-900'>{value}</p>
      <p className='text-xs text-gray-500'>{label}</p>
    </div>
  )
}

export function BackupStats({ backups, loading }: { backups: BackupElement[]; loading: boolean }) {
  const allCollections = [...new Set(backups.flatMap(b => b.collections))]
  const totalDocuments = backups.reduce(
    (sum, b) => sum + (typeof b.documents === 'number' ? b.documents : 0),
    0
  )
  const latest = backups[0]

  return (
    <div className='grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6'>
      <StatCard label='Total Backups' value={loading ? '...' : backups.length} />
      <StatCard label='Collections' value={loading ? '...' : allCollections.length} />
      <StatCard label='Documents' value={loading ? '...' : totalDocuments.toLocaleString()} />
      <StatCard label='Latest Backup' value={loading ? '...' : latest ? timeAgo(latest.timestamp) : 'None'} />
    </div>
  )
}
