import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { EnvironmentEditor } from './components/EnvironmentEditor'
import { PlayerHub } from './components/PlayerHub'
import { Auth } from './components/Auth'
import { ConfirmDialog } from './components/ConfirmDialog'
import { GameDataProvider, useGameData } from './state/GameDataContext'
import { AuthProvider, useAuth } from './state/AuthContext'
import type { GameEnvironment } from './types'
import { generateId } from './utils/id'

type TabKey = 'player' | 'master'

function AppShell() {
  const { user, logout } = useAuth()
  const {
    environments,
    players,
    isLoading,
    addEnvironment,
    updateEnvironment,
    removeEnvironment,
    addPlayer,
    updatePlayer,
    removePlayer,
  } = useGameData()
  const isAdmin = user?.username === 'admin'
  const [activeTab, setActiveTab] = useState<TabKey>('player')

  // Set default tab based on admin status
  useEffect(() => {
    if (isAdmin) {
      setActiveTab('master')
    } else {
      setActiveTab('player')
    }
  }, [isAdmin])
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('')
  const [newEnvironmentName, setNewEnvironmentName] = useState('')
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null)
  const [environmentPendingRemoval, setEnvironmentPendingRemoval] = useState<GameEnvironment | null>(null)
  const [isRemovingEnvironment, setIsRemovingEnvironment] = useState(false)

  useEffect(() => {
    if (!selectedEnvironmentId && environments.length > 0) {
      setSelectedEnvironmentId(environments[0].id)
    }
  }, [environments, selectedEnvironmentId])

  useEffect(() => {
    if (!environments.some((env) => env.id === selectedEnvironmentId) && environments.length) {
      setSelectedEnvironmentId(environments[0].id)
    }
  }, [environments, selectedEnvironmentId])

  const activeEnvironment = useMemo(() => {
    return environments.find((env) => env.id === selectedEnvironmentId) ?? null
  }, [environments, selectedEnvironmentId])

  function notify(message: string, type: 'info' | 'error' = 'info') {
    setStatusMessage({ text: message, type })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  async function handleCreateEnvironment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = newEnvironmentName.trim()
    if (!trimmed) {
      notify('Adj nevet az új játéknak.', 'error')
      return
    }
    if (trimmed.length > 32) {
      notify('A játék neve legfeljebb 32 karakter lehet.', 'error')
      return
    }
    if (environments.some((env) => env.name.toLowerCase() === trimmed.toLowerCase())) {
      notify('Ilyen nevű játék már létezik.', 'error')
      return
    }

    const environment: GameEnvironment = {
      id: generateId('environment'),
      name: trimmed,
      worldCards: [],
      starterCollection: [],
      dungeons: [],
    }

    try {
      await addEnvironment(environment)
      setSelectedEnvironmentId(environment.id)
      setNewEnvironmentName('')
      notify('Új játék hozzáadva.')
    } catch (error: any) {
      notify(error.message || 'Hiba történt a játék létrehozása során', 'error')
    }
  }

  async function handleEnvironmentUpdate(updatedEnvironment: GameEnvironment) {
    try {
      await updateEnvironment(updatedEnvironment)
    } catch (error: any) {
      notify(error.message || 'Hiba történt a játék mentése során', 'error')
    }
  }

  function handleEnvironmentRemovalRequest(environment: GameEnvironment) {
    setEnvironmentPendingRemoval(environment)
  }

  function cancelEnvironmentRemoval() {
    if (isRemovingEnvironment) {
      return
    }
    setEnvironmentPendingRemoval(null)
  }

  async function confirmEnvironmentRemoval() {
    if (!environmentPendingRemoval) {
      return
    }
    const targetEnvironment = environmentPendingRemoval
    setIsRemovingEnvironment(true)
    try {
      await removeEnvironment(targetEnvironment.id)
      if (selectedEnvironmentId === targetEnvironment.id) {
        setSelectedEnvironmentId('')
      }
      notify('A játék törölve lett.')
    } catch (error: any) {
      notify(error?.message || 'Hiba történt a játék törlése során', 'error')
    } finally {
      setIsRemovingEnvironment(false)
      setEnvironmentPendingRemoval(null)
    }
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Betöltés...</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Damareen</h1>
          <p>Gyűjtögetős fantasy kártyakaland React alapokon.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ opacity: 0.9 }}>Üdv, {user?.username}!</span>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '0.5rem',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Kijelentkezés
          </button>
        </div>
      </header>

      {isAdmin && (
        <nav className="tabs" style={{ margin: '1rem 3rem', width: 'fit-content' }}>
          <button
            type="button"
            className={activeTab === 'player' ? 'active' : ''}
            onClick={() => setActiveTab('player')}
          >
            Játékmenet mód
          </button>
          <button
            type="button"
            className={activeTab === 'master' ? 'active' : ''}
            onClick={() => setActiveTab('master')}
          >
            Játékmester mód
          </button>
        </nav>
      )}

      {statusMessage && (
        <div className={`feedback feedback--${statusMessage.type} header-feedback`}>
          {statusMessage.text}
        </div>
      )}

      <main className="app-main">
        {isAdmin && (
          <aside className="environment-sidebar">
            <h2>Játékok</h2>
            <form className="form-grid" onSubmit={handleCreateEnvironment}>
              <label>
                Név
                <input
                  value={newEnvironmentName}
                  onChange={(event) => setNewEnvironmentName(event.target.value)}
                  maxLength={32}
                />
              </label>
              <button type="submit">Új játék</button>
            </form>

            <ul className="environment-list">
              {environments.map((environment) => (
                <li key={environment.id}>
                  <button
                    type="button"
                    className={selectedEnvironmentId === environment.id ? 'active' : ''}
                    onClick={() => setSelectedEnvironmentId(environment.id)}
                  >
                    {environment.name}
                  </button>
                  <span className="env-meta">
                    {environment.worldCards.length} kártya, {environment.dungeons.length} kazamata
                  </span>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => handleEnvironmentRemovalRequest(environment)}
                    disabled={isRemovingEnvironment}
                  >
                    Törlés
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {!isAdmin && (
          <aside className="environment-sidebar">
            <h2>Játékok</h2>
            <ul className="environment-list">
              {environments.map((environment) => (
                <li key={environment.id}>
                  <button
                    type="button"
                    className={selectedEnvironmentId === environment.id ? 'active' : ''}
                    onClick={() => setSelectedEnvironmentId(environment.id)}
                  >
                    {environment.name}
                  </button>
                  <span className="env-meta">
                    {environment.worldCards.length} kártya, {environment.dungeons.length} kazamata
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <section className="workspace">
          {activeTab === 'master' && activeEnvironment && (
            <EnvironmentEditor environment={activeEnvironment} onSave={handleEnvironmentUpdate} />
          )}

          {activeTab === 'player' && (
            <PlayerHub
              environments={environments}
              players={players}
              onCreatePlayer={addPlayer}
              onUpdatePlayer={updatePlayer}
              onRemovePlayer={removePlayer}
              defaultPlayerName={user?.username ?? ''}
              defaultEnvironmentId={selectedEnvironmentId}
            />
          )}

          {activeTab === 'master' && !activeEnvironment && (
            <p>Adj hozzá egy játékot a szerkesztéshez.</p>
          )}
        </section>
      </main>
      <ConfirmDialog
        open={Boolean(environmentPendingRemoval)}
        title="Játék törlése"
        description={
          environmentPendingRemoval
            ? `Biztosan törlöd a "${environmentPendingRemoval.name}" játékot? Ez a művelet nem visszavonható.`
            : ''
        }
        confirmLabel="Játék törlése"
        cancelLabel="Mégse"
        onCancel={cancelEnvironmentRemoval}
        onConfirm={confirmEnvironmentRemoval}
        isConfirming={isRemovingEnvironment}
      />
    </div>
  )
}

function AppWithAuth() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Betöltés...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Auth />
  }

  return (
    <GameDataProvider>
      <AppShell />
    </GameDataProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  )
}

export default App
