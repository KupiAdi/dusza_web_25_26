import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { EnvironmentEditor } from './components/EnvironmentEditor'
import { PlayerHub } from './components/PlayerHub'
import { Auth } from './components/Auth'
import { ConfirmDialog } from './components/ConfirmDialog'
import { LanguageSelector } from './components/LanguageSelector'
import { GameDataProvider, useGameData } from './state/GameDataContext'
import { AuthProvider, useAuth } from './state/AuthContext'
import { LanguageProvider, useTranslation } from './state/LanguageContext'
import type { GameEnvironment } from './types'
import { generateId } from './utils/id'

type TabKey = 'player' | 'master'

function AppShell() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
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

  const greetingText = user?.username
    ? t('app.greeting', { name: user.username })
    : t('common.welcomeGuest')

  function notify(message: string, type: 'info' | 'error' = 'info') {
    setStatusMessage({ text: message, type })
    setTimeout(() => setStatusMessage(null), 3000)
  }

  async function handleCreateEnvironment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = newEnvironmentName.trim()
    if (!trimmed) {
      notify(t('validation.environmentNameRequired'), 'error')
      return
    }
    if (trimmed.length > 32) {
      notify(t('validation.environmentNameMax'), 'error')
      return
    }
    if (environments.some((env) => env.name.toLowerCase() === trimmed.toLowerCase())) {
      notify(t('validation.environmentNameExists'), 'error')
      return
    }

    const environment: GameEnvironment = {
      id: generateId('environment'),
      name: trimmed,
      worldCards: [],
      dungeons: [],
    }

    try {
      await addEnvironment(environment)
      setSelectedEnvironmentId(environment.id)
      setNewEnvironmentName('')
      notify(t('environment.feedback.created'))
    } catch (error: any) {
      notify(error.message || t('environment.errors.createFailed'), 'error')
    }
  }

  async function handleEnvironmentUpdate(updatedEnvironment: GameEnvironment) {
    try {
      await updateEnvironment(updatedEnvironment)
    } catch (error: any) {
      notify(error.message || t('environment.errors.updateFailed'), 'error')
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
      notify(t('environment.feedback.deleted'))
    } catch (error: any) {
      notify(error?.message || t('environment.errors.deleteFailed'), 'error')
    } finally {
      setIsRemovingEnvironment(false)
      setEnvironmentPendingRemoval(null)
    }
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <LanguageSelector size="small" />
          <span style={{ opacity: 0.9 }}>{greetingText}</span>
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
            {t('common.logout')}
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
            {t('app.tabs.player')}
          </button>
          <button
            type="button"
            className={activeTab === 'master' ? 'active' : ''}
            onClick={() => setActiveTab('master')}
          >
            {t('app.tabs.master')}
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
            <h2>{t('environment.sidebarTitle')}</h2>
            <form className="form-grid" onSubmit={handleCreateEnvironment}>
              <label>
                {t('environment.form.name')}
                <input
                  value={newEnvironmentName}
                  onChange={(event) => setNewEnvironmentName(event.target.value)}
                  maxLength={32}
                />
              </label>
              <button type="submit">{t('environment.form.submit')}</button>
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
                    {t('environment.meta.summary', {
                      cards: environment.worldCards.length,
                      dungeons: environment.dungeons.length,
                    })}
                  </span>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => handleEnvironmentRemovalRequest(environment)}
                    disabled={isRemovingEnvironment}
                  >
                    {t('common.delete')}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {!isAdmin && (
          <aside className="environment-sidebar">
            <h2>{t('environment.sidebarTitle')}</h2>
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
                    {t('environment.meta.summary', {
                      cards: environment.worldCards.length,
                      dungeons: environment.dungeons.length,
                    })}
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
            <p>{t('app.masterEmpty')}</p>
          )}
        </section>
      </main>
      <ConfirmDialog
        open={Boolean(environmentPendingRemoval)}
        title={t('environment.confirm.deleteTitle')}
        description={
          environmentPendingRemoval
            ? t('environment.confirm.deleteDescription', { name: environmentPendingRemoval.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={cancelEnvironmentRemoval}
        onConfirm={confirmEnvironmentRemoval}
        isConfirming={isRemovingEnvironment}
      />
    </div>
  )
}

function AppWithAuth() {
  const { isAuthenticated, isLoading } = useAuth()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>{t('common.loading')}</p>
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
    <LanguageProvider>
      <AuthProvider>
        <AppWithAuth />
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
