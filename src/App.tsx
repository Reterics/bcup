import Header from './components/Header.tsx'
import BackupManager from './BackupManager.tsx'

const App = () => {
  return (
    <div className='min-h-screen bg-gray-50'>
      <Header />
      <main>
        <BackupManager />
      </main>
    </div>
  )
}

export default App
