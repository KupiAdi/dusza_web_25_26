import { useTranslation } from '../state/LanguageContext'
import type { Language } from '../i18n/translations'

interface LanguageSelectorProps {
  className?: string
  showLabel?: boolean
  size?: 'small' | 'medium'
}

export function LanguageSelector({ className, showLabel = false, size = 'medium' }: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages, t } = useTranslation()

  return (
    <label
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: showLabel ? 'column' : 'row',
        alignItems: showLabel ? 'flex-start' : 'center',
        gap: '0.25rem',
        fontSize: size === 'small' ? '0.85rem' : '1rem',
      }}
    >
      {showLabel && <span>{t('language.label')}</span>}
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={showLabel ? undefined : t('language.label')}
        style={{
          padding: size === 'small' ? '0.25rem 0.5rem' : '0.4rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          background: 'rgba(0, 0, 0, 0.2)',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        {availableLanguages.map((option) => (
          <option key={option.code} value={option.code}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  )
}

