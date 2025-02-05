import Header from './components/Header.tsx'
import BackupManager from './BackupManager.tsx'

const App = () => {
  return (
    <div>
      <Header />
      <div className='container'>
        <BackupManager />
      </div>
    </div>
  )
}

export default App
