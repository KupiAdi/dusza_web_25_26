import type { DungeonType, PlayerCardState } from '../types'

export function getRewardDescriptorKey(type: DungeonType): string {
  switch (type) {
    case 'encounter':
      return 'rewards.descriptor.encounter'
    case 'minor':
      return 'rewards.descriptor.minor'
    case 'major':
      return 'rewards.descriptor.major'
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
      return { ...card, damageBonus: card.damageBonus + 1 }
    }
    if (type === 'minor') {
      return { ...card, healthBonus: card.healthBonus + 2 }
    }
    if (type === 'major') {
      return { ...card, damageBonus: card.damageBonus + 3 }
    }
    return card
  })
}
