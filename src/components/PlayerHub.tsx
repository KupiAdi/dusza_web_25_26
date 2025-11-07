import { useEffect, useMemo, useState } from 'react'
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
  const [message, setMessage] = useState<string | null>(null)

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? null
  const playerEnvironment = environments.find((env) => env.id === selectedPlayer?.environmentId) ?? null

  useEffect(() => {
    if (selectedPlayer) {
      setDeckDraft(selectedPlayer.deck)
    } else {
      setDeckDraft([])
    }
  }, [selectedPlayer])

  function showMessage(text: string) {
    setMessage(text)
    setTimeout(() => setMessage(null), 3000)
  }

  function handleCreatePlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newPlayerForm.name.trim()) {
      showMessage('Add meg a jatekos nevet.')
      return
    }
    const environment = environments.find((env) => env.id === newPlayerForm.environmentId)
    if (!environment) {
      showMessage('Valassz egy jatekkornyezetet.')
      return
    }

    const collection = prepareInitialCollection(environment)
    if (collection.length === 0) {
      showMessage('A kivalasztott kornyezethez meg nincs kezdo gyujtemeny.')
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
    showMessage('Jatekos letrehozva.')
  }

  function addCardToDeck(cardId: string) {
    if (!selectedPlayer) {
      return
    }
    if (deckDraft.some((entry) => entry.cardId === cardId)) {
      showMessage('Ez a kartya mar a pakliban van.')
      return
    }
    setDeckDraft((prev) => [...prev, { cardId }])
  }

  function removeFromDeck(index: number) {
    setDeckDraft((prev) => prev.filter((_, idx) => idx !== index))
  }

  function moveDeckItem(index: number, direction: -1 | 1) {
    setDeckDraft((prev) => {
      const next = [...prev]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev
      }
      const temp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = temp
      return next
    })
  }

  function saveDeck() {
    if (!selectedPlayer) {
      return
    }
    onUpdatePlayer(selectedPlayer.id, { deck: deckDraft })
    showMessage('Pakli elmentve.')
  }

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.name.localeCompare(b.name))
  }, [players])

  function getDeckRequirement(dungeon: Dungeon) {
    return dungeon.cardOrder.length
  }

  function runFight(dungeon: Dungeon) {
    if (!selectedPlayer || !playerEnvironment) {
      showMessage('Valassz ki egy jatekost es kornyezetet a harchoz.')
      return
    }
    if (deckDraft.length !== dungeon.cardOrder.length) {
      showMessage(`A pakli merete ${dungeon.cardOrder.length} kartya kell legyen.`)
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
      showMessage('Gyozelem! Valassz kartya jutalmat.')
    } else {
      showMessage('A harc elveszett. Probald ujra!')
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

  return (
    <section className="panel">
      <h2>Jatekos kozpont</h2>
      {message && <p className="feedback">{message}</p>}

      <div className="panel-block">
        <h3>Uj jatek inditasa</h3>
        <form className="form-grid" onSubmit={handleCreatePlayer}>
          <label>
            Nev
            <input
              value={newPlayerForm.name}
              onChange={(event) => setNewPlayerForm((prev) => ({ ...prev, name: event.target.value }))}
              maxLength={32}
            />
          </label>
          <label>
            Kornyezet
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
          <button type="submit">Jatek letrehozasa</button>
        </form>
      </div>

      <div className="panel-block">
        <h3>Jatekosok</h3>
        <ul className="player-list">
          {sortedPlayers.map((player) => (
            <li key={player.id}>
              <button type="button" onClick={() => setSelectedPlayerId(player.id)}>
                {player.name} ({environments.find((env) => env.id === player.environmentId)?.name ?? 'Ismeretlen kornyezet'})
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedPlayer && playerEnvironment && (
        <div className="panel-block">
          <h3>Aktiv jatekos: {selectedPlayer.name}</h3>
          <p>Kornyezet: {playerEnvironment.name}</p>

          <section className="sub-panel">
            <h4>Gyujtemeny</h4>
            <div className="card-grid">
              {selectedPlayer.collection.map((card) => {
                const worldCard = playerEnvironment.worldCards.find((item) => item.id === card.cardId)
                if (!worldCard) {
                  return null
                }
                return (
                  <CardPreview
                    key={card.cardId}
                    card={worldCard}
                    damage={card.damage}
                    health={card.health}
                    accent="collection"
                  />
                )
              })}
            </div>
          </section>

          <section className="sub-panel">
            <h4>Pakli szerkesztes</h4>
            <div className="deck-builder">
              <div className="deck-column">
                <h5>Elerheto kartyak</h5>
                <div className="card-grid card-grid--compact">
                  {selectedPlayer.collection.map((card) => {
                    const worldCard = playerEnvironment.worldCards.find((item) => item.id === card.cardId)
                    if (!worldCard) {
                      return null
                    }
                    const disabled = deckDraft.some((entry) => entry.cardId === card.cardId)
                    return (
                      <CardPreview
                        key={card.cardId}
                        card={worldCard}
                        damage={card.damage}
                        health={card.health}
                        accent={disabled ? 'deck' : 'collection'}
                        actions={
                          <button
                            type="button"
                            className="ghost-button"
                            disabled={disabled}
                            onClick={() => addCardToDeck(card.cardId)}
                          >
                            Hozzaadas
                          </button>
                        }
                      />
                    )
                  })}
                </div>
              </div>
              <div className="deck-column">
                <h5>Pakli sorrend</h5>
                <div className="card-stack">
                  {deckDraft.map((entry, index) => {
                    const worldCard = playerEnvironment.worldCards.find((item) => item.id === entry.cardId)
                    const playerCardState = selectedPlayer.collection.find((item) => item.cardId === entry.cardId)
                    if (!worldCard || !playerCardState) {
                      return null
                    }
                    return (
                      <CardPreview
                        key={entry.cardId}
                        card={worldCard}
                        damage={playerCardState.damage}
                        health={playerCardState.health}
                        accent="deck"
                        highlight
                        actions={
                          <div className="deck-actions">
                            <button type="button" onClick={() => moveDeckItem(index, -1)} disabled={index === 0}>
                              Fel
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDeckItem(index, 1)}
                              disabled={index === deckDraft.length - 1}
                            >
                              Le
                            </button>
                            <button type="button" onClick={() => removeFromDeck(index)}>
                              Eltavolit
                            </button>
                          </div>
                        }
                        footer={<span className="card-footnote">Pozicio {index + 1}</span>}
                      />
                    )
                  })}
                </div>
                <button type="button" onClick={saveDeck} className="primary-button">Pakli mentese</button>
              </div>
            </div>
          </section>

          <section className="sub-panel">
            <h4>Kivalasztott kazamatak</h4>
            <ul className="dungeon-list">
              {playerEnvironment.dungeons.map((dungeon) => (
                <li key={dungeon.id}>
                  <div>
                    <strong>{dungeon.name}</strong> - {dungeon.type} ({getDeckRequirement(dungeon)} kartya)
                    <div className="card-sequence">
                      {dungeon.cardOrder.map((cardId) => (
                        <span key={cardId}>
                          {playerEnvironment.worldCards.find((card) => card.id === cardId)?.name ?? cardId}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => runFight(dungeon)}>Harc inditasa</button>
                </li>
              ))}
            </ul>
          </section>

          {pendingReward && (
            <section className="sub-panel">
              <h4>Jutalom valasztasa ({pendingReward.dungeonName} - {getRewardDescriptor(pendingReward.type)})</h4>
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
            <h4>Csata tortenelem</h4>
            <ul className="history-list">
              {selectedPlayer.battleHistory.map((battle) => (
                <li key={battle.timestamp}>
                  {new Date(battle.timestamp).toLocaleString()} - {playerEnvironment.dungeons.find((d) => d.id === battle.dungeonId)?.name ?? 'Ismeretlen kazamata'} - {battle.playerVictory ? 'Gyozelem' : 'Vereseg'}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </section>
  )
}
