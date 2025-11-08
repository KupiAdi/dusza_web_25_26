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
import { applyReward, getRewardDescriptor } from '../utils/rewards'
import { BattleReport } from './BattleReport'
import { CardPreview } from './CardPreview'
import { ConfirmDialog } from './ConfirmDialog'

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

interface PendingReward {
  type: Dungeon['type']
  dungeonName: string
  battle: BattleResult
}

function prepareInitialCollection(environment: GameEnvironment): PlayerProfile['collection'] {
  // All standard cards are automatically included in the starting collection
  return environment.worldCards
    .filter((card) => card.kind === 'standard')
    .map((card) => ({
      cardId: card.id,
      damage: card.damage,
      health: card.health,
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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [newGameName, setNewGameName] = useState('')
  const [deckDraft, setDeckDraft] = useState<DeckEntry[]>([])
  const [latestBattle, setLatestBattle] = useState<BattleResult | null>(null)
  const [pendingReward, setPendingReward] = useState<PendingReward | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null)
  const [playerPendingRemoval, setPlayerPendingRemoval] = useState<{ id: string; name: string } | null>(null)
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false)
  const dragSourceRef = useRef<'collection' | 'deck' | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const isLoadingDeckRef = useRef(false)

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? null
  const playerEnvironment = environments.find((env) => env.id === selectedPlayer?.environmentId) ?? null

  // Clear selected player if switching to different environment
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
        showMessage('Ez a kártya már a pakliban van.', 'error')
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

  function getDeckRequirement(dungeon: Dungeon) {
    return dungeon.cardOrder.length
  }

  function runFight(dungeon: Dungeon) {
    if (!selectedPlayer || !playerEnvironment) {
      showMessage('Válassz ki egy játékost és játékot a harchoz.', 'error')
      return
    }
    if (deckDraft.length !== dungeon.cardOrder.length) {
      showMessage(`A pakli mérete ${dungeon.cardOrder.length} kártya kell legyen.`, 'error')
      return
    }

    const battle = runBattle({
      environment: playerEnvironment,
      deck: deckDraft,
      dungeon,
      playerCards: selectedPlayer.collection,
    })

    setLatestBattle(battle)
    onUpdatePlayer(selectedPlayer.id, {
      battleHistory: [...selectedPlayer.battleHistory, battle],
    })

    if (battle.playerVictory) {
      setPendingReward({ type: dungeon.type, dungeonName: dungeon.name, battle })
      showMessage('Győzelem! Válassz kártyajutalmat.')
    } else {
      showMessage('A harc elveszett. Próbáld újra!', 'error')
    }
  }

  function applyRewardSelection(cardId: string) {
    if (!selectedPlayer || !pendingReward) {
      return
    }
    const updatedCollection = applyReward(selectedPlayer.collection, cardId, pendingReward.type)
    onUpdatePlayer(selectedPlayer.id, { collection: updatedCollection })
    setPendingReward(null)
    showMessage('A jutalom alkalmazva lett.')
  }

  async function handleCreatePlayer() {
    try {
      if (!trimmedNewGameName) {
        showMessage('Add meg a játékmenet nevét.', 'error')
        return
      }
      if (!defaultPlayerName) {
        showMessage('Nincs bejelentkezett felhasználó.', 'error')
        return
      }
      if (isDuplicateGameName) {
        showMessage('Ez a játékmenet név már létezik ebben a játékban.', 'error')
        return
      }
      const environment = environments.find((env) => env.id === defaultEnvironmentId)
      if (!environment) {
        showMessage('Válassz ki egy játékot a bal oldali menüből.', 'error')
        return
      }

      const collection = prepareInitialCollection(environment)
      if (collection.length === 0) {
        showMessage('A kiválasztott játékhoz még nincsenek kártyák.', 'error')
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
      showMessage('Új játékmenet indítva.')
    } catch (error: any) {
      console.error('Hiba a játékmenet létrehozása során:', error)
      showMessage(error.message || 'Hiba történt a játékmenet létrehozása során', 'error')
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
      showMessage('Játékmenet törölve.')
    } catch (error: any) {
      showMessage(error?.message || 'Hiba történt a játékmenet törlése során', 'error')
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

  const isDeckSurfaceTarget = dropIndex === deckDraft.length

  return (
    <section className="panel">
      <h2>Játékos központ</h2>
      {message && <div className={`feedback feedback--${message.type}`}>{message.text}</div>}

      <div className="panel-block">
        <h3>Játékmenetek</h3>
        {playersInSelectedEnvironment.length > 0 && (
          <div>
            <h4>Meglévő játékmenetek</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {playersInSelectedEnvironment.map((player) => {
                const env = environments.find((e) => e.id === player.environmentId)
                return (
                  <li key={player.id} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      style={{
                        padding: '8px 12px',
                        background: selectedPlayerId === player.id ? '#4a5568' : '#2d3748',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        flex: 1,
                        textAlign: 'left'
                      }}
                    >
                      <strong>{env?.name || 'Ismeretlen játék'}</strong> - {player.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => requestPlayerRemoval(player.id, player.name)}
                      disabled={isRemovingPlayer}
                      style={{
                        padding: '8px 12px',
                        background: '#dc2626',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: isRemovingPlayer ? 'not-allowed' : 'pointer',
                        opacity: isRemovingPlayer ? 0.7 : 1,
                        minWidth: '60px'
                      }}
                      title="Játékmenet törlése"
                    >
                      Törlés
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        
        <div className="start-session">
          <h4>Új játékmenet indítása</h4>
          <p className="start-session__meta">
            Játék:{' '}
            <strong>
              {environments.find((environment) => environment.id === defaultEnvironmentId)?.name ||
                'Válassz játékot'}
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
              Játékmenet neve
              <input
                id="new-session-name"
                type="text"
                value={newGameName}
                onChange={(event) => setNewGameName(event.target.value)}
                placeholder="Add meg a játékmenet nevét..."
                maxLength={32}
                aria-invalid={isDuplicateGameName ? 'true' : 'false'}
                aria-describedby="new-session-name-hint"
              />
              <span
                id="new-session-name-hint"
                className={`field-hint ${isDuplicateGameName ? 'field-hint--error' : ''}`}
              >
                {isDuplicateGameName
                  ? 'Ez a név már foglalt ebben a játékban. Válassz másikat.'
                  : 'Add meg a játékmenet nevét, legfeljebb 32 karakterben.'}
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
                Új játékmenet indítása
              </button>
            </div>
          </form>
        </div>
      </div>

      {selectedPlayer && playerEnvironment && (
        <div className="panel-block">
          <h3>Aktív játékmenet: {selectedPlayer.name}</h3>
          <p>Játék: {playerEnvironment.name}</p>

          <section className="sub-panel">
            <h4>Pakli szerkesztés</h4>
            <div className="deck-builder">
              <div className="deck-column">
                <h5>Elérhető kártyák</h5>
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
                        className={`draggable-card ${disabled ? 'is-disabled' : ''}`}
                        draggable={!disabled}
                        onDragStart={(event) =>
                          handleCollectionDragStart(event, card.cardId, disabled)
                        }
                        onDragEnd={handleDragEnd}
                      >
                        <CardPreview
                          card={worldCard}
                          damage={card.damage}
                          health={card.health}
                          accent={disabled ? 'deck' : 'collection'}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="deck-column">
                <h5>Pakli sorrend</h5>
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
                        className={`deck-draggable ${dropIndex === index ? 'is-drop-target' : ''}`}
                        draggable
                        onDragStart={(event) =>
                          handleDeckDragStart(event, index, entry.cardId)
                        }
                        onDragEnd={handleDragEnd}
                        onDragOver={(event) => handleDeckDragOver(event, index)}
                        onDrop={(event) => handleDeckDrop(event, index)}
                        onDragLeave={(event) => handleDeckDragLeave(event, index)}
                      >
                        <CardPreview
                          card={worldCard}
                          damage={playerCardState.damage}
                          health={playerCardState.health}
                          accent="deck"
                          highlight
                          footer={<span className="card-footnote">Pozíció {index + 1}</span>}
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
                    {deckDraft.length === 0
                      ? 'Húzd ide a kártyákat a pakli létrehozásához'
                      : 'Húzd ide a kártyát a pakli végére'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="sub-panel">
            <h4>Kiválasztott kazamaták</h4>
            <ul className="dungeon-list">
              {playerEnvironment.dungeons.map((dungeon) => (
                <li key={dungeon.id}>
                  <div>
                    <strong>{dungeon.name}</strong> - {dungeon.type} ({getDeckRequirement(dungeon)} kártya)
                    <div className="card-sequence">
                      {dungeon.cardOrder.map((cardId) => (
                        <span key={cardId}>
                          {playerEnvironment.worldCards.find((card) => card.id === cardId)?.name ?? cardId}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => runFight(dungeon)}>Harc indítása</button>
                </li>
              ))}
            </ul>
          </section>

          {pendingReward && (
            <section className="sub-panel">
            <h4>Jutalom választása ({pendingReward.dungeonName} - {getRewardDescriptor(pendingReward.type)})</h4>
              <div className="card-grid card-grid--reward">
                {selectedPlayer.collection.map((card) => {
                  const worldCard = playerEnvironment.worldCards.find((item) => item.id === card.cardId)
                  if (!worldCard) {
                    return null
                  }
                  return (
                    <button
                      key={card.cardId}
                      type="button"
                      className="card-preview-button"
                      onClick={() => applyRewardSelection(card.cardId)}
                    >
                      <CardPreview
                        card={worldCard}
                        damage={card.damage}
                        health={card.health}
                        accent="reward"
                        highlight
                      />
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {latestBattle && (
            <BattleReport result={latestBattle} environment={playerEnvironment} />
          )}

          <section className="sub-panel">
            <h4>Csatatörténet</h4>
            <ul className="history-list">
              {selectedPlayer.battleHistory.map((battle) => (
                <li key={battle.timestamp}>
                  {new Date(battle.timestamp).toLocaleString()} - {playerEnvironment.dungeons.find((d) => d.id === battle.dungeonId)?.name ?? 'Ismeretlen kazamata'} - {battle.playerVictory ? 'Győzelem' : 'Vereség'}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(playerPendingRemoval)}
        title="Játékmenet törlése"
        description={
          playerPendingRemoval
            ? `Biztosan törlöd a "${playerPendingRemoval.name}" játékmenetet? Ez a művelet nem visszavonható.`
            : ''
        }
        confirmLabel="Játékmenet törlése"
        cancelLabel="Mégse"
        onCancel={cancelPlayerRemoval}
        onConfirm={confirmPlayerRemoval}
        isConfirming={isRemovingPlayer}
      />
    </section>
  )
}
