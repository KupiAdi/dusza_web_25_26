import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from 'react'
import type {
  BattleResult,
  DeckEntry,
  Dungeon,
  GameEnvironment,
  PlayerProfile,
} from '../types'
import { runBattle } from '../utils/battle'
import { generateId } from '../utils/id'
import { applyReward } from '../utils/rewards'
import { BattleReport } from './BattleReport'
import { BattleScene } from './BattleScene'
import { CardPreview } from './CardPreview'
import { ConfirmDialog } from './ConfirmDialog'
import { useTranslation } from '../state/LanguageContext'

interface PlayerHubProps {
  environments: GameEnvironment[]
  players: PlayerProfile[]
  onCreatePlayer: (profile: PlayerProfile) => void
  onUpdatePlayer: (
    playerId: string,
    updates: Partial<Omit<PlayerProfile, 'id' | 'environmentId'>>
  ) => void
  onRemovePlayer: (playerId: string) => void
  defaultPlayerName: string
  defaultEnvironmentId: string
}

function prepareInitialCollection(environment: GameEnvironment): PlayerProfile['collection'] {
  // All standard cards are automatically included in the starting collection
  return environment.worldCards
    .filter((card) => card.kind === 'standard')
    .map((card) => ({
      cardId: card.id,
      damageBonus: 0,
      healthBonus: 0,
    }))
}

