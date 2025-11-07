import { useMemo, useState } from 'react'
import type { DungeonType, GameEnvironment, WorldCard } from '../types'
import { CardPreview } from './CardPreview'
import { generateId } from '../utils/id'

const DUNGEON_REQUIREMENTS: Record<
  DungeonType,
  { total: number; standard: number; leader: number }
> = {
  encounter: { total: 1, standard: 1, leader: 0 },
  minor: { total: 4, standard: 3, leader: 1 },
  major: { total: 6, standard: 5, leader: 1 },
}

const CARD_TYPES = [
  { value: 'earth', label: 'Fold' },
  { value: 'water', label: 'Viz' },
  { value: 'air', label: 'Levego' },
  { value: 'fire', label: 'Tuz' },
] as const

interface StandardCardForm {
  name: string
  damage: string
  health: string
  element: WorldCard['element']
}

interface LeaderCardForm {
  baseCardId: string
  name: string
  mode: 'double-damage' | 'double-health'
}

interface DungeonFormState {
  name: string
  type: DungeonType
  cardOrder: string[]
}

interface EnvironmentEditorProps {
  environment: GameEnvironment
  onSave: (environment: GameEnvironment) => void
}

export function EnvironmentEditor({ environment, onSave }: EnvironmentEditorProps) {
  const [standardForm, setStandardForm] = useState<StandardCardForm>({
    name: '',
    damage: '2',
    health: '2',
    element: 'earth',
  })
  const [leaderForm, setLeaderForm] = useState<LeaderCardForm>({
    baseCardId: '',
    name: '',
    mode: 'double-damage',
  })
  const [dungeonForm, setDungeonForm] = useState<DungeonFormState>(() => {
    const req = DUNGEON_REQUIREMENTS.encounter
    return { name: '', type: 'encounter', cardOrder: Array(req.total).fill('') }
  })
  const [feedback, setFeedback] = useState<{ text: string; type: 'info' | 'error' } | null>(null)

  const standardCards = useMemo(
    () => environment.worldCards.filter((card) => card.kind === 'standard'),
    [environment.worldCards]
  )
  const leaderCards = useMemo(
    () => environment.worldCards.filter((card) => card.kind === 'leader'),
    [environment.worldCards]
  )

  function withFeedback(message: string, type: 'info' | 'error' = 'info') {
    setFeedback({ text: message, type })
    setTimeout(() => setFeedback(null), 3000)
  }

  async function generateCardImage(cardName: string): Promise<string> {
    try {
      const { api } = await import('../services/api')
      const data = await api.generateImage(cardName)
      return data.path // pl: "/images/Orc%20warrior.jpg"
    } catch (error) {
      console.error('Hiba a kép generálásakor:', error)
      return '' // Ha nem sikerült, üres string
    }
  }

  function handleStandardSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!standardForm.name.trim()) {
      withFeedback('Adj meg egy nevet a kartyahoz.', 'error')
      return
    }
    if (standardForm.name.length > 16) {
      withFeedback('A kartya neve legfeljebb 16 karakter lehet.', 'error')
      return
    }
    if (environment.worldCards.some((card) => card.name.toLowerCase() === standardForm.name.toLowerCase())) {
      withFeedback('Ez a kartya nev mar letezik.', 'error')
      return
    }
    if (standardForm.damage === '') {
      withFeedback('Adj meg egy sebzés értéket.', 'error')
      return
    }
    if (standardForm.health === '') {
      withFeedback('Adj meg egy életerő értéket.', 'error')
      return
    }
    const damageValue = Number(standardForm.damage)
    const healthValue = Number(standardForm.health)
    if (Number.isNaN(damageValue) || Number.isNaN(healthValue)) {
      withFeedback('Érvényes számot adj meg.', 'error')
      return
    }
    if (damageValue < 2 || damageValue > 100) {
      withFeedback('A sebzes 2 es 100 kozott lehet.', 'error')
      return
    }
    if (healthValue < 1 || healthValue > 100) {
      withFeedback('Az eletero 1 es 100 kozott lehet.', 'error')
      return
    }

    const cardName = standardForm.name.trim()

    // Kép generálás a háttérben
    generateCardImage(cardName).then((backgroundImage) => {
      const newCard: WorldCard = {
        id: generateId('card'),
        name: cardName,
        damage: damageValue,
        health: healthValue,
        element: standardForm.element,
        kind: 'standard',
        backgroundImage: backgroundImage || undefined,
      }

      onSave({
        ...environment,
        worldCards: [...environment.worldCards, newCard],
      })
    })

    setStandardForm({ name: '', damage: '2', health: '2', element: 'earth' })
    withFeedback('Sikeresen hozzaadtad a kartya listahoz. Kep generalas folyamatban...')
  }

  function handleLeaderSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const base = standardCards.find((card) => card.id === leaderForm.baseCardId)
    if (!base) {
      withFeedback('Valassz ki egy alap kartyat a vezer letrehozasahoz.', 'error')
      return
    }
    if (!leaderForm.name.trim()) {
      withFeedback('A vezerkartya neve kotelezo.', 'error')
      return
    }

    const cardName = leaderForm.name.trim()

    // Kép generálás a háttérben
    generateCardImage(cardName).then((backgroundImage) => {
      const newCard: WorldCard = {
        id: generateId('leader'),
        name: cardName,
        damage:
          leaderForm.mode === 'double-damage' ? Math.min(base.damage * 2, 200) : base.damage,
        health:
          leaderForm.mode === 'double-health' ? Math.min(base.health * 2, 200) : base.health,
        element: base.element,
        kind: 'leader',
        sourceCardId: base.id,
        backgroundImage: backgroundImage || undefined,
      }

      onSave({
        ...environment,
        worldCards: [...environment.worldCards, newCard],
      })
    })

    setLeaderForm({ baseCardId: '', name: '', mode: 'double-damage' })
    withFeedback('A vezerkartya elkeszult. Kep generalas folyamatban...')
  }

  function handleStarterToggle(cardId: string) {
    const exists = environment.starterCollection.includes(cardId)
    const next = exists
      ? environment.starterCollection.filter((id) => id !== cardId)
      : [...environment.starterCollection, cardId]
    onSave({ ...environment, starterCollection: next })
  }

  function handleDungeonTypeChange(type: DungeonType) {
    const req = DUNGEON_REQUIREMENTS[type]
    setDungeonForm((prev) => ({
      ...prev,
      type,
      cardOrder: Array(req.total)
        .fill('')
        .map((_, index) => prev.cardOrder[index] ?? ''),
    }))
  }

  function handleDungeonCardChange(index: number, cardId: string) {
    setDungeonForm((prev) => {
      const nextOrder = [...prev.cardOrder]
      nextOrder[index] = cardId
      return { ...prev, cardOrder: nextOrder }
    })
  }

  function validateDungeonForm(): string | null {
    if (!dungeonForm.name.trim()) {
      return 'A kazamata neve kotelezo.'
    }
    if (environment.dungeons.some((d) => d.name.toLowerCase() === dungeonForm.name.trim().toLowerCase())) {
      return 'Ez a kazamata nev mar foglalt.'
    }
    const req = DUNGEON_REQUIREMENTS[dungeonForm.type]

    const standardSlots = dungeonForm.cardOrder.slice(0, req.standard)
    const leaderSlots = dungeonForm.cardOrder.slice(req.standard)

    if (standardSlots.some((id) => !id)) {
      return 'Toltse ki az osszes sima kartya helyet.'
    }
    if (leaderSlots.some((id) => !id) && req.leader > 0) {
      return 'Valassz ki egy vezerkartyat a vegere.'
    }
    const uniqueStandard = new Set(standardSlots)
    if (uniqueStandard.size !== standardSlots.length) {
      return 'Egy sima kartya csak egyszer szerepelhet a kazamataban.'
    }
    return null
  }

  function handleDungeonSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = validateDungeonForm()
    if (error) {
      withFeedback(error, 'error')
      return
    }
    const newDungeon = {
      id: generateId('dungeon'),
      name: dungeonForm.name.trim(),
      type: dungeonForm.type,
      cardOrder: dungeonForm.cardOrder,
    }
    onSave({
      ...environment,
      dungeons: [...environment.dungeons, newDungeon],
    })
    const req = DUNGEON_REQUIREMENTS.encounter
    setDungeonForm({ name: '', type: 'encounter', cardOrder: Array(req.total).fill('') })
    withFeedback('A kazamata hozzaadva.')
  }

  function removeDungeon(dungeonId: string) {
    onSave({
      ...environment,
      dungeons: environment.dungeons.filter((dungeon) => dungeon.id !== dungeonId),
    })
    withFeedback('Kazamata eltavolitva.')
  }

  function removeWorldCard(cardId: string) {
    const nextWorldCards = environment.worldCards.filter((card) => card.id !== cardId)
    if (nextWorldCards.length === environment.worldCards.length) {
      withFeedback('A kartya nem talalhato.', 'error')
      return
    }

    const nextStarterCollection = environment.starterCollection.filter((id) => id !== cardId)
    const affectedDungeons = environment.dungeons.filter((dungeon) =>
      dungeon.cardOrder.includes(cardId)
    )
    const nextDungeons = environment.dungeons.map((dungeon) => ({
      ...dungeon,
      cardOrder: dungeon.cardOrder.filter((id) => id !== cardId),
    }))

    onSave({
      ...environment,
      worldCards: nextWorldCards,
      starterCollection: nextStarterCollection,
      dungeons: nextDungeons,
    })

    setLeaderForm((prev) =>
      prev.baseCardId === cardId ? { ...prev, baseCardId: '' } : prev
    )
    setDungeonForm((prev) => ({
      ...prev,
      cardOrder: prev.cardOrder.map((id) => (id === cardId ? '' : id)),
    }))
    withFeedback(
      affectedDungeons.length
        ? 'Kartya eltavolitva. Az erintett kazamatak kartyalistaja frissitesre szorul.'
        : 'Kartya eltavolitva.'
    )
  }

  return (
    <section className="panel">
      <h2>Jatekmester eszkozok</h2>
      {feedback && <div className={`feedback feedback--${feedback.type}`}>{feedback.text}</div>}

      <div className="panel-block">
        <h3>Uj sima kartya</h3>
        <form className="form-grid" onSubmit={handleStandardSubmit}>
          <label>
            Nev
            <input
              value={standardForm.name}
              onChange={(event) =>
                setStandardForm((prev) => ({ ...prev, name: event.target.value }))
              }
              maxLength={16}
            />
          </label>
          <label>
            Sebzes
            <input
              type="number"
              min={2}
              max={100}
              value={standardForm.damage}
              onChange={(event) =>
                setStandardForm((prev) => ({ ...prev, damage: event.target.value }))
              }
            />
          </label>
          <label>
            Eletero
            <input
              type="number"
              min={1}
              max={100}
              value={standardForm.health}
              onChange={(event) =>
                setStandardForm((prev) => ({ ...prev, health: event.target.value }))
              }
            />
          </label>
          <label>
            Tipus
            <select
              value={standardForm.element}
              onChange={(event) =>
                setStandardForm((prev) => ({
                  ...prev,
                  element: event.target.value as WorldCard['element'],
                }))
              }
            >
              {CARD_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Kartya hozzaadasa</button>
        </form>
      </div>

      <div className="panel-block">
        <h3>Uj vezerkartya</h3>
        <form className="form-grid" onSubmit={handleLeaderSubmit}>
          <label>
            Alap kartya
            <select
              value={leaderForm.baseCardId}
              onChange={(event) =>
                setLeaderForm((prev) => ({ ...prev, baseCardId: event.target.value }))
              }
            >
              <option value="">Valassz...</option>
              {standardCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nev
            <input
              value={leaderForm.name}
              onChange={(event) =>
                setLeaderForm((prev) => ({ ...prev, name: event.target.value }))
              }
              maxLength={16}
            />
          </label>
          <label>
            Erositesi mod
            <select
              value={leaderForm.mode}
              onChange={(event) =>
                setLeaderForm((prev) => ({
                  ...prev,
                  mode: event.target.value as LeaderCardForm['mode'],
                }))
              }
            >
              <option value="double-damage">Sebzes duplazas</option>
              <option value="double-health">Eletero duplazas</option>
            </select>
          </label>
          <button type="submit">Vezer letrehozasa</button>
        </form>
      </div>

      <div className="panel-block">
        <h3>Kezdo gyujtemeny</h3>
        <div className="card-toggle-grid">
          {standardCards.length === 0 && <p>Meg nincs egy sima kartya sem.</p>}
          {standardCards.map((card) => {
            const checked = environment.starterCollection.includes(card.id)
            return (
              <label key={card.id} className="card-toggle">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleStarterToggle(card.id)}
                />
                <CardPreview
                  card={card}
                  accent={checked ? 'collection' : 'world'}
                  highlight={checked}
                  actions={
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        removeWorldCard(card.id)
                      }}
                    >
                      Torles
                    </button>
                  }
                />
              </label>
            )
          })}
        </div>
      </div>

      <div className="panel-block">
        <h3>Kazamatak</h3>
        <form className="form-grid" onSubmit={handleDungeonSubmit}>
          <label>
            Nev
            <input
              value={dungeonForm.name}
              onChange={(event) =>
                setDungeonForm((prev) => ({ ...prev, name: event.target.value }))
              }
              maxLength={32}
            />
          </label>
          <label>
            Tipus
            <select
              value={dungeonForm.type}
              onChange={(event) =>
                handleDungeonTypeChange(event.target.value as DungeonType)
              }
            >
              <option value="encounter">Egyszeru talalkozas</option>
              <option value="minor">Kis kazamata</option>
              <option value="major">Nagy kazamata</option>
            </select>
          </label>
          <div className="dungeon-grid">
            {dungeonForm.cardOrder.map((cardId, index) => {
              const req = DUNGEON_REQUIREMENTS[dungeonForm.type]
              const isLeaderSlot = req.leader > 0 && index >= req.standard
              const options = isLeaderSlot ? leaderCards : standardCards
              const taken = new Set(
                dungeonForm.cardOrder.filter((id, position) => id && position !== index)
              )
              return (
                <label key={index}>
                  {isLeaderSlot ? 'Vezer' : `Kartya ${index + 1}`}
                  <select
                    value={cardId}
                    onChange={(event) => handleDungeonCardChange(index, event.target.value)}
                  >
                    <option value="">Valassz...</option>
                    {options.map((card) => (
                      <option
                        key={card.id}
                        value={card.id}
                        disabled={!isLeaderSlot && taken.has(card.id)}
                      >
                        {card.name}
                      </option>
                    ))}
                  </select>
                </label>
              )
            })}
          </div>
          <button type="submit">Kazamata hozzaadasa</button>
        </form>

        <ul className="dungeon-list">
          {environment.dungeons.map((dungeon) => (
            <li key={dungeon.id}>
              <div>
                <strong>{dungeon.name}</strong> ({dungeon.type})
                <p>
                  Kartya sorrend: {dungeon.cardOrder
                    .map((id) => environment.worldCards.find((card) => card.id === id)?.name ?? 'Ismeretlen')
                    .join(' > ')}
                </p>
              </div>
              <button type="button" onClick={() => removeDungeon(dungeon.id)}>
                Torles
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
