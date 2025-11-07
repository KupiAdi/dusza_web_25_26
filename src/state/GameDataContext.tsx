import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { defaultEnvironment } from '../data/defaultEnvironment'
import type {
  GameEnvironment,
  PlayerProfile,
  PlayerCardState,
  BattleResult,
  DeckEntry,
} from '../types'

interface GameState {
  environments: GameEnvironment[]
  players: PlayerProfile[]
}

const STORAGE_KEY = 'damareen-game-data-v1'

const initialState: GameState = {
  environments: [defaultEnvironment],
  players: [],
}

type GameAction =
  | { type: 'add-environment'; payload: GameEnvironment }
  | { type: 'update-environment'; payload: GameEnvironment }
  | { type: 'remove-environment'; payload: string }
  | { type: 'add-player'; payload: PlayerProfile }
  | {
      type: 'update-player'
      payload: {
        id: string
        collection?: PlayerCardState[]
        deck?: DeckEntry[]
        battleHistory?: BattleResult[]
        name?: string
      }
    }
  | { type: 'remove-player'; payload: string }

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'add-environment': {
      const exists = state.environments.some((env) => env.id === action.payload.id)
      const environments = exists
        ? state.environments.map((env) =>
            env.id === action.payload.id ? action.payload : env
          )
        : [...state.environments, action.payload]
      return { ...state, environments }
    }
    case 'update-environment': {
      const environments = state.environments.map((env) =>
        env.id === action.payload.id ? action.payload : env
      )
      return { ...state, environments }
    }
    case 'remove-environment': {
      return {
        ...state,
        environments: state.environments.filter((env) => env.id !== action.payload),
        players: state.players.filter((player) => player.environmentId !== action.payload),
      }
    }
    case 'add-player': {
      const exists = state.players.some((player) => player.id === action.payload.id)
      const players = exists
        ? state.players.map((player) =>
            player.id === action.payload.id ? action.payload : player
          )
        : [...state.players, action.payload]
      return { ...state, players }
    }
    case 'update-player': {
      const players = state.players.map((player) => {
        if (player.id !== action.payload.id) {
          return player
        }
        return {
          ...player,
          name: action.payload.name ?? player.name,
          collection: action.payload.collection ?? player.collection,
          deck: action.payload.deck ?? player.deck,
          battleHistory: action.payload.battleHistory ?? player.battleHistory,
        }
      })
      return { ...state, players }
    }
    case 'remove-player': {
      return { ...state, players: state.players.filter((p) => p.id !== action.payload) }
    }
    default:
      return state
  }
}

interface GameDataContextValue extends GameState {
  addEnvironment: (environment: GameEnvironment) => void
  updateEnvironment: (environment: GameEnvironment) => void
  removeEnvironment: (environmentId: string) => void
  addPlayer: (player: PlayerProfile) => void
  updatePlayer: (
    playerId: string,
    updates: Partial<Omit<PlayerProfile, 'id' | 'environmentId'>>
  ) => void
  removePlayer: (playerId: string) => void
}

const GameDataContext = createContext<GameDataContextValue | undefined>(undefined)

function loadStateFromStorage(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return initialState
    }
    const parsed = JSON.parse(raw) as GameState
    if (!parsed.environments.length) {
      return initialState
    }
    return parsed
  } catch (err) {
    console.warn('Falling back to initial game state', err)
    return initialState
  }
}

export function GameDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    if (typeof window === 'undefined') {
      return initialState
    }
    return loadStateFromStorage()
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<GameDataContextValue>(
    () => ({
      ...state,
      addEnvironment: (environment) =>
        dispatch({ type: 'add-environment', payload: environment }),
      updateEnvironment: (environment) =>
        dispatch({ type: 'update-environment', payload: environment }),
      removeEnvironment: (environmentId) =>
        dispatch({ type: 'remove-environment', payload: environmentId }),
      addPlayer: (player) => dispatch({ type: 'add-player', payload: player }),
      updatePlayer: (playerId, updates) =>
        dispatch({ type: 'update-player', payload: { id: playerId, ...updates } }),
      removePlayer: (playerId) =>
        dispatch({ type: 'remove-player', payload: playerId }),
    }),
    [state]
  )

  return <GameDataContext.Provider value={value}>{children}</GameDataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGameData() {
  const ctx = useContext(GameDataContext)
  if (!ctx) {
    throw new Error('useGameData must be used within GameDataProvider')
  }
  return ctx
}
