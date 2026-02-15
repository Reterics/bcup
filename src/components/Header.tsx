import {useState} from 'react'
import logo from '../../img/logo.png'

const Header = () => {
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
          </div>
        )}
      </nav>
    </header>
  )
}

export default Header
