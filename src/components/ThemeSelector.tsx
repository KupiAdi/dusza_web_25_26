import { useTheme, type Theme } from '../state/ThemeContext'
import { useTranslation } from '../state/LanguageContext'

interface ThemeSelectorProps {
  className?: string
  showLabel?: boolean
  size?: 'small' | 'medium'
}

export function ThemeSelector({ className, showLabel = false, size = 'medium' }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

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
      {showLabel && <span>{t('theme.label')}</span>}
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
        aria-label={showLabel ? undefined : t('theme.label')}
        style={{
          padding: size === 'small' ? '0.25rem 0.5rem' : '0.4rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          background: 'rgba(0, 0, 0, 0.2)',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <option value="auto">{t('theme.options.auto')}</option>
        <option value="light">{t('theme.options.light')}</option>
        <option value="dark">{t('theme.options.dark')}</option>
      </select>
    </label>
  )
}

