import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../state/LanguageContext'
import type { Language } from '../i18n/translations'

interface LanguageSelectorProps {
  className?: string
  showLabel?: boolean
}

export function LanguageSelector({ className, showLabel = false }: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (code: Language) => {
    setLanguage(code)
    setIsOpen(false)
  }

  return (
    <div className={`custom-dropdown ${className || ''}`} ref={dropdownRef}>
      {showLabel && <label>{t('language.label')}</label>}
      <button
        type="button"
        className="icon-button custom-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('language.label')}
        aria-expanded={isOpen}
      >
        <span className="icon-button-icon">🌐</span>
        <span className="custom-dropdown-value">{language.toUpperCase()}</span>
        <span className="custom-dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="custom-dropdown-menu">
          {availableLanguages.map((option) => (
            <button
              key={option.code}
              type="button"
              className={`custom-dropdown-item ${option.code === language ? 'active' : ''}`}
              onClick={() => handleSelect(option.code as Language)}
            >
              <span className="custom-dropdown-item-code">{option.code.toUpperCase()}</span>
              <span className="custom-dropdown-item-name">{t(option.labelKey)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

