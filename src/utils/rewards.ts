import type { DungeonType, PlayerCardState } from '../types'

export function getRewardDescriptor(type: DungeonType): string {
  switch (type) {
    case 'encounter':
      return '+1 sebzés'
    case 'minor':
      return '+2 élet'
    case 'major':
      return '+3 sebzés'
    default:
      return ''
  }
}

export function applyReward(
  collection: PlayerCardState[],
  cardId: string,
  type: DungeonType
): PlayerCardState[] {
  return collection.map((card) => {
    if (card.cardId !== cardId) {
      return card
    }
    if (type === 'encounter') {
      return { ...card, damage: card.damage + 1 }
    }
    if (type === 'minor') {
      return { ...card, health: card.health + 2 }
    }
    if (type === 'major') {
      return { ...card, damage: card.damage + 3 }
    }
    return card
  })
}
