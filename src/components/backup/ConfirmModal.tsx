import type { ConfirmAction } from '../../types/backup'

interface ConfirmModalProps {
  confirm: ConfirmAction
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmModal({ confirm, onClose, onConfirm }: ConfirmModalProps) {
  return (
    <div className='fixed inset-0 z-40 flex items-center justify-center'>
      <div className='fixed inset-0 bg-black/30 animate-fade-in' onClick={onClose} />
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
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
                confirm.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {confirm.type === 'delete' ? 'Delete' : 'Restore'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
