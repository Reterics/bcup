import { useState } from 'react'
import logo from '../../img/logo.png'

interface Props {
  onSettingsClick: () => void
  projectName: string | null
}

const Header = ({ onSettingsClick, projectName }: Props) => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className='bg-white border-b border-gray-200'>
      <nav className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-14'>
          <a href='/' className='flex items-center gap-1.5'>
            <img src={logo} width={28} height={28} className='h-7 w-7' alt='BCup Logo' />
            <span className='text-lg font-semibold text-gray-900'>
              B<span className='text-sm text-gray-500'>Cup</span>
            </span>
          </a>

          {projectName && (
            <span className='hidden sm:inline text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded'>
              {projectName}
            </span>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            type='button'
            className='inline-flex items-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hidden transition-colors'
            aria-expanded={menuOpen}
          >
            <span className='sr-only'>Toggle menu</span>
            {menuOpen ? (
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            ) : (
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 6h16M4 12h16M4 18h16' />
              </svg>
            )}
          </button>

          <div className='hidden md:flex items-center gap-6'>
            <a
              href='/'
              className='text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors'
            >
              Dashboard
            </a>
            <button
              onClick={onSettingsClick}
              className='inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors'
              title='Project Settings'
            >
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                />
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
              </svg>
              Settings
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className='md:hidden border-t border-gray-100 py-2'>
            <a
              href='/'
              className='block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md'
            >
              Dashboard
            </a>
            <button
              onClick={() => {
                onSettingsClick()
                setMenuOpen(false)
              }}
              className='block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md'
            >
              Project Settings
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Header
