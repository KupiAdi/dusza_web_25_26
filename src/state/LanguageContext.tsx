import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  LANGUAGE_OPTIONS,
  translations,
  type Language,
  type TranslationDictionary,
} from '../i18n/translations'

type TranslationParams = Record<string, string | number | undefined>

interface LanguageContextValue {
  language: Language
  availableLanguages: typeof LANGUAGE_OPTIONS
  setLanguage: (language: Language) => void
  t: (key: string, params?: TranslationParams) => string
}

const STORAGE_KEY = 'damareen:language'

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function isTranslationDictionary(value: unknown): value is TranslationDictionary {
  return typeof value === 'object' && value !== null
}

function resolveTranslationValue(language: Language, key: string): string | undefined {
  const segments = key.split('.')
  let current: unknown = translations[language]

  for (const segment of segments) {
    if (!isTranslationDictionary(current)) {
      return undefined
    }
    current = current[segment]
    if (current === undefined) {
      return undefined
    }
  }

  if (typeof current === 'string') {
    return current
  }

  return undefined
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => {
    const value = params[token]
    return value === undefined || value === null ? '' : String(value)
  })
}

function createFallbackChain(language: Language): Language[] {
  const baseOrder: Language[] = ['en', 'hu', 'de']
  if (!baseOrder.includes(language)) {
    return ['hu', 'en', 'de']
  }
  return [language, ...baseOrder.filter((code) => code !== language)]
}

function getTranslation(language: Language, key: string): string | undefined {
  const candidates = createFallbackChain(language)
  for (const candidate of candidates) {
    const value = resolveTranslationValue(candidate, key)
    if (value) {
      return value
    }
  }
  return undefined
}

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'hu'
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'hu' || stored === 'en' || stored === 'de') {
    return stored
  }
  return 'hu'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readStoredLanguage)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language)
    }
  }, [language])

  const setLanguageSafe = useCallback((code: Language) => {
    setLanguage(code)
  }, [])

  const translate = useCallback(
    (key: string, params?: TranslationParams) => {
      const template = getTranslation(language, key) ?? key
      return interpolate(template, params)
    },
    [language]
  )

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      availableLanguages: LANGUAGE_OPTIONS,
      setLanguage: setLanguageSafe,
      t: translate,
    }),
    [language, setLanguageSafe, translate]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider')
  }
  return context
}

