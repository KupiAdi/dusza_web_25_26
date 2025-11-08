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

interface PlayerHubProps {
  environments: GameEnvironment[]
  players: PlayerProfile[]
  onCreatePlayer: (profile: PlayerProfile) => void
  onUpdatePlayer: (
    playerId: string,
    updates: Partial<Omit<PlayerProfile, 'id' | 'environmentId'>>
  ) => void
}

interface NewPlayerForm {
  name: string
  environmentId: string
}

interface PendingReward {
  type: Dungeon['type']
  dungeonName: string
  battle: BattleResult
}

function prepareInitialCollection(environment: GameEnvironment): PlayerProfile['collection'] {
  return environment.starterCollection
    .map((cardId) => {
      const card = environment.worldCards.find((item) => item.id === cardId)
      if (!card) {
        return null
      }
      return {
        cardId: card.id,
        damage: card.damage,
        health: card.health,
      }
    })
    .filter((item): item is { cardId: string; damage: number; health: number } => Boolean(item))
}

export function PlayerHub({ environments, players, onCreatePlayer, onUpdatePlayer }: PlayerHubProps) {
  const [newPlayerForm, setNewPlayerForm] = useState<NewPlayerForm>({
    name: '',
    environmentId: environments[0]?.id ?? '',
  })
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [deckDraft, setDeckDraft] = useState<DeckEntry[]>([])
  const [latestBattle, setLatestBattle] = useState<BattleResult | null>(null)
  const [pendingReward, setPendingReward] = useState<PendingReward | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null)
  const dragSourceRef = useRef<'collection' | 'deck' | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? null
  const playerEnvironment = environments.find((env) => env.id === selectedPlayer?.environmentId) ?? null

  useEffect(() => {
    if (selectedPlayer) {
      setDeckDraft(selectedPlayer.deck)
    } else {
      setDeckDraft([])
    }
  }, [selectedPlayer])

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
    showMessage('Kártya eltávolítva a pakliból.')
    resetDragState()
  }

  function handleDeckDragOver(event: ReactDragEvent<HTMLDivElement>, index: number) {
    if (!dragSourceRef.current) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect =
      dragSourceRef.current === 'collection' ? 'copy' : 'move'
    setDropIndex((prev) => (prev === index ? prev : index))
  }

  function handleDeckDrop(event: ReactDragEvent<HTMLDivElement>, targetIndex: number) {
    if (!dragSourceRef.current) {
      return
    }
    event.preventDefault()
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
    setDropIndex((prev) => (prev === index ? null : prev))
  }

  function saveDeck() {
    if (!selectedPlayer) {
      return
    }
    onUpdatePlayer(selectedPlayer.id, { deck: deckDraft })
    showMessage('Pakli elmentve.')
  }

  function getDeckRequirement(dungeon: Dungeon) {
    return dungeon.cardOrder.length
  }

  function runFight(dungeon: Dungeon) {
    if (!selectedPlayer || !playerEnvironment) {
      showMessage('Válassz ki egy játékost és környezetet a harchoz.', 'error')
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

  function handleCreatePlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newPlayerForm.name.trim()) {
      showMessage('Add meg a játékos nevét.', 'error')
      return
    }
    const environment = environments.find((env) => env.id === newPlayerForm.environmentId)
    if (!environment) {
      showMessage('Válassz egy játékkörnyezetet.', 'error')
      return
    }

    const collection = prepareInitialCollection(environment)
    if (collection.length === 0) {
      showMessage('A kiválasztott környezethez még nincs kezdő gyűjtemény.', 'error')
      return
    }

    const profile: PlayerProfile = {
      id: generateId('player'),
      name: newPlayerForm.name.trim(),
      environmentId: environment.id,
      collection,
      deck: [],
      battleHistory: [],
    }

    onCreatePlayer(profile)
    setNewPlayerForm({ name: '', environmentId: environment.id })
    setSelectedPlayerId(profile.id)
    showMessage('Játékos létrehozva.')
  }

  return (
    <section className="panel">
      <h2>Játékos központ</h2>
      {message && <div className={`feedback feedback--${message.type}`}>{message.text}</div>}

      <div className="panel-block">
        <h3>Új játék indítása</h3>
        <form className="form-grid" onSubmit={handleCreatePlayer}>
          <label>
            Név
            <input
              value={newPlayerForm.name}
              onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, name: event.target.value }))}
              maxLength={32}
            />
          </label>
          <label>
            Környezet
            <select
              value={newPlayerForm.environmentId}
              onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, environmentId: event.target.value }))}
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Játék létrehozása</button>
        </form>
      </div>

      {selectedPlayer && playerEnvironment && (
        <div className="panel-block">
          <h3>Aktív játékos: {selectedPlayer.name}</h3>
          <p>Környezet: {playerEnvironment.name}</p>

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
                <div className="card-stack">
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
                        className={`deck-draggable ${
                          dropIndex === index ? 'is-drop-target' : ''
                        }`}
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
                      dropIndex === deckDraft.length ? 'is-drop-target' : ''
                    }`}
                    onDragOver={(event) => handleDeckDragOver(event, deckDraft.length)}
                    onDrop={(event) => handleDeckDrop(event, deckDraft.length)}
                    onDragLeave={(event) => handleDeckDragLeave(event, deckDraft.length)}
                  >
                    {deckDraft.length === 0
                      ? 'Húzd ide a kártyákat a pakli létrehozásához'
                      : 'Húzd ide a kártyát a pakli végére'}
                  </div>
                </div>
                <button type="button" onClick={saveDeck} className="primary-button">
                  Pakli mentése
                </button>
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
    </section>
  )
}
