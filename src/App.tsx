import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { EnvironmentEditor } from './components/EnvironmentEditor'
import { PlayerHub } from './components/PlayerHub'
import { GameDataProvider, useGameData } from './state/GameDataContext'
import type { GameEnvironment } from './types'
import { generateId } from './utils/id'

type TabKey = 'player' | 'master'

function AppShell() {
  const {
    environments,
    players,
    addEnvironment,
    updateEnvironment,
    removeEnvironment,
    addPlayer,
    updatePlayer,
  } = useGameData()
  const [activeTab, setActiveTab] = useState<TabKey>('player')
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('')
  const [newEnvironmentName, setNewEnvironmentName] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

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

  function notify(message: string) {
    setStatusMessage(message)
    setTimeout(() => setStatusMessage(null), 3000)
  }

  function handleCreateEnvironment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = newEnvironmentName.trim()
    if (!trimmed) {
      notify('Adj nevet az uj jatekkornyezetnek.')
      return
    }
    if (trimmed.length > 32) {
      notify('A kornyezet neve legfeljebb 32 karakter lehet.')
      return
    }
    if (environments.some((env) => env.name.toLowerCase() === trimmed.toLowerCase())) {
      notify('Ilyen nevu kornyezet mar letezik.')
      return
    }

    const environment: GameEnvironment = {
      id: generateId('environment'),
      name: trimmed,
      worldCards: [],
      starterCollection: [],
      dungeons: [],
    }

    addEnvironment(environment)
    setSelectedEnvironmentId(environment.id)
    setNewEnvironmentName('')
    notify('Uj jatekkornyezet hozzaadva.')
  }

  function handleEnvironmentUpdate(updatedEnvironment: GameEnvironment) {
    updateEnvironment(updatedEnvironment)
  }

  function handleEnvironmentRemoval(environmentId: string) {
    if (!confirm('Biztosan torlod ezt a jatekkornyezetet?')) {
      return
    }
    removeEnvironment(environmentId)
    notify('A kornyezet torolve lett.')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Damareen</h1>
          <p>Gyujtogetos fantasy kartya kaland React alapokon.</p>
        </div>
        <nav className="tabs">
          <button
            type="button"
            className={activeTab === 'player' ? 'active' : ''}
            onClick={() => setActiveTab('player')}
          >
            Jatekos mod
          </button>
          <button
            type="button"
            className={activeTab === 'master' ? 'active' : ''}
            onClick={() => setActiveTab('master')}
          >
            Jatekmester mod
          </button>
        </nav>
      </header>

      {statusMessage && <p className="feedback header-feedback">{statusMessage}</p>}

      <main className="app-main">
        <aside className="environment-sidebar">
          <h2>Kornyezetek</h2>
          <form className="form-grid" onSubmit={handleCreateEnvironment}>
            <label>
              Nev
              <input
                value={newEnvironmentName}
                onChange={(event) => setNewEnvironmentName(event.target.value)}
                maxLength={32}
              />
            </label>
            <button type="submit">Uj kornyezet</button>
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
                  {environment.worldCards.length} kartya, {environment.dungeons.length} kazamata
                </span>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => handleEnvironmentRemoval(environment.id)}
                >
                  Torles
                </button>
              </li>
            ))}
          </ul>
        </aside>

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
            />
          )}

          {activeTab === 'master' && !activeEnvironment && (
            <p>Adj hozza egy jatekkornyezetet a szerkeszteshez.</p>
          )}
        </section>
      </main>
    </div>
  )
}

function App() {
  return (
    <GameDataProvider>
      <AppShell />
    </GameDataProvider>
  )
}

export default App