export function PlayerHub({
  environments,
  players,
  onCreatePlayer,
  onUpdatePlayer,
  onRemovePlayer,
  defaultPlayerName,
  defaultEnvironmentId,
}: PlayerHubProps) {
  const { t } = useTranslation()
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [newGameName, setNewGameName] = useState('')
  const [deckDraft, setDeckDraft] = useState<DeckEntry[]>([])
  const [latestBattle, setLatestBattle] = useState<BattleResult | null>(null)
  const [showBattleScene, setShowBattleScene] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null)
  const [playerPendingRemoval, setPlayerPendingRemoval] = useState<{ id: string; name: string } | null>(null)
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false)
  const dragSourceRef = useRef<'collection' | 'deck' | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const isLoadingDeckRef = useRef(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const [isSessionsCollapsed, setIsSessionsCollapsed] = useState(() => {
    const stored = localStorage.getItem('sessionsCollapsed')
    return stored === 'true'
  })

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? null
  const playerEnvironment = environments.find((env) => env.id === selectedPlayer?.environmentId) ?? null

  useEffect(() => {
    localStorage.setItem('sessionsCollapsed', String(isSessionsCollapsed))
  }, [isSessionsCollapsed])

  useEffect(() => {
    const checkMobileOrTouch = () => {
      const hasTouchScreen = 
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      const isNarrowScreen = window.innerWidth <= 768
      setIsMobileView(hasTouchScreen || isNarrowScreen)
    }
    checkMobileOrTouch()
    window.addEventListener('resize', checkMobileOrTouch)
    return () => window.removeEventListener('resize', checkMobileOrTouch)
  }, [])

  useEffect(() => {
    if (selectedPlayer && selectedPlayer.environmentId !== defaultEnvironmentId) {
      setSelectedPlayerId(null)
    }
  }, [defaultEnvironmentId, selectedPlayer])

  useEffect(() => {
    if (selectedPlayer) {
      isLoadingDeckRef.current = true
      setDeckDraft(selectedPlayer.deck)
      setTimeout(() => {
        isLoadingDeckRef.current = false
      }, 100)
    } else {
      setDeckDraft([])
    }
  }, [selectedPlayer])

  useEffect(() => {
    if (isLoadingDeckRef.current || !selectedPlayer) {
      return
    }

    const isDifferent = JSON.stringify(deckDraft) !== JSON.stringify(selectedPlayer.deck)
    if (isDifferent) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = window.setTimeout(() => {
        onUpdatePlayer(selectedPlayer.id, { deck: deckDraft })
      }, 500)
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [deckDraft, selectedPlayer, onUpdatePlayer])

  function showMessage(text: string, type: 'info' | 'error' = 'info') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  function resetDragState() {
    dragSourceRef.current = null
    setDropIndex(null)
  }

  function handleDragEnd() {
    resetDragState()
  }

  function handleCollectionDragStart(
    event: ReactDragEvent<HTMLDivElement>,
    cardId: string,
    disabled: boolean
  ) {
    if (disabled) {
      event.preventDefault()
      return
    }
    dragSourceRef.current = 'collection'
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', cardId)
    event.dataTransfer.setData('text/damareen-card-id', cardId)
    event.dataTransfer.setData('text/damareen-source', 'collection')
  }

  function handleDeckDragStart(
    event: ReactDragEvent<HTMLDivElement>,
    index: number,
    cardId: string
  ) {
    dragSourceRef.current = 'deck'
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', cardId)
    event.dataTransfer.setData('text/damareen-card-id', cardId)
    event.dataTransfer.setData('text/damareen-source', 'deck')
    event.dataTransfer.setData('text/damareen-deck-index', String(index))
  }

  function handleCollectionDragOver(event: ReactDragEvent<HTMLDivElement>) {
    if (dragSourceRef.current !== 'deck') {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleCollectionDrop(event: ReactDragEvent<HTMLDivElement>) {
    if (dragSourceRef.current !== 'deck') {
      return
    }
    event.preventDefault()
    const fromIndex = Number.parseInt(
      event.dataTransfer.getData('text/damareen-deck-index'),
      10
    )
    if (Number.isNaN(fromIndex)) {
      resetDragState()
      return
    }
    setDeckDraft((prev) => prev.filter((_, idx) => idx !== fromIndex))
    resetDragState()
  }

  function handleDeckDragOver(event: ReactDragEvent<HTMLDivElement>, index: number) {
    if (!dragSourceRef.current) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect =
      dragSourceRef.current === 'collection' ? 'copy' : 'move'
    setDropIndex((prev) => (prev === index ? prev : index))
  }

  function handleDeckDrop(event: ReactDragEvent<HTMLDivElement>, targetIndex: number) {
    if (!dragSourceRef.current) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const cardId = event.dataTransfer.getData('text/damareen-card-id')
    const source = event.dataTransfer.getData('text/damareen-source') as
      | 'collection'
      | 'deck'
      | ''
    if (!cardId || !source) {
      resetDragState()
      return
    }

    if (source === 'collection') {
      if (deckDraft.some((entry) => entry.cardId === cardId)) {
        showMessage(t('player.messages.cardAlreadyInDeck'), 'error')
        resetDragState()
        return
      }
      setDeckDraft((prev) => {
        const next = [...prev]
        next.splice(targetIndex, 0, { cardId })
        return next
      })
      resetDragState()
      return
    }

    if (source === 'deck') {
      const fromIndex = Number.parseInt(
        event.dataTransfer.getData('text/damareen-deck-index'),
        10
      )
      if (Number.isNaN(fromIndex)) {
        resetDragState()
        return
      }
      if (fromIndex === targetIndex || fromIndex + 1 === targetIndex) {
        resetDragState()
        return
      }
      setDeckDraft((prev) => {
        if (fromIndex < 0 || fromIndex >= prev.length) {
          return prev
        }
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        let insertIndex = targetIndex
        if (fromIndex < targetIndex) {
          insertIndex -= 1
        }
        next.splice(insertIndex, 0, moved)
        return next
      })
      resetDragState()
      return
    }

    resetDragState()
  }

  function handleDeckDragLeave(event: ReactDragEvent<HTMLDivElement>, index: number) {
    const related = event.relatedTarget as Node | null
    if (related && event.currentTarget.contains(related)) {
      return
    }
    event.stopPropagation()
    setDropIndex((prev) => (prev === index ? null : prev))
  }

  function handleDeckSurfaceDragOver(event: ReactDragEvent<HTMLDivElement>) {
    if (!dragSourceRef.current) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect =
      dragSourceRef.current === 'collection' ? 'copy' : 'move'
    setDropIndex((prev) => (prev === deckDraft.length ? prev : deckDraft.length))
  }

  function handleDeckSurfaceDrop(event: ReactDragEvent<HTMLDivElement>) {
    handleDeckDrop(event, deckDraft.length)
  }

  function handleDeckSurfaceDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    const related = event.relatedTarget as Node | null
    if (related && event.currentTarget.contains(related)) {
      return
    }
    event.stopPropagation()
    setDropIndex((prev) => (prev === deckDraft.length ? null : prev))
  }

  // Mobile-friendly click handlers
  function handleCollectionCardClick(cardId: string) {
    if (!isMobileView) return
    
    if (deckDraft.some((entry) => entry.cardId === cardId)) {
      showMessage(t('player.messages.cardAlreadyInDeck'), 'error')
      return
    }
    
    setDeckDraft((prev) => [...prev, { cardId }])
    showMessage(t('player.messages.cardAddedToDeck') || 'Kártya hozzáadva a paklihoz', 'info')
  }

  function handleDeckCardClick(index: number) {
    if (!isMobileView) return
    
    setDeckDraft((prev) => prev.filter((_, idx) => idx !== index))
    showMessage(t('player.messages.cardRemovedFromDeck') || 'Kártya eltávolítva a pakliból', 'info')
  }

  function getDeckRequirement(dungeon: Dungeon) {
    return dungeon.cardOrder.length
  }

  function runFight(dungeon: Dungeon) {
    if (!selectedPlayer || !playerEnvironment) {
      showMessage(t('player.messages.selectPlayerAndEnvironment'), 'error')
      return
    }
    if (deckDraft.length !== dungeon.cardOrder.length) {
      showMessage(t('player.messages.deckSize', { size: dungeon.cardOrder.length }), 'error')
      return
    }

    const battle = runBattle({
      environment: playerEnvironment,
      deck: deckDraft,
      dungeon,
      playerCards: selectedPlayer.collection,
    })

    setLatestBattle(battle)
    setShowBattleScene(true)
    
    // Extract only the needed fields for history (without rounds)
    const { rounds, ...historyEntry } = battle
    onUpdatePlayer(selectedPlayer.id, {
      battleHistory: [...selectedPlayer.battleHistory, historyEntry],
    })
  }

  function handleBattleSceneComplete() {
    setShowBattleScene(false)
    
    if (!latestBattle) {
      return
    }

    if (latestBattle.playerVictory) {
      showMessage(t('player.messages.winWithReward'))
    } else {
      showMessage(t('player.messages.lossTryAgain'), 'error')
    }
  }

  function handleRewardSelection(cardId: string) {
    if (!selectedPlayer || !latestBattle) {
      return
    }
    
    const dungeon = playerEnvironment?.dungeons.find((d) => d.id === latestBattle.dungeonId)
    if (!dungeon) {
      return
    }
    
    const updatedCollection = applyReward(selectedPlayer.collection, cardId, dungeon.type)
    onUpdatePlayer(selectedPlayer.id, { collection: updatedCollection })
  }

  async function handleCreatePlayer() {
    try {
      if (!trimmedNewGameName) {
        showMessage(t('player.messages.sessionNameRequired'), 'error')
        return
      }
      if (!defaultPlayerName) {
        showMessage(t('player.messages.noUser'), 'error')
        return
      }
      if (isDuplicateGameName) {
        showMessage(t('player.messages.sessionNameExists'), 'error')
        return
      }
      const environment = environments.find((env) => env.id === defaultEnvironmentId)
      if (!environment) {
        showMessage(t('player.messages.selectEnvironment'), 'error')
        return
      }

      const collection = prepareInitialCollection(environment)
      if (collection.length === 0) {
        showMessage(t('player.messages.environmentHasNoCards'), 'error')
        return
      }

      const profile: PlayerProfile = {
        id: generateId('player'),
        name: trimmedNewGameName,
        environmentId: environment.id,
        collection,
        deck: [],
        battleHistory: [],
      }

      await onCreatePlayer(profile)
      setNewGameName('')
      setSelectedPlayerId(profile.id)
      showMessage(t('player.messages.sessionCreated'))
    } catch (error: any) {
      console.error('Error creating play session:', error)
      showMessage(error.message || t('player.messages.sessionCreateFailed'), 'error')
    }
  }

  function requestPlayerRemoval(playerId: string, playerName: string) {
    setPlayerPendingRemoval({ id: playerId, name: playerName })
  }

  function cancelPlayerRemoval() {
    if (isRemovingPlayer) {
      return
    }
    setPlayerPendingRemoval(null)
  }

  async function confirmPlayerRemoval() {
    if (!playerPendingRemoval) {
      return
    }
    const playerToRemove = playerPendingRemoval
    setIsRemovingPlayer(true)
    try {
      if (selectedPlayerId === playerToRemove.id) {
        setSelectedPlayerId(null)
      }
      await onRemovePlayer(playerToRemove.id)
      showMessage(t('player.messages.sessionDeleted'))
    } catch (error: any) {
      showMessage(error?.message || t('player.messages.sessionDeleteFailed'), 'error')
    } finally {
      setIsRemovingPlayer(false)
      setPlayerPendingRemoval(null)
    }
  }

  // Filter players by selected environment
  const playersInSelectedEnvironment = players.filter((p) => p.environmentId === defaultEnvironmentId)
  const trimmedNewGameName = newGameName.trim()
  const isDuplicateGameName =
    trimmedNewGameName.length > 0 &&
    playersInSelectedEnvironment.some(
      (player) => player.name.toLowerCase() === trimmedNewGameName.toLowerCase()
    )

  // Auto-select first player if none is selected
  useEffect(() => {
    if (!selectedPlayerId && playersInSelectedEnvironment.length > 0) {
      setSelectedPlayerId(playersInSelectedEnvironment[0].id)
    }
  }, [selectedPlayerId, playersInSelectedEnvironment])

  const isDeckSurfaceTarget = dropIndex === deckDraft.length

  return (
    <>
      {showBattleScene && latestBattle && playerEnvironment && selectedPlayer && (
        <BattleScene 
          result={latestBattle} 
          environment={playerEnvironment}
          playerCards={selectedPlayer.collection}
          onComplete={handleBattleSceneComplete}
          onRewardSelected={handleRewardSelection}
        />
      )}
      
      <section className="panel">
        <h2>{t('player.title')}</h2>
        {message && <div className={`feedback feedback--${message.type}`}>{message.text}</div>}

      <div className="panel-block">
        <div className="collapsible-section-header">
          <h3>{t('player.sessions.title')}</h3>
          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setIsSessionsCollapsed(!isSessionsCollapsed)}
            aria-label={isSessionsCollapsed ? 'Expand sessions' : 'Collapse sessions'}
            title={isSessionsCollapsed ? 'Expand sessions' : 'Collapse sessions'}
          >
            {isSessionsCollapsed ? '▼' : '▲'}
          </button>
        </div>
        
        {!isSessionsCollapsed && (
          <>
            {playersInSelectedEnvironment.length > 0 && (
              <div>
                <h4>{t('player.sessions.listTitle')}</h4>
                <ul className="session-list">
                  {playersInSelectedEnvironment.map((player) => {
                    const env = environments.find((e) => e.id === player.environmentId)
                    const isSelected = selectedPlayerId === player.id
                    return (
                      <li key={player.id} className="session-list-item">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerId(player.id)}
                          className={`session-button ${isSelected ? 'session-button--selected' : ''}`}
                        >
                          <strong>{env?.name || t('common.unknownGame')}</strong> - {player.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => requestPlayerRemoval(player.id, player.name)}
                          disabled={isRemovingPlayer}
                          className="session-delete-button"
                          title={t('player.sessions.deleteTitle')}
                        >
                          {t('common.delete')}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="start-session">
              <h4>{t('player.sessions.startTitle')}</h4>
              <p className="start-session__meta">
                {t('player.sessions.gameLabel')}{' '}
                <strong>
                  {environments.find((environment) => environment.id === defaultEnvironmentId)?.name ||
                    t('player.sessions.gamePlaceholder')}
                </strong>
              </p>
              <form
                className="form-grid start-session__form"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleCreatePlayer()
                }}
              >
                <label htmlFor="new-session-name">
                  {t('player.sessions.nameLabel')}
                  <input
                    id="new-session-name"
                    type="text"
                    value={newGameName}
                    onChange={(event) => setNewGameName(event.target.value)}
                    placeholder={t('player.sessions.namePlaceholder')}
                    maxLength={32}
                    aria-invalid={isDuplicateGameName ? 'true' : 'false'}
                    aria-describedby="new-session-name-hint"
                  />
                  <span
                    id="new-session-name-hint"
                    className={`field-hint ${isDuplicateGameName ? 'field-hint--error' : ''}`}
                  >
                    {isDuplicateGameName
                      ? t('player.sessions.nameHintDuplicate')
                      : t('player.sessions.nameHint')}
                  </span>
                </label>
                <div className="start-session__actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      !defaultPlayerName ||
                      !defaultEnvironmentId ||
                      !trimmedNewGameName ||
                      isDuplicateGameName
                    }
                  >
                    {t('player.sessions.startButton')}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {selectedPlayer && playerEnvironment && (
        <div className="panel-block">
          <h3>{t('player.activeSession.heading', { name: selectedPlayer.name })}</h3>
          <p>{t('player.activeSession.game', { name: playerEnvironment.name })}</p>

          <section className="sub-panel">
            <h4>{t('player.deck.title')}</h4>
            <div className="deck-builder">
              <div className="deck-column">
                <h5>{t('player.deck.availableCards')}</h5>
                <div
                  className="card-grid card-grid--compact"
                  onDragOver={handleCollectionDragOver}
                  onDrop={handleCollectionDrop}
                >
                  {selectedPlayer.collection.map((card) => {
                    const worldCard = playerEnvironment.worldCards.find(
                      (item) => item.id === card.cardId
                    )
                    if (!worldCard) {
                      return null
                    }
                    const disabled = deckDraft.some((entry) => entry.cardId === card.cardId)
                    return (
                      <div
                        key={card.cardId}
                        className={`draggable-card ${disabled ? 'is-disabled' : ''} ${isMobileView ? 'mobile-clickable' : ''}`}
                        draggable={!disabled && !isMobileView}
                        onDragStart={(event) =>
                          handleCollectionDragStart(event, card.cardId, disabled)
                        }
                        onDragEnd={handleDragEnd}
                        onClick={() => !disabled && handleCollectionCardClick(card.cardId)}
                        style={isMobileView ? { cursor: disabled ? 'not-allowed' : 'pointer' } : undefined}
                      >
                        <CardPreview
                          card={worldCard}
                          damage={worldCard.damage + card.damageBonus}
                          health={worldCard.health + card.healthBonus}
                          accent={disabled ? 'deck' : 'collection'}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="deck-column">
                <h5>{t('player.deck.deckOrder')}</h5>
                <div
                  className={`card-stack ${dropIndex !== null ? 'is-dragging' : ''} ${
                    isDeckSurfaceTarget ? 'is-drop-target' : ''
                  }`}
                  onDragOver={handleDeckSurfaceDragOver}
                  onDrop={handleDeckSurfaceDrop}
                  onDragLeave={handleDeckSurfaceDragLeave}
                >
                  {deckDraft.map((entry, index) => {
                    const worldCard = playerEnvironment.worldCards.find(
                      (item) => item.id === entry.cardId
                    )
                    const playerCardState = selectedPlayer.collection.find(
                      (item) => item.cardId === entry.cardId
                    )
                    if (!worldCard || !playerCardState) {
                      return null
                    }
                    return (
                      <div
                        key={entry.cardId}
                        className={`deck-draggable ${dropIndex === index ? 'is-drop-target' : ''} ${isMobileView ? 'mobile-clickable' : ''}`}
                        draggable={!isMobileView}
                        onDragStart={(event) =>
                          handleDeckDragStart(event, index, entry.cardId)
                        }
                        onDragEnd={handleDragEnd}
                        onDragOver={(event) => handleDeckDragOver(event, index)}
                        onDrop={(event) => handleDeckDrop(event, index)}
                        onDragLeave={(event) => handleDeckDragLeave(event, index)}
                        onClick={() => handleDeckCardClick(index)}
                        style={isMobileView ? { cursor: 'pointer' } : undefined}
                      >
                        <CardPreview
                          card={worldCard}
                          damage={worldCard.damage + playerCardState.damageBonus}
                          health={worldCard.health + playerCardState.healthBonus}
                          accent="deck"
                          highlight
                          footer={
                            <span className="card-footnote">
                              {isMobileView 
                                ? `${t('player.deck.position', { index: index + 1 })} - ${t('player.deck.tapToRemove') || 'Kattints az eltávolításhoz'}`
                                : t('player.deck.position', { index: index + 1 })
                              }
                            </span>
                          }
                        />
                      </div>
                    )
                  })}
                  <div
                    className={`deck-drop-zone ${
                      deckDraft.length === 0 || isDeckSurfaceTarget ? 'is-visible' : ''
                    } ${isDeckSurfaceTarget ? 'is-drop-target' : ''}`}
                    onDragOver={handleDeckSurfaceDragOver}
                    onDrop={handleDeckSurfaceDrop}
                    onDragLeave={handleDeckSurfaceDragLeave}
                  >
                    {isMobileView 
                      ? (deckDraft.length === 0 
                          ? t('player.deck.tapHintEmpty') || 'Kattints egy kártyára a hozzáadáshoz'
                          : t('player.deck.tapHint') || 'Kattints egy kártyára az eltávolításhoz')
                      : (deckDraft.length === 0
                          ? t('player.deck.dropHintEmpty')
                          : t('player.deck.dropHint'))
                    }
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="sub-panel">
            <h4>{t('player.dungeons.title')}</h4>
            <ul className="dungeon-list">
              {playerEnvironment.dungeons.map((dungeon) => (
                <li key={dungeon.id}>
                  <div>
                    <strong>{dungeon.name}</strong> - {t(`environment.dungeon.type.${dungeon.type}`)}{' '}
                    {t('player.dungeons.cardRequirement', { count: getDeckRequirement(dungeon) })}
                    <div className="card-sequence">
                      {dungeon.cardOrder.map((cardId) => (
                        <span key={cardId}>
                          {playerEnvironment.worldCards.find((card) => card.id === cardId)?.name ?? cardId}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => runFight(dungeon)}>
                    {t('player.dungeons.startBattle')}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {latestBattle && (
            <BattleReport result={latestBattle} environment={playerEnvironment} />
          )}

          <section className="sub-panel">
            <h4>{t('player.history.title')}</h4>
            <ul className="history-list">
              {selectedPlayer.battleHistory.map((battle) => (
                <li key={battle.timestamp}>
                  {new Date(battle.timestamp).toLocaleString()} -{' '}
                  {playerEnvironment.dungeons.find((d) => d.id === battle.dungeonId)?.name ??
                    t('common.unknownDungeon')}{' '}
                  - {battle.playerVictory ? t('player.history.victory') : t('player.history.defeat')}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(playerPendingRemoval)}
        title={t('player.confirm.deleteTitle')}
        description={
          playerPendingRemoval
            ? t('player.confirm.deleteDescription', { name: playerPendingRemoval.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={cancelPlayerRemoval}
        onConfirm={confirmPlayerRemoval}
        isConfirming={isRemovingPlayer}
      />
      </section>
    </>
  )
}
