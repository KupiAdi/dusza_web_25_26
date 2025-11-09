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

const ELEMENT_NAMES: Record<string, string> = {
  fire: 'tűz',
  earth: 'föld',
  water: 'víz',
  air: 'levegő',
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
    damage: base.damage + playerCard.damageBonus,
    health: base.health + playerCard.healthBonus,
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
  reasonKey: string
  reasonParams?: Record<string, string | number>
} {
  if (player.damage > dungeon.health && dungeon.damage > player.health) {
    return {
      winner: 'player',
      reason: `${player.name} döntő csapást mért be, mielőtt ${dungeon.name} visszaüthetne`,
      reasonKey: 'battle.reasons.decisiveStrike',
      reasonParams: {
        playerName: player.name,
        dungeonName: dungeon.name,
      },
    }
  }

  if (player.damage > dungeon.health) {
    return {
      winner: 'player',
      reason: `${player.name} ${player.damage} sebzést okozott, ami meghaladja ${dungeon.name} ${dungeon.health} életét`,
      reasonKey: 'battle.reasons.playerDamageOverflow',
      reasonParams: {
        playerName: player.name,
        playerDamage: player.damage,
        dungeonName: dungeon.name,
        dungeonHealth: dungeon.health,
      },
    }
  }

  if (dungeon.damage > player.health) {
    return {
      winner: 'dungeon',
      reason: `${dungeon.name} ${dungeon.damage} sebzést okozott, ami meghaladja ${player.name} ${player.health} életét`,
      reasonKey: 'battle.reasons.dungeonDamageOverflow',
      reasonParams: {
        dungeonName: dungeon.name,
        dungeonDamage: dungeon.damage,
        playerName: player.name,
        playerHealth: player.health,
      },
    }
  }

  if (ELEMENT_ADVANTAGE[player.element] === dungeon.element) {
    const playerElementName = ELEMENT_NAMES[player.element] || player.element
    const dungeonElementName = ELEMENT_NAMES[dungeon.element] || dungeon.element
    return {
      winner: 'player',
      reason: `${player.name} ${playerElementName} eleme legyőzi ${dungeon.name} ${dungeonElementName} elemét`,
      reasonKey: 'battle.reasons.playerElementAdvantage',
      reasonParams: {
        playerName: player.name,
        playerElement: player.element,
        dungeonName: dungeon.name,
        dungeonElement: dungeon.element,
      },
    }
  }

  if (ELEMENT_ADVANTAGE[dungeon.element] === player.element) {
    const playerElementName = ELEMENT_NAMES[player.element] || player.element
    const dungeonElementName = ELEMENT_NAMES[dungeon.element] || dungeon.element
    return {
      winner: 'dungeon',
      reason: `${dungeon.name} ${dungeonElementName} eleme legyőzi ${player.name} ${playerElementName} elemét`,
      reasonKey: 'battle.reasons.dungeonElementAdvantage',
      reasonParams: {
        playerName: player.name,
        playerElement: player.element,
        dungeonName: dungeon.name,
        dungeonElement: dungeon.element,
      },
    }
  }

  return {
    winner: 'dungeon',
    reason: `${dungeon.name} patthelyzet miatt győz`,
    reasonKey: 'battle.reasons.stalemate',
    reasonParams: {
      dungeonName: dungeon.name,
    },
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
        reason: 'Hiányzó kártyaadatok',
        reasonKey: 'battle.reasons.missingCard',
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
      reasonKey: roundResult.reasonKey,
      reasonParams: roundResult.reasonParams,
    })

    if (roundResult.winner === 'player') {
      playerWins += 1
    } else {
      dungeonWins += 1
    }
  })

  // Player wins if they won more rounds than the dungeon
  const playerVictory = playerWins >= dungeonWins

  return {
    dungeonId: dungeon.id,
    playerWins,
    dungeonWins,
    rounds,
    playerVictory,
    timestamp: Date.now(),
  }
}
