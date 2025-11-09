import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { EnvironmentEditor } from './components/EnvironmentEditor'
import { PlayerHub } from './components/PlayerHub'
import { Auth } from './components/Auth'
import { ConfirmDialog } from './components/ConfirmDialog'
import { LanguageSelector } from './components/LanguageSelector'
import { ThemeSelector } from './components/ThemeSelector'
import { GameDataProvider, useGameData } from './state/GameDataContext'
import { AuthProvider, useAuth } from './state/AuthContext'
import { LanguageProvider, useTranslation } from './state/LanguageContext'
import { ThemeProvider } from './state/ThemeContext'
import { TutorialProvider } from './state/TutorialContext'
import { Tutorial } from './components/Tutorial'
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

  // Sidebar collapse state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebarCollapsed')
    return stored === 'true'
  })

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

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
        <div className="app-header__brand">
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>
        <div className="app-header__controls">
          <div className="app-header__selectors">
            <ThemeSelector size="small" />
            <LanguageSelector size="small" />
          </div>
          <div className="app-header__user">
            <span className="app-header__greeting">{greetingText}</span>
            <button
              type="button"
              onClick={logout}
              className="app-header__logout"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      {isAdmin && (
        <nav className="app-nav">
          <div className="tabs">
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
          </div>
        </nav>
      )}

      {statusMessage && (
        <div className={`feedback feedback--${statusMessage.type} header-feedback`}>
          {statusMessage.text}
        </div>
      )}

      <main className={`app-main ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {isAdmin && (
          <aside className="environment-sidebar">
            <div className="sidebar-header">
              <h2 className={isSidebarCollapsed ? 'sidebar-title-collapsed' : ''}>
                {t('environment.sidebarTitle')}
              </h2>
              <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span className="sidebar-toggle-desktop">{isSidebarCollapsed ? '→' : '←'}</span>
                <span className="sidebar-toggle-mobile">{isSidebarCollapsed ? '↓' : '↑'}</span>
              </button>
            </div>
            {!isSidebarCollapsed && (
              <>
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
                          cards: environment.worldCards.filter((c) => c.kind === 'standard').length,
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
              </>
            )}
          </aside>
        )}

        {!isAdmin && (
          <aside className="environment-sidebar">
            <div className="sidebar-header">
              <h2 className={isSidebarCollapsed ? 'sidebar-title-collapsed' : ''}>
                {t('environment.sidebarTitle')}
              </h2>
              <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span className="sidebar-toggle-desktop">{isSidebarCollapsed ? '→' : '←'}</span>
                <span className="sidebar-toggle-mobile">{isSidebarCollapsed ? '↓' : '↑'}</span>
              </button>
            </div>
            {!isSidebarCollapsed && (
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
                        cards: environment.worldCards.filter((c) => c.kind === 'standard').length,
                        dungeons: environment.dungeons.length,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
      <TutorialProvider>
        <Tutorial />
        <AppShell />
      </TutorialProvider>
    </GameDataProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppWithAuth />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
