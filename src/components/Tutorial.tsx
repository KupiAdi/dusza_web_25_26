import { useEffect, useRef, useState } from 'react'
import { useTutorial } from '../state/TutorialContext'
import { useTranslation } from '../state/LanguageContext'
import './Tutorial.css'

export function Tutorial() {
  const { isActive, currentStep, isStepComplete, nextStep, skipTutorial } = useTutorial()
  const { t } = useTranslation()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!isActive) {
      setShowTooltip(false)
      return
    }

    // Wait a bit before showing tooltip to let the page render
    const initTimer = setTimeout(() => {
      updateTargetPosition()
      setShowTooltip(true)
    }, 500)

    return () => clearTimeout(initTimer)
  }, [isActive, currentStep])

  useEffect(() => {
    if (!isActive) return

    // Update target position on resize and scroll
    const updatePosition = () => {
      updateTargetPosition()
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    const interval = setInterval(updatePosition, 1000)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      clearInterval(interval)
    }
  }, [isActive, currentStep])

  const updateTargetPosition = () => {
    let selector = ''
    
    switch (currentStep) {
      case 'session':
        selector = '[data-tutorial-target="session-form"]'
        break
      case 'card':
        // Target both the first available card and the deck area
        const firstCard = document.querySelector('[data-tutorial-target="deck-collection"] .draggable-card:not(.is-disabled)')
        const deckArea = document.querySelector('[data-tutorial-target="deck-area"]')
        
        if (firstCard && deckArea) {
          const cardRect = firstCard.getBoundingClientRect()
          const deckRect = deckArea.getBoundingClientRect()
          
          // Create a combined rect that includes both elements
          const combinedRect = new DOMRect(
            Math.min(cardRect.left, deckRect.left),
            Math.min(cardRect.top, deckRect.top),
            Math.max(cardRect.right, deckRect.right) - Math.min(cardRect.left, deckRect.left),
            Math.max(cardRect.bottom, deckRect.bottom) - Math.min(cardRect.top, deckRect.top)
          )
          
          setTargetRect(combinedRect)
          return
        }
        selector = '[data-tutorial-target="deck-collection"]'
        break
      case 'battle':
        // Target the first dungeon instead of a specific one
        selector = '.dungeon-list li:first-child'
        break
      case 'complete':
        setTargetRect(null)
        return
    }

    const element = document.querySelector(selector)
    if (element) {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)
    } else {
      setTargetRect(null)
    }
  }

  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTutorial()
      } else if (e.key === 'Enter') {
        nextStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, skipTutorial, nextStep])

  if (!isActive) return null

  const getStepContent = () => {
    switch (currentStep) {
      case 'session':
        return {
          title: t('tutorial.step1.title'),
          description: t('tutorial.step1.description'),
        }
      case 'card':
        return {
          title: t('tutorial.step2.title'),
          description: t('tutorial.step2.description'),
        }
      case 'battle':
        return {
          title: t('tutorial.step3.title'),
          description: t('tutorial.step3.description'),
        }
      case 'complete':
        return {
          title: t('tutorial.step4.title'),
          description: t('tutorial.step4.description'),
        }
    }
  }

  const stepContent = getStepContent()
  const isLastStep = currentStep === 'complete'
  const canProceed = isStepComplete || isLastStep

  return (
    <div className="tutorial-overlay">
      {/* Backdrop with spotlight cutout */}
      {targetRect && (
        <>
          <div
            className="tutorial-spotlight-cutout"
            style={{
              left: `${targetRect.left - 10}px`,
              top: `${targetRect.top - 10}px`,
              width: `${targetRect.width + 20}px`,
              height: `${targetRect.height + 20}px`,
            }}
          />
          <div
            className="tutorial-spotlight-border"
            style={{
              left: `${targetRect.left - 10}px`,
              top: `${targetRect.top - 10}px`,
              width: `${targetRect.width + 20}px`,
              height: `${targetRect.height + 20}px`,
            }}
          />
        </>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={`tutorial-tooltip ${!targetRect ? 'tutorial-tooltip-center' : ''}`}
          style={
            targetRect
              ? {
                  top: `${targetRect.bottom + 20}px`,
                  left: `${Math.max(20, Math.min(window.innerWidth - 420, targetRect.left + targetRect.width / 2 - 200))}px`,
                }
              : undefined
          }
        >
          <div className="tutorial-tooltip-content">
            <h3 className="tutorial-tooltip-title">{stepContent.title}</h3>
            <p className="tutorial-tooltip-description">{stepContent.description}</p>
            <div className="tutorial-tooltip-actions">
              <button
                type="button"
                className="tutorial-button tutorial-button-secondary"
                onClick={skipTutorial}
              >
                {t('tutorial.skip')}
              </button>
              {isLastStep ? (
                <button
                  type="button"
                  className="tutorial-button tutorial-button-primary"
                  onClick={nextStep}
                >
                  {t('tutorial.finish')}
                </button>
              ) : (
                <button
                  type="button"
                  className="tutorial-button tutorial-button-primary"
                  onClick={nextStep}
                  disabled={!canProceed}
                >
                  {t('tutorial.next')} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

