import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../services/api'
import type {
  GameEnvironment,
  PlayerProfile,
  PlayerCardState,
  DeckEntry,
  BattleHistoryEntry,
} from '../types'

interface GameState {
  environments: GameEnvironment[]
  players: PlayerProfile[]
}

const initialState: GameState = {
  environments: [],
  players: [],
}

type GameAction =
  | { type: 'set-environments'; payload: GameEnvironment[] }
  | { type: 'set-players'; payload: PlayerProfile[] }
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
        battleHistory?: BattleHistoryEntry[]
        name?: string
      }
    }
  | { type: 'remove-player'; payload: string }

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'set-environments': {
      return { ...state, environments: action.payload }
    }
    case 'set-players': {
      return { ...state, players: action.payload }
    }
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
  isLoading: boolean
  addEnvironment: (environment: GameEnvironment) => Promise<void>
  updateEnvironment: (environment: GameEnvironment) => Promise<void>
  removeEnvironment: (environmentId: string) => Promise<void>
  addPlayer: (player: PlayerProfile) => Promise<void>
  updatePlayer: (
    playerId: string,
    updates: Partial<Omit<PlayerProfile, 'id' | 'environmentId'>>
  ) => Promise<void>
  removePlayer: (playerId: string) => Promise<void>
  refreshData: () => Promise<void>
}

const GameDataContext = createContext<GameDataContextValue | undefined>(undefined)

export function GameDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [isLoading, setIsLoading] = useState(true)

  const refreshData = async () => {
    try {
      setIsLoading(true)
      const [envResponse, playerResponse] = await Promise.all([
        api.getEnvironments(),
        api.getPlayers(),
      ])
      dispatch({ type: 'set-environments', payload: envResponse.environments })
      dispatch({ type: 'set-players', payload: playerResponse.players })
    } catch (error) {
      console.error('Failed to load game data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  const addEnvironment = async (environment: GameEnvironment) => {
    try {
      await api.saveEnvironment(environment)
      dispatch({ type: 'add-environment', payload: environment })
    } catch (error) {
      console.error('Failed to add environment:', error)
      throw error
    }
  }

  const updateEnvironment = async (environment: GameEnvironment) => {
    try {
      await api.saveEnvironment(environment)
      dispatch({ type: 'update-environment', payload: environment })
    } catch (error) {
      console.error('Failed to update environment:', error)
      throw error
    }
  }

  const removeEnvironment = async (environmentId: string) => {
    try {
      await api.deleteEnvironment(environmentId)
      dispatch({ type: 'remove-environment', payload: environmentId })
    } catch (error) {
      console.error('Failed to remove environment:', error)
      throw error
    }
  }

  const addPlayer = async (player: PlayerProfile) => {
    try {
      await api.createPlayer(player)
      dispatch({ type: 'add-player', payload: player })
    } catch (error) {
      console.error('Failed to add player:', error)
      throw error
    }
  }

  const updatePlayer = async (
    playerId: string,
    updates: Partial<Omit<PlayerProfile, 'id' | 'environmentId'>>
  ) => {
    try {
      await api.updatePlayer(playerId, updates)
      dispatch({ type: 'update-player', payload: { id: playerId, ...updates } })
    } catch (error) {
      console.error('Failed to update player:', error)
      throw error
    }
  }

  const removePlayer = async (playerId: string) => {
    try {
      await api.deletePlayer(playerId)
      dispatch({ type: 'remove-player', payload: playerId })
    } catch (error) {
      console.error('Failed to remove player:', error)
      throw error
    }
  }

  const value = useMemo<GameDataContextValue>(
    () => ({
      ...state,
      isLoading,
      addEnvironment,
      updateEnvironment,
      removeEnvironment,
      addPlayer,
      updatePlayer,
      removePlayer,
      refreshData,
    }),
    [state, isLoading]
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
