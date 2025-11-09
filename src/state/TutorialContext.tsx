import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../services/api'
import { useAuth } from './AuthContext'

export type TutorialStep = 'session' | 'card' | 'battle' | 'complete'

interface TutorialContextValue {
  isActive: boolean
  currentStep: TutorialStep
  startTutorial: () => void
  nextStep: () => void
  skipTutorial: () => void
  completeTutorial: () => void
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined)

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState<TutorialStep>('session')

  // Check if tutorial should be shown
  useEffect(() => {
    if (user && user.tutorialCompleted === false) {
      // Auto-start tutorial for new users
      setIsActive(true)
      setCurrentStep('session')
    } else {
      setIsActive(false)
    }
  }, [user])

  const startTutorial = () => {
    setIsActive(true)
    setCurrentStep('session')
  }

  const nextStep = () => {
    switch (currentStep) {
      case 'session':
        setCurrentStep('card')
        break
      case 'card':
        setCurrentStep('battle')
        break
      case 'battle':
        setCurrentStep('complete')
        break
      case 'complete':
        completeTutorial()
        break
    }
  }

  const skipTutorial = async () => {
    setIsActive(false)
    try {
      await api.markTutorialCompleted()
    } catch (error) {
      console.error('Failed to mark tutorial as completed:', error)
    }
  }

  const completeTutorial = async () => {
    setIsActive(false)
    setCurrentStep('session')
    try {
      await api.markTutorialCompleted()
    } catch (error) {
      console.error('Failed to mark tutorial as completed:', error)
    }
  }

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        startTutorial,
        nextStep,
        skipTutorial,
        completeTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider')
  }
  return context
}

