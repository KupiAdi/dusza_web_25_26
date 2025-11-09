import { useEffect, useState, useRef } from 'react'
import type { BattleResult, GameEnvironment, PlayerCardState } from '../types'
import { CardPreview } from './CardPreview'
import { getRewardDescriptorKey } from '../utils/rewards'
import { useTranslation } from '../state/LanguageContext'
import './BattleScene.css'

interface BattleSceneProps {
  result: BattleResult
  environment: GameEnvironment
  playerCards: PlayerCardState[]
  onComplete: () => void
  onRewardSelected: (cardId: string) => void
}

type AnimationPhase = 'intro' | 'round-setup' | 'clash' | 'round-result' | 'complete' | 'reward-selection'

export function BattleScene({ result, environment, playerCards, onComplete, onRewardSelected }: BattleSceneProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('intro')
  const [playerScore, setPlayerScore] = useState(0)
  const [dungeonScore, setDungeonScore] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const currentRound = result.rounds[currentRoundIndex]
  const isLastRound = currentRoundIndex === result.rounds.length - 1

  // Battle music management
  useEffect(() => {
    // Epic battle music - using a working free music URL
    // This is "Epic Cinematic" from Pixabay - royalty free
    const battleMusicUrl = '/audio/battle.mp3'
    
    if (!audioRef.current) {
      audioRef.current = new Audio(battleMusicUrl)
      audioRef.current.loop = true
      audioRef.current.volume = 0.1 // 40% volume so it doesn't overpower
    }

    // Start playing when component mounts
    const playPromise = audioRef.current.play()
    
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // Auto-play was prevented, that's ok
        console.log('Audio autoplay prevented:', error)
      })
    }

    // Cleanup: stop music when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [])

  // Handle mute/unmute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 0.1
    }
  }, [isMuted])

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

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
        // Show final result for 2.5 seconds, then go to reward selection or close
        timer = window.setTimeout(() => {
          if (result.playerVictory) {
            setPhase('reward-selection')
          } else {
            onComplete()
          }
        }, 2500)
        break
      
      case 'reward-selection':
        // Wait for user to select a card
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

  // Get the actual player card stats from their collection
  const playerCardState = playerCards.find((c) => c.cardId === currentRound.playerCardId)
  const playerDamage = playerCardState ? playerCard.damage + playerCardState.damageBonus : playerCard.damage
  const playerHealth = playerCardState ? playerCard.health + playerCardState.healthBonus : playerCard.health

  const dungeon = environment.dungeons.find((d) => d.id === result.dungeonId)
  const rewardDescriptorKey = dungeon ? getRewardDescriptorKey(dungeon.type) : ''
  const rewardDescriptor = rewardDescriptorKey ? t(rewardDescriptorKey) : ''

  const translateRoundReason = () => {
    if (!currentRound.reasonKey) {
      return currentRound.reason
    }
    const baseParams = { ...(currentRound.reasonParams ?? {}) }
    if (
      currentRound.reasonParams &&
      'playerElement' in currentRound.reasonParams &&
      typeof currentRound.reasonParams.playerElement === 'string'
    ) {
      baseParams.playerElementName = t(`elements.${currentRound.reasonParams.playerElement}`)
      delete (baseParams as any).playerElement
    }
    if (
      currentRound.reasonParams &&
      'dungeonElement' in currentRound.reasonParams &&
      typeof currentRound.reasonParams.dungeonElement === 'string'
    ) {
      baseParams.dungeonElementName = t(`elements.${currentRound.reasonParams.dungeonElement}`)
      delete (baseParams as any).dungeonElement
    }
    return t(currentRound.reasonKey, baseParams)
  }

  const handleSkip = () => {
    if (result.playerVictory) {
      setPhase('reward-selection')
    } else {
      onComplete()
    }
  }

  const handleRewardSelection = (cardId: string) => {
    onRewardSelected(cardId)
    onComplete()
  }

  return (
    <div className="battle-scene">
      <div className="battle-scene__overlay" />
      
      {/* Skip button - only show before reward selection */}
      {phase !== 'reward-selection' && (
        <button 
          type="button" 
          className="battle-skip-button"
          onClick={handleSkip}
          aria-label={t('battle.skip')}
        >
          {t('battle.skipCta')}
        </button>
      )}
      
      {/* Mute button */}
      <button 
        type="button" 
        className="battle-mute-button"
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Hang be' : 'Némítás'}
      >
        {isMuted ? '🔇' : '🔊'}
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
                {result.playerVictory ? t('battle.victoryTitle') : t('battle.defeatTitle')}
              </h1>
              <div className="final-result-score">
                <span className="final-score-player">{playerScore}</span>
                <span className="final-score-separator">-</span>
                <span className="final-score-dungeon">{dungeonScore}</span>
              </div>
              <p className="final-result-subtitle">
                {result.playerVictory
                  ? t('battle.victorySubtitle')
                  : t('battle.defeatSubtitle')}
              </p>
              <p className="final-result-dungeon">{dungeon?.name}</p>
            </div>
          </div>
        )}

        {/* Header with scores */}
        {phase !== 'complete' && phase !== 'reward-selection' && (
          <div className="battle-scene__header">
            <div className="battle-score battle-score--player">
              <span className="battle-score__label">{t('battle.playerLabel')}</span>
              <span className="battle-score__value">{playerScore}</span>
            </div>
            
            <div className="battle-round-indicator">
              {phase === 'intro' ? (
                <div className="battle-title">
                  <h2>{t('battle.introTitle')}</h2>
                  <p>{dungeon?.name}</p>
                </div>
              ) : (
                <>
                  <span className="round-label">{t('battle.roundLabel')}</span>
                  <span className="round-number">{currentRound.round}</span>
                </>
              )}
            </div>
            
            <div className="battle-score battle-score--dungeon">
              <span className="battle-score__label">{t('battle.dungeonLabel')}</span>
              <span className="battle-score__value">{dungeonScore}</span>
            </div>
          </div>
        )}

        {/* Battle Arena */}
        {phase !== 'intro' && phase !== 'complete' && phase !== 'reward-selection' && (
          <div className="battle-arena">
            {/* Player Card */}
            <div className={`battle-card battle-card--player ${phase === 'clash' ? 'is-attacking' : ''} ${phase === 'round-result' && currentRound.winner === 'player' ? 'is-winner' : ''} ${phase === 'round-result' && currentRound.winner === 'dungeon' ? 'is-loser' : ''}`}>
              <CardPreview 
                card={playerCard} 
                damage={playerDamage}
                health={playerHealth}
                accent="collection" 
              />
            </div>

            {/* VS Indicator */}
            <div className={`battle-vs ${phase === 'clash' ? 'is-clashing' : ''}`}>
              <span>⚔️</span>
              <span className="vs-text">{t('battle.vs')}</span>
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
            <p className="result-winner">
              {currentRound.winner === 'player' ? t('battle.roundVictory') : t('battle.roundDefeat')}
            </p>
            <p className="result-reason">{translateRoundReason()}</p>
          </div>
        )}

        {/* Reward Selection */}
        {phase === 'reward-selection' && (
          <div className="battle-reward-selection">
            <div className="reward-selection-header">
              <h2 className="reward-title">{t('battle.rewardTitle')}</h2>
              {dungeon && (
                <p className="reward-subtitle">
                  {t('battle.rewardSubtitle', { dungeon: dungeon.name, reward: rewardDescriptor })}
                </p>
              )}
              <p className="reward-hint">{t('battle.rewardHint')}</p>
            </div>
            
            <div className="reward-card-grid">
              {playerCards.map((cardState) => {
                const worldCard = environment.worldCards.find((c) => c.id === cardState.cardId)
                if (!worldCard) return null
                
                return (
                  <button
                    key={cardState.cardId}
                    type="button"
                    className="reward-card-button"
                    onClick={() => handleRewardSelection(cardState.cardId)}
                  >
                    <CardPreview
                      card={worldCard}
                      damage={worldCard.damage + cardState.damageBonus}
                      health={worldCard.health + cardState.healthBonus}
                      accent="reward"
                      highlight
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

