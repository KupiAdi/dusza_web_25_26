import { useEffect, useState } from 'react'
import type { BattleResult, GameEnvironment } from '../types'
import { CardPreview } from './CardPreview'
import './BattleScene.css'

interface BattleSceneProps {
  result: BattleResult
  environment: GameEnvironment
  onComplete: () => void
}

type AnimationPhase = 'intro' | 'round-setup' | 'clash' | 'round-result' | 'complete'

export function BattleScene({ result, environment, onComplete }: BattleSceneProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('intro')
  const [playerScore, setPlayerScore] = useState(0)
  const [dungeonScore, setDungeonScore] = useState(0)

  const currentRound = result.rounds[currentRoundIndex]
  const isLastRound = currentRoundIndex === result.rounds.length - 1

  useEffect(() => {
    let timer: number

    switch (phase) {
      case 'intro':
        // Show intro for 1.5 seconds
        timer = window.setTimeout(() => {
          setPhase('round-setup')
        }, 1500)
        break

      case 'round-setup':
        // Setup round for 1 second
        timer = window.setTimeout(() => {
          setPhase('clash')
        }, 1000)
        break

      case 'clash':
        // Clash animation for 2 seconds
        timer = window.setTimeout(() => {
          setPhase('round-result')
          // Update scores
          if (currentRound.winner === 'player') {
            setPlayerScore((prev) => prev + 1)
          } else {
            setDungeonScore((prev) => prev + 1)
          }
        }, 2000)
        break

      case 'round-result':
        // Show result for 3 seconds (increased from 1.5s to allow reading)
        timer = window.setTimeout(() => {
          if (isLastRound) {
            setPhase('complete')
          } else {
            setCurrentRoundIndex((prev) => prev + 1)
            setPhase('round-setup')
          }
        }, 3000)
        break

      case 'complete':
        // Show final result for 2 seconds, then close
        timer = window.setTimeout(() => {
          onComplete()
        }, 2500)
        break
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [phase, currentRoundIndex, isLastRound, currentRound, onComplete])

  if (!currentRound) {
    return null
  }

  const playerCard = environment.worldCards.find((c) => c.id === currentRound.playerCardId)
  const dungeonCard = environment.worldCards.find((c) => c.id === currentRound.dungeonCardId)

  if (!playerCard || !dungeonCard) {
    return null
  }

  const dungeon = environment.dungeons.find((d) => d.id === result.dungeonId)

  return (
    <div className="battle-scene">
      <div className="battle-scene__overlay" />
      
      {/* Skip button */}
      <button 
        type="button" 
        className="battle-skip-button"
        onClick={onComplete}
        aria-label="Harc átugrása"
      >
        Átugrás →
      </button>
      
      <div className="battle-scene__content">
        {/* Final Result Screen */}
        {phase === 'complete' && (
          <div className={`battle-final-result ${result.playerVictory ? 'victory' : 'defeat'}`}>
            <div className="final-result-content">
              <div className="final-result-icon">
                {result.playerVictory ? '🏆' : '💀'}
              </div>
              <h1 className="final-result-title">
                {result.playerVictory ? 'GYŐZELEM!' : 'VERESÉG'}
              </h1>
              <div className="final-result-score">
                <span className="final-score-player">{playerScore}</span>
                <span className="final-score-separator">-</span>
                <span className="final-score-dungeon">{dungeonScore}</span>
              </div>
              <p className="final-result-subtitle">
                {result.playerVictory 
                  ? 'Legyőzted a kazamatát!' 
                  : 'A kazamata túl erős volt...'}
              </p>
              <p className="final-result-dungeon">{dungeon?.name}</p>
            </div>
          </div>
        )}

        {/* Header with scores */}
        {phase !== 'complete' && (
          <div className="battle-scene__header">
            <div className="battle-score battle-score--player">
              <span className="battle-score__label">Játékos</span>
              <span className="battle-score__value">{playerScore}</span>
            </div>
            
            <div className="battle-round-indicator">
              {phase === 'intro' ? (
                <div className="battle-title">
                  <h2>Harc kezdődik!</h2>
                  <p>{dungeon?.name}</p>
                </div>
              ) : (
                <>
                  <span className="round-label">Kör</span>
                  <span className="round-number">{currentRound.round}</span>
                </>
              )}
            </div>
            
            <div className="battle-score battle-score--dungeon">
              <span className="battle-score__label">Kazamata</span>
              <span className="battle-score__value">{dungeonScore}</span>
            </div>
          </div>
        )}

        {/* Battle Arena */}
        {phase !== 'intro' && phase !== 'complete' && (
          <div className="battle-arena">
            {/* Player Card */}
            <div className={`battle-card battle-card--player ${phase === 'clash' ? 'is-attacking' : ''} ${phase === 'round-result' && currentRound.winner === 'player' ? 'is-winner' : ''} ${phase === 'round-result' && currentRound.winner === 'dungeon' ? 'is-loser' : ''}`}>
              <CardPreview card={playerCard} accent="collection" />
            </div>

            {/* VS Indicator */}
            <div className={`battle-vs ${phase === 'clash' ? 'is-clashing' : ''}`}>
              <span>⚔️</span>
              <span className="vs-text">VS</span>
              <span>⚔️</span>
            </div>

            {/* Dungeon Card */}
            <div className={`battle-card battle-card--dungeon ${phase === 'clash' ? 'is-attacking' : ''} ${phase === 'round-result' && currentRound.winner === 'dungeon' ? 'is-winner' : ''} ${phase === 'round-result' && currentRound.winner === 'player' ? 'is-loser' : ''}`}>
              <CardPreview card={dungeonCard} accent="dungeon" />
            </div>
          </div>
        )}

        {/* Round Result Message */}
        {phase === 'round-result' && (
          <div className={`battle-result-message ${currentRound.winner === 'player' ? 'victory' : 'defeat'}`}>
            <p className="result-winner">{currentRound.winner === 'player' ? 'Játékos nyert!' : 'Kazamata nyert!'}</p>
            <p className="result-reason">{currentRound.reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

