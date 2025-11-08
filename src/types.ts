export const ELEMENTS = ['earth', 'water', 'air', 'fire'] as const
export type Element = (typeof ELEMENTS)[number]

export type CardKind = 'standard' | 'leader'

export type DungeonType = 'encounter' | 'minor' | 'major'

export interface WorldCard {
  id: string
  name: string
  damage: number
  health: number
  element: Element
  kind: CardKind
  sourceCardId?: string
  backgroundImage?: string
}

export interface Dungeon {
  id: string
  name: string
  type: DungeonType
  cardOrder: string[]
}

export interface GameEnvironment {
  id: string
  name: string
  worldCards: WorldCard[]
  dungeons: Dungeon[]
}

export interface PlayerCardState {
  cardId: string
  damage: number
  health: number
}

export interface DeckEntry {
  cardId: string
}

export interface BattleRoundResult {
  round: number
  playerCardId: string
  dungeonCardId: string
  winner: 'player' | 'dungeon'
  reason: string
  reasonKey?: string
  reasonParams?: Record<string, string | number>
}

export interface BattleResult {
  dungeonId: string
  playerWins: number
  dungeonWins: number
  rounds: BattleRoundResult[]
  playerVictory: boolean
  timestamp: number
}

export interface PlayerProfile {
  id: string
  name: string
  environmentId: string
  collection: PlayerCardState[]
  deck: DeckEntry[]
  battleHistory: BattleResult[]
}
