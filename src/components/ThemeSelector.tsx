import { useTheme, type Theme } from '../state/ThemeContext'
import { useTranslation } from '../state/LanguageContext'

interface ThemeSelectorProps {
  className?: string
  showLabel?: boolean
}

const themeIcons: Record<Theme, string> = {
  auto: '⚙️',
  light: '☀️',
  dark: '🌙'
}

export function ThemeSelector({ className, showLabel = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  const themes: Theme[] = ['auto', 'light', 'dark']
  
  const cycleTheme = () => {
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`icon-button ${className || ''}`}
      aria-label={t('theme.label')}
      title={t('theme.label') + ': ' + t(`theme.options.${theme}`)}
    >
      <span className="icon-button-icon">{themeIcons[theme]}</span>
      {showLabel && <span className="icon-button-label">{t(`theme.options.${theme}`)}</span>}
    </button>
  )
}

