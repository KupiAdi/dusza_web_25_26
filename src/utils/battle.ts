import type {
  BattleResult,
  BattleRoundResult,
  DeckEntry,
  Dungeon,
  GameEnvironment,
  PlayerCardState,
  WorldCard,
} from '../types'

const ELEMENT_ADVANTAGE: Record<string, string> = {
  fire: 'earth',
  earth: 'water',
  water: 'air',
  air: 'fire',
}

interface PreparedCard {
  id: string
  name: string
  damage: number
  health: number
  element: WorldCard['element']
  kind: WorldCard['kind']
}

function getWorldCard(environment: GameEnvironment, cardId: string): WorldCard | undefined {
  return environment.worldCards.find((card) => card.id === cardId)
}

function preparePlayerCard(
  environment: GameEnvironment,
  playerCard: PlayerCardState
): PreparedCard | undefined {
  const base = getWorldCard(environment, playerCard.cardId)
  if (!base) {
    return undefined
  }
  return {
    id: base.id,
    name: base.name,
    damage: playerCard.damage,
    health: playerCard.health,
    element: base.element,
    kind: base.kind,
  }
}

function prepareEnvironmentCard(
  environment: GameEnvironment,
  cardId: string
): PreparedCard | undefined {
  const base = getWorldCard(environment, cardId)
  if (!base) {
    return undefined
  }
  return {
    id: base.id,
    name: base.name,
    damage: base.damage,
    health: base.health,
    element: base.element,
    kind: base.kind,
  }
}

function evaluateRound(player: PreparedCard, dungeon: PreparedCard): {
  winner: 'player' | 'dungeon'
  reason: string
} {
  if (player.damage > dungeon.health && dungeon.damage > player.health) {
    return {
      winner: 'player',
      reason: `${player.name} lands the decisive blow before ${dungeon.name} can retaliate`,
    }
  }

  if (player.damage > dungeon.health) {
    return {
      winner: 'player',
      reason: `${player.name} dealt ${player.damage} damage which exceeds ${dungeon.name}'s health`,
    }
  }

  if (dungeon.damage > player.health) {
    return {
      winner: 'dungeon',
      reason: `${dungeon.name} dealt ${dungeon.damage} damage which exceeds ${player.name}'s health`,
    }
  }

  if (ELEMENT_ADVANTAGE[player.element] === dungeon.element) {
    return {
      winner: 'player',
      reason: `${player.name}'s ${player.element} element counters ${dungeon.name}'s ${dungeon.element}`,
    }
  }

  if (ELEMENT_ADVANTAGE[dungeon.element] === player.element) {
    return {
      winner: 'dungeon',
      reason: `${dungeon.name}'s ${dungeon.element} element counters ${player.name}'s ${player.element}`,
    }
  }

  return {
    winner: 'dungeon',
    reason: `${dungeon.name} wins by stalemate advantage`,
  }
}

interface RunBattleArgs {
  environment: GameEnvironment
  deck: DeckEntry[]
  dungeon: Dungeon
  playerCards: PlayerCardState[]
}

export function runBattle({ environment, deck, dungeon, playerCards }: RunBattleArgs): BattleResult {
  const rounds: BattleRoundResult[] = []
  let playerWins = 0
  let dungeonWins = 0
  const playerCardMap = new Map(playerCards.map((card) => [card.cardId, card]))

  dungeon.cardOrder.forEach((dungeonCardId, index) => {
    const playerDeckEntry = deck[index]
    const dungeonCard = prepareEnvironmentCard(environment, dungeonCardId)
    const playerSourceState = playerDeckEntry
      ? playerCardMap.get(playerDeckEntry.cardId)
      : undefined
    const playerCardState = playerSourceState
      ? preparePlayerCard(environment, playerSourceState)
      : undefined

    if (!dungeonCard || !playerCardState) {
      dungeonWins += 1
      rounds.push({
        round: index + 1,
        playerCardId: playerDeckEntry?.cardId ?? 'missing',
        dungeonCardId,
        winner: 'dungeon',
        reason: 'Missing card data',
      })
      return
    }

    const roundResult = evaluateRound(playerCardState, dungeonCard)
    rounds.push({
      round: index + 1,
      playerCardId: playerCardState.id,
      dungeonCardId: dungeonCard.id,
      winner: roundResult.winner,
      reason: roundResult.reason,
    })

    if (roundResult.winner === 'player') {
      playerWins += 1
    } else {
      dungeonWins += 1
    }
  })

  const playerVictory = playerWins >= dungeon.cardOrder.length

  return {
    dungeonId: dungeon.id,
    playerWins,
    dungeonWins,
    rounds,
    playerVictory,
    timestamp: Date.now(),
  }
}
