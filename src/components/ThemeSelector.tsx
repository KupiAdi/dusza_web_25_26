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

  const wrapperClass = `dropdown-wrapper ${size === 'small' ? 'dropdown-small' : 'dropdown-medium'} ${className || ''}`

  return (
    <div className={wrapperClass}>
      {showLabel && <label htmlFor="theme-selector">{t('theme.label')}</label>}
      <select
        id="theme-selector"
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
        aria-label={showLabel ? undefined : t('theme.label')}
        className="header-dropdown"
      >
        <option value="auto">{t('theme.options.auto')}</option>
        <option value="light">{t('theme.options.light')}</option>
        <option value="dark">{t('theme.options.dark')}</option>
      </select>
    </div>
  )
}

