import {useState, useEffect} from 'react'
import {TableViewActions, TableViewComponent} from "uic-pack";

interface BackupElement {
  file: string
  timestamp: string
  collection?: string
}

const API = import.meta.env.VITE_API || '/api/v1/'

const BackupManager = () => {
  const [backups, setBackups] = useState<BackupElement[]>([])

  useEffect(() => {
    fetch(API + 'backup.php?action=list') // Call PHP API
      .then(res => res.json())
      .then(data =>
        setBackups(
          data.data.map((d: BackupElement) => ({
            ...d,
            collection: d.collection || d.file.split('_')[0],
          }))
        )
      )
      .catch(err => console.error(err))
  }, [])

  const deleteBackup = async (file: string) => {
    await fetch(API + 'backup.php?action=delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({file}),
    })
    setBackups(backups.filter(b => b.file !== file))
  }

  return (
    <div className='p-6'>
      <h1 className='text-xl font-bold'>Backup Manager</h1>
      <TableViewComponent
        header={['Collection', 'Backup file', 'Actions']}
        lines={backups.map((backup) => (
          [
            backup.collection,
            backup.file,
            TableViewActions({
              onRemove: () => deleteBackup(backup.file)
            })
          ]
        ))}
      />
    </div>
  )
}

export default BackupManager
