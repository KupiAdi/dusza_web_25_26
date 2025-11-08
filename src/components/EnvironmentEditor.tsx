import { useEffect, useMemo, useRef, useState } from 'react'
import type { DungeonType, GameEnvironment, WorldCard } from '../types'
import { CardPreview } from './CardPreview'
import { ConfirmDialog } from './ConfirmDialog'
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
  { value: 'earth', label: 'Föld' },
  { value: 'water', label: 'Víz' },
  { value: 'air', label: 'Levegő' },
  { value: 'fire', label: 'Tűz' },
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
  const environmentRef = useRef(environment)
  
  useEffect(() => {
    environmentRef.current = environment
  }, [environment])

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
  const [cardPendingRemoval, setCardPendingRemoval] = useState<WorldCard | null>(null)

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
      console.log('🖼️ Kép API válasz:', cardName, data)
      return data.path
    } catch (error) {
      console.error('Hiba a kép generálásakor:', error)
      return ''
    }
  }

  async function handleStandardSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!standardForm.name.trim()) {
      withFeedback('Adj meg egy nevet a kártyához.', 'error')
      return
    }
    if (standardForm.name.length > 16) {
      withFeedback('A kártya neve legfeljebb 16 karakter lehet.', 'error')
      return
    }
    if (environment.worldCards.some((card) => card.name.toLowerCase() === standardForm.name.toLowerCase())) {
      withFeedback('Ez a kártyanév már létezik.', 'error')
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
      withFeedback('A sebzés 2 és 100 között lehet.', 'error')
      return
    }
    if (healthValue < 1 || healthValue > 100) {
      withFeedback('Az életerő 1 és 100 között lehet.', 'error')
      return
    }

    const cardName = standardForm.name.trim()
    const newCardId = generateId('card')

    const newCard: WorldCard = {
      id: newCardId,
      name: cardName,
      damage: damageValue,
      health: healthValue,
      element: standardForm.element,
      kind: 'standard',
      backgroundImage: undefined,
    }

    onSave({
      ...environment,
      worldCards: [...environment.worldCards, newCard],
    })

    setStandardForm({ name: '', damage: '2', health: '2', element: 'earth' })
    withFeedback('Sikeresen hozzáadtad a kártyát a listához. Kép generálása folyamatban...')

    setTimeout(async () => {
      const backgroundImage = await generateCardImage(cardName)
      if (backgroundImage) {
        const currentEnv = environmentRef.current
        const cardExists = currentEnv.worldCards.some((card) => card.id === newCardId)
        if (cardExists) {
          onSave({
            ...currentEnv,
            worldCards: currentEnv.worldCards.map((card) =>
              card.id === newCardId
                ? { ...card, backgroundImage }
                : card
            ),
          })
        }
      }
    }, 200)
  }

  async function handleLeaderSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const base = standardCards.find((card) => card.id === leaderForm.baseCardId)
    if (!base) {
      withFeedback('Válassz ki egy alap kártyát a vezér létrehozásához.', 'error')
      return
    }
    if (!leaderForm.name.trim()) {
      withFeedback('A vezérkártya neve kötelező.', 'error')
      return
    }

    const cardName = leaderForm.name.trim()
    const newCardId = generateId('leader')

    const newCard: WorldCard = {
      id: newCardId,
      name: cardName,
      damage:
        leaderForm.mode === 'double-damage' ? Math.min(base.damage * 2, 200) : base.damage,
      health:
        leaderForm.mode === 'double-health' ? Math.min(base.health * 2, 200) : base.health,
      element: base.element,
      kind: 'leader',
      sourceCardId: base.id,
      backgroundImage: undefined,
    }

    onSave({
      ...environment,
      worldCards: [...environment.worldCards, newCard],
    })

    setLeaderForm({ baseCardId: '', name: '', mode: 'double-damage' })
    withFeedback('A vezérkártya elkészült. Kép generálása folyamatban...')

    setTimeout(async () => {
      const backgroundImage = await generateCardImage(cardName)
      if (backgroundImage) {
        const currentEnv = environmentRef.current
        const cardExists = currentEnv.worldCards.some((card) => card.id === newCardId)
        if (cardExists) {
          onSave({
            ...currentEnv,
            worldCards: currentEnv.worldCards.map((card) =>
              card.id === newCardId
                ? { ...card, backgroundImage }
                : card
            ),
          })
        }
      }
    }, 200)
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
      return 'A kazamata neve kötelező.'
    }
    if (environment.dungeons.some((d) => d.name.toLowerCase() === dungeonForm.name.trim().toLowerCase())) {
      return 'Ez a kazamata név már foglalt.'
    }
    const req = DUNGEON_REQUIREMENTS[dungeonForm.type]

    const standardSlots = dungeonForm.cardOrder.slice(0, req.standard)
    const leaderSlots = dungeonForm.cardOrder.slice(req.standard)

    if (standardSlots.some((id) => !id)) {
      return 'Töltsd ki az összes sima kártya helyét.'
    }
    if (leaderSlots.some((id) => !id) && req.leader > 0) {
      return 'Válassz ki egy vezérkártyát a végére.'
    }
    const uniqueStandard = new Set(standardSlots)
    if (uniqueStandard.size !== standardSlots.length) {
      return 'Egy sima kártya csak egyszer szerepelhet a kazamatában.'
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
    withFeedback('A kazamata hozzáadva.')
  }

  function removeDungeon(dungeonId: string) {
    onSave({
      ...environment,
      dungeons: environment.dungeons.filter((dungeon) => dungeon.id !== dungeonId),
    })
    withFeedback('Kazamata eltávolítva.')
  }

  function requestWorldCardRemoval(card: WorldCard) {
    setCardPendingRemoval(card)
  }

  function cancelWorldCardRemoval() {
    setCardPendingRemoval(null)
  }

  function confirmWorldCardRemoval() {
    if (!cardPendingRemoval) {
      return
    }
    removeWorldCard(cardPendingRemoval.id)
  }

  function removeWorldCard(cardId: string) {
    setCardPendingRemoval(null)

    const nextWorldCards = environment.worldCards.filter((card) => card.id !== cardId)
    if (nextWorldCards.length === environment.worldCards.length) {
      withFeedback('A kártya nem található.', 'error')
      return
    }

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
      starterCollection: [],
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
        ? 'Kártya eltávolítva. Az érintett kazamaták kártyalistája frissítésre szorul.'
        : 'Kártya eltávolítva.'
    )
  }

  return (
    <>
      <section className="panel">
        <h2>Játékmester eszközök</h2>
        {feedback && <div className={`feedback feedback--${feedback.type}`}>{feedback.text}</div>}

        <div className="panel-block">
          <h3>Új sima kártya</h3>
          <form className="form-grid" onSubmit={handleStandardSubmit}>
            <label>
              Név
              <input
                value={standardForm.name}
                onChange={(event) =>
                  setStandardForm((prev) => ({ ...prev, name: event.target.value }))
                }
                maxLength={16}
              />
            </label>
            <label>
              Sebzés
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
              Életerő
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
              Típus
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
            <button type="submit">Kártya hozzáadása</button>
          </form>
        </div>

        <div className="panel-block">
          <h3>Új vezérkártya</h3>
          <form className="form-grid" onSubmit={handleLeaderSubmit}>
            <label>
              Alap kártya
              <select
                value={leaderForm.baseCardId}
                onChange={(event) =>
                  setLeaderForm((prev) => ({ ...prev, baseCardId: event.target.value }))
                }
              >
                <option value="">Válassz...</option>
                {standardCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Név
              <input
                value={leaderForm.name}
                onChange={(event) =>
                  setLeaderForm((prev) => ({ ...prev, name: event.target.value }))
                }
                maxLength={16}
              />
            </label>
            <label>
              Erősítési mód
              <select
                value={leaderForm.mode}
                onChange={(event) =>
                  setLeaderForm((prev) => ({
                    ...prev,
                    mode: event.target.value as LeaderCardForm['mode'],
                  }))
                }
              >
                <option value="double-damage">Sebzés duplázás</option>
                <option value="double-health">Életerő duplázás</option>
              </select>
            </label>
            <button type="submit">Vezér létrehozása</button>
          </form>
        </div>

        <div className="panel-block">
          <h3>Sima kártyák</h3>
          <div className="card-toggle-grid">
            {standardCards.length === 0 && <p>Még nincs egy sima kártya sem.</p>}
            {standardCards.map((card) => (
              <CardPreview
                key={card.id}
                card={card}
                accent="world"
                onDelete={() => requestWorldCardRemoval(card)}
              />
            ))}
          </div>
        </div>

        <div className="panel-block">
          <h3>Vezérkártyák</h3>
          <div className="card-toggle-grid">
            {leaderCards.length === 0 && <p>Még nincs egy vezérkártya sem.</p>}
            {leaderCards.map((card) => (
              <CardPreview
                key={card.id}
                card={card}
                accent="world"
                onDelete={() => requestWorldCardRemoval(card)}
              />
            ))}
          </div>
        </div>

        <div className="panel-block">
          <h3>Kazamaták</h3>
          <form className="form-grid" onSubmit={handleDungeonSubmit}>
            <label>
              Név
              <input
                value={dungeonForm.name}
                onChange={(event) =>
                  setDungeonForm((prev) => ({ ...prev, name: event.target.value }))
                }
                maxLength={32}
              />
            </label>
            <label>
              Típus
              <select
                value={dungeonForm.type}
                onChange={(event) =>
                  handleDungeonTypeChange(event.target.value as DungeonType)
                }
              >
                <option value="encounter">Egyszerű találkozás</option>
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
                    {isLeaderSlot ? 'Vezér' : `Kártya ${index + 1}`}
                    <select
                      value={cardId}
                      onChange={(event) => handleDungeonCardChange(index, event.target.value)}
                    >
                      <option value="">Válassz...</option>
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
            <button type="submit">Kazamata hozzáadása</button>
          </form>

          <ul className="dungeon-list">
            {environment.dungeons.map((dungeon) => (
              <li key={dungeon.id}>
                <div>
                  <strong>{dungeon.name}</strong> ({dungeon.type})
                  <p>
                    Kártyasorrend: {dungeon.cardOrder
                      .map((id) => environment.worldCards.find((card) => card.id === id)?.name ?? 'Ismeretlen')
                      .join(' > ')}
                  </p>
                </div>
                <button type="button" onClick={() => removeDungeon(dungeon.id)}>
                  Törlés
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(cardPendingRemoval)}
        title="Kártya törlése"
        description={
          cardPendingRemoval
            ? `Biztosan törlöd a "${cardPendingRemoval.name}" kártyát? Ez a művelet nem visszavonható.`
            : ''
        }
        confirmLabel="Kártya törlése"
        cancelLabel="Mégse"
        onCancel={cancelWorldCardRemoval}
        onConfirm={confirmWorldCardRemoval}
      />
    </>
  )
}
