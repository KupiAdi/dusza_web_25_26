import { useTranslation } from '../state/LanguageContext'
import type { Language } from '../i18n/translations'

interface LanguageSelectorProps {
  className?: string
  showLabel?: boolean
  size?: 'small' | 'medium'
}

export function LanguageSelector({ className, showLabel = false, size = 'medium' }: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages, t } = useTranslation()

  const wrapperClass = `dropdown-wrapper ${size === 'small' ? 'dropdown-small' : 'dropdown-medium'} ${className || ''}`

  return (
    <div className={wrapperClass}>
      {showLabel && <label htmlFor="language-selector">{t('language.label')}</label>}
      <select
        id="language-selector"
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={showLabel ? undefined : t('language.label')}
        className="header-dropdown"
      >
        {availableLanguages.map((option) => (
          <option key={option.code} value={option.code}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  )
}

