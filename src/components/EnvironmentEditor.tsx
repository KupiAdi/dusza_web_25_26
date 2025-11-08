import { useEffect, useMemo, useRef, useState } from 'react'
import type { DungeonType, GameEnvironment, WorldCard } from '../types'
import { CardPreview } from './CardPreview'
import { ConfirmDialog } from './ConfirmDialog'
import { generateId } from '../utils/id'
import { useTranslation } from '../state/LanguageContext'

const DUNGEON_REQUIREMENTS: Record<
  DungeonType,
  { total: number; standard: number; leader: number }
> = {
  encounter: { total: 1, standard: 1, leader: 0 },
  minor: { total: 4, standard: 3, leader: 1 },
  major: { total: 6, standard: 5, leader: 1 },
}

const CARD_TYPES = [
  { value: 'earth', labelKey: 'elements.earth' },
  { value: 'water', labelKey: 'elements.water' },
  { value: 'air', labelKey: 'elements.air' },
  { value: 'fire', labelKey: 'elements.fire' },
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
  const { t } = useTranslation()
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
      console.log('🖼️ Image API response:', cardName, data)
      return data.path
    } catch (error) {
      console.error('Error while generating image:', error)
      return ''
    }
  }

  async function handleStandardSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!standardForm.name.trim()) {
      withFeedback(t('validation.cardNameRequired'), 'error')
      return
    }
    if (standardForm.name.length > 16) {
      withFeedback(t('validation.cardNameMax'), 'error')
      return
    }
    if (environment.worldCards.some((card) => card.name.toLowerCase() === standardForm.name.toLowerCase())) {
      withFeedback(t('validation.cardNameExists'), 'error')
      return
    }
    if (standardForm.damage === '') {
      withFeedback(t('validation.cardDamageRequired'), 'error')
      return
    }
    if (standardForm.health === '') {
      withFeedback(t('validation.cardHealthRequired'), 'error')
      return
    }
    const damageValue = Number(standardForm.damage)
    const healthValue = Number(standardForm.health)
    if (Number.isNaN(damageValue) || Number.isNaN(healthValue)) {
      withFeedback(t('validation.cardValueInvalid'), 'error')
      return
    }
    if (damageValue < 2 || damageValue > 100) {
      withFeedback(t('validation.cardDamageRange'), 'error')
      return
    }
    if (healthValue < 1 || healthValue > 100) {
      withFeedback(t('validation.cardHealthRange'), 'error')
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
    withFeedback(t('environment.feedback.cardAdded'))

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
      withFeedback(t('validation.leaderBaseRequired'), 'error')
      return
    }
    if (!leaderForm.name.trim()) {
      withFeedback(t('validation.leaderNameRequired'), 'error')
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
    withFeedback(t('environment.feedback.leaderAdded'))

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
      return t('validation.dungeonNameRequired')
    }
    if (environment.dungeons.some((d) => d.name.toLowerCase() === dungeonForm.name.trim().toLowerCase())) {
      return t('validation.dungeonNameExists')
    }
    const req = DUNGEON_REQUIREMENTS[dungeonForm.type]

    const standardSlots = dungeonForm.cardOrder.slice(0, req.standard)
    const leaderSlots = dungeonForm.cardOrder.slice(req.standard)

    if (standardSlots.some((id) => !id)) {
      return t('validation.dungeonStandardSlots')
    }
    if (leaderSlots.some((id) => !id) && req.leader > 0) {
      return t('validation.dungeonLeaderSlots')
    }
    const uniqueStandard = new Set(standardSlots)
    if (uniqueStandard.size !== standardSlots.length) {
      return t('validation.dungeonCardUnique')
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
    withFeedback(t('environment.feedback.dungeonAdded'))
  }

  function removeDungeon(dungeonId: string) {
    onSave({
      ...environment,
      dungeons: environment.dungeons.filter((dungeon) => dungeon.id !== dungeonId),
    })
    withFeedback(t('environment.feedback.dungeonRemoved'))
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
      withFeedback(t('environment.errors.cardNotFound'), 'error')
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
        ? t('environment.feedback.cardRemovedWithDungeons')
        : t('environment.feedback.cardRemoved')
    )
  }

  return (
    <>
      <section className="panel">
        <h2>{t('environment.labels.masterTools')}</h2>
        {feedback && <div className={`feedback feedback--${feedback.type}`}>{feedback.text}</div>}

        <div className="panel-block">
          <h3>{t('environment.labels.standardCardForm')}</h3>
          <form className="form-grid" onSubmit={handleStandardSubmit}>
            <label>
              {t('common.name')}
              <input
                value={standardForm.name}
                onChange={(event) =>
                  setStandardForm((prev) => ({ ...prev, name: event.target.value }))
                }
                maxLength={16}
              />
            </label>
            <label>
              {t('environment.labels.damage')}
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
              {t('environment.labels.health')}
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
              {t('environment.labels.type')}
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
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">{t('environment.actions.addCard')}</button>
          </form>
        </div>

        <div className="panel-block">
          <h3>{t('environment.labels.leaderCardForm')}</h3>
          <form className="form-grid" onSubmit={handleLeaderSubmit}>
            <label>
              {t('environment.labels.baseCard')}
              <select
                value={leaderForm.baseCardId}
                onChange={(event) =>
                  setLeaderForm((prev) => ({ ...prev, baseCardId: event.target.value }))
                }
              >
                <option value="">{t('common.select')}</option>
                {standardCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('common.name')}
              <input
                value={leaderForm.name}
                onChange={(event) =>
                  setLeaderForm((prev) => ({ ...prev, name: event.target.value }))
                }
                maxLength={16}
              />
            </label>
            <label>
              {t('environment.labels.boostMode')}
              <select
                value={leaderForm.mode}
                onChange={(event) =>
                  setLeaderForm((prev) => ({
                    ...prev,
                    mode: event.target.value as LeaderCardForm['mode'],
                  }))
                }
              >
                <option value="double-damage">{t('environment.labels.doubleDamage')}</option>
                <option value="double-health">{t('environment.labels.doubleHealth')}</option>
              </select>
            </label>
            <button type="submit">{t('environment.actions.createLeader')}</button>
          </form>
        </div>

        <div className="panel-block">
          <h3>{t('environment.labels.standardCards')}</h3>
          <div className="card-toggle-grid">
            {standardCards.length === 0 && <p>{t('environment.empty.standardCards')}</p>}
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
          <h3>{t('environment.labels.leaderCards')}</h3>
          <div className="card-toggle-grid">
            {leaderCards.length === 0 && <p>{t('environment.empty.leaderCards')}</p>}
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
          <h3>{t('environment.labels.dungeons')}</h3>
          <form className="form-grid" onSubmit={handleDungeonSubmit}>
            <label>
              {t('common.name')}
              <input
                value={dungeonForm.name}
                onChange={(event) =>
                  setDungeonForm((prev) => ({ ...prev, name: event.target.value }))
                }
                maxLength={32}
              />
            </label>
            <label>
              {t('environment.labels.type')}
              <select
                value={dungeonForm.type}
                onChange={(event) =>
                  handleDungeonTypeChange(event.target.value as DungeonType)
                }
              >
                <option value="encounter">{t('environment.dungeon.type.encounter')}</option>
                <option value="minor">{t('environment.dungeon.type.minor')}</option>
                <option value="major">{t('environment.dungeon.type.major')}</option>
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
                    {isLeaderSlot
                      ? t('environment.dungeon.leaderLabel')
                      : t('environment.dungeon.cardLabel', { index: index + 1 })}
                    <select
                      value={cardId}
                      onChange={(event) => handleDungeonCardChange(index, event.target.value)}
                    >
                      <option value="">{t('common.select')}</option>
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
            <button type="submit">{t('environment.actions.addDungeon')}</button>
          </form>

          <ul className="dungeon-list">
            {environment.dungeons.map((dungeon) => (
              <li key={dungeon.id}>
                <div>
                  <strong>{dungeon.name}</strong> ({t(`environment.dungeon.type.${dungeon.type}`)})
                  <p>
                    {t('environment.labels.cardOrder')}{' '}
                    {dungeon.cardOrder
                      .map(
                        (id) =>
                          environment.worldCards.find((card) => card.id === id)?.name ??
                          t('common.unknown')
                      )
                      .join(' > ')}
                  </p>
                </div>
                <button type="button" onClick={() => removeDungeon(dungeon.id)}>
                  {t('common.delete')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(cardPendingRemoval)}
        title={t('environment.confirm.cardDeleteTitle')}
        description={
          cardPendingRemoval
            ? t('environment.confirm.cardDeleteDescription', { name: cardPendingRemoval.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={cancelWorldCardRemoval}
        onConfirm={confirmWorldCardRemoval}
      />
    </>
  )
}
