import { useState, useEffect } from 'react'
import {
  ProjectConfig,
  getProjects,
  saveProject,
  deleteProject,
  getActiveProjectName,
  setActiveProject,
} from '../lib/projects'

const EMPTY_CONFIG: ProjectConfig = {
  name: '',
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
  collections: [],
}

interface Props {
  onClose: () => void
  onProjectChange: () => void
}

const ProjectSettings = ({ onClose, onProjectChange }: Props) => {
  const [projects, setProjects] = useState<ProjectConfig[]>([])
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null)
  const [editing, setEditing] = useState<ProjectConfig | null>(null)
  const [collectionsInput, setCollectionsInput] = useState('')

  useEffect(() => {
    setProjects(getProjects())
    setActiveProjectName(getActiveProjectName())
  }, [])

  const startAdd = () => {
    setEditing({ ...EMPTY_CONFIG, firebaseConfig: { ...EMPTY_CONFIG.firebaseConfig } })
    setCollectionsInput('')
  }

  const startEdit = (p: ProjectConfig) => {
    setEditing({ ...p, firebaseConfig: { ...p.firebaseConfig } })
    setCollectionsInput(p.collections.join(', '))
  }

  const handleSave = () => {
    if (!editing || !editing.name.trim()) return
    const cols = collectionsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const project: ProjectConfig = { ...editing, collections: cols }
    saveProject(project)
    setProjects(getProjects())
    setEditing(null)
    onProjectChange()
  }

  const handleDelete = (name: string) => {
    deleteProject(name)
    setProjects(getProjects())
    onProjectChange()
  }

  const handleActivate = (name: string) => {
    setActiveProject(name)
    setActiveProjectName(name)
    onProjectChange()
  }

  const updateFirebaseField = (field: keyof ProjectConfig['firebaseConfig'], value: string) => {
    if (!editing) return
    setEditing({
      ...editing,
      firebaseConfig: { ...editing.firebaseConfig, [field]: value },
    })
  }

  return (
    <div className='fixed inset-0 z-40 flex items-center justify-center'>
      <div className='fixed inset-0 bg-black/30 animate-fade-in' onClick={onClose} />
      <div className='relative bg-white rounded shadow-lg max-w-xl w-full mx-4 animate-fade-in overflow-hidden max-h-[90vh] flex flex-col'>
        <div className='h-1 bg-blue-500' />
        <div className='p-6 overflow-y-auto'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-gray-900'>Project Settings</h3>
            <button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>

          {/* Project List */}
          {!editing && (
            <>
              {projects.length === 0 ? (
                <p className='text-sm text-gray-500 mb-4'>No projects configured. Add one to get started.</p>
              ) : (
                <div className='space-y-2 mb-4'>
                  {projects.map(p => (
                    <div
                      key={p.name}
                      className={`flex items-center justify-between p-3 border rounded ${
                        activeProjectName === p.name ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div>
                        <p className='text-sm font-medium text-gray-900'>
                          {p.name}
                          {activeProjectName === p.name && (
                            <span className='ml-2 text-xs text-blue-600 font-normal'>Active</span>
                          )}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {p.firebaseConfig.projectId} &middot; {p.collections.length} collection
                          {p.collections.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        {activeProjectName !== p.name && (
                          <button
                            onClick={() => handleActivate(p.name)}
                            className='px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100'
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(p)}
                          className='px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50'
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.name)}
                          className='px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100'
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={startAdd}
                className='w-full px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 border-dashed rounded hover:bg-blue-50'
              >
                + Add Project
              </button>
            </>
          )}

          {/* Edit Form */}
          {editing && (
            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-medium text-gray-700 mb-1'>Project Name</label>
                <input
                  type='text'
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder='My Project'
                  className='w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>

              <p className='text-xs font-medium text-gray-500 uppercase tracking-wider pt-2'>Firebase Config</p>

              {(
                [
                  ['apiKey', 'API Key'],
                  ['authDomain', 'Auth Domain'],
                  ['projectId', 'Project ID'],
                  ['storageBucket', 'Storage Bucket'],
                  ['messagingSenderId', 'Messaging Sender ID'],
                  ['appId', 'App ID'],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label className='block text-xs font-medium text-gray-700 mb-1'>{label}</label>
                  <input
                    type='text'
                    value={editing.firebaseConfig[field]}
                    onChange={e => updateFirebaseField(field, e.target.value)}
                    placeholder={label}
                    className='w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
              ))}

              <div>
                <label className='block text-xs font-medium text-gray-700 mb-1'>
                  Collections (comma-separated)
                </label>
                <input
                  type='text'
                  value={collectionsInput}
                  onChange={e => setCollectionsInput(e.target.value)}
                  placeholder='e.g. parts, orders, users'
                  className='w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>

              <div className='flex justify-end gap-3 pt-2'>
                <button
                  onClick={() => setEditing(null)}
                  className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editing.name.trim()}
                  className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50'
                >
                  Save Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectSettings
