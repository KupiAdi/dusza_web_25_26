import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../services/api'
import { useAuth } from './AuthContext'

export type TutorialStep = 'session' | 'card' | 'battle' | 'complete'

interface TutorialContextValue {
  isActive: boolean
  currentStep: TutorialStep
  isStepComplete: boolean
  startTutorial: () => void
  nextStep: () => void
  skipTutorial: () => void
  completeTutorial: () => void
  markStepComplete: () => void
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined)

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState<TutorialStep>('session')
  const [isStepComplete, setIsStepComplete] = useState(false)

  // Check if tutorial should be shown
  useEffect(() => {
    if (user && user.tutorialCompleted === false) {
      // Auto-start tutorial for new users
      setIsActive(true)
      setCurrentStep('session')
      setIsStepComplete(false)
    } else {
      setIsActive(false)
    }
  }, [user])

  // Reset step completion when step changes
  useEffect(() => {
    setIsStepComplete(false)

    // Auto-complete the final step
    if (currentStep === 'complete') {
      setIsStepComplete(true)
    }
  }, [currentStep])

  const startTutorial = () => {
    setIsActive(true)
    setCurrentStep('session')
    setIsStepComplete(false)
  }

  const markStepComplete = () => {
    setIsStepComplete(true)
  }

  const nextStep = () => {
    if (!isStepComplete && currentStep !== 'complete') {
      return
    }

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
        isStepComplete,
        startTutorial,
        nextStep,
        skipTutorial,
        completeTutorial,
        markStepComplete,
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

