import type { CSSProperties, ReactNode } from 'react'
import type { WorldCard } from '../types'

const ELEMENT_THEME: Record<WorldCard['element'], {
  label: string
  emoji: string
  primary: string
  secondary: string
  glow: string
}> = {
  fire: { label: 'Tűz', emoji: '🔥', primary: '#f97316', secondary: '#ef4444', glow: 'rgba(239, 68, 68, 0.35)' },
  earth: { label: 'Föld', emoji: '🌍', primary: '#16a34a', secondary: '#166534', glow: 'rgba(34, 197, 94, 0.3)' },
  water: { label: 'Víz', emoji: '💧', primary: '#0ea5e9', secondary: '#1e3a8a', glow: 'rgba(14, 165, 233, 0.3)' },
  air: { label: 'Levegő', emoji: '💨', primary: '#a855f7', secondary: '#6366f1', glow: 'rgba(99, 102, 241, 0.3)' },
}

export type CardPreviewAccent = 'world' | 'collection' | 'deck' | 'dungeon' | 'reward'

interface CardPreviewProps {
  card: WorldCard
  damage?: number
  health?: number
  accent?: CardPreviewAccent
  highlight?: boolean
  actions?: ReactNode
  footer?: ReactNode
  compact?: boolean
  onDelete?: () => void
}

export function CardPreview({
  card,
  damage,
  health,
  accent,
  highlight,
  actions,
  footer,
  compact,
  onDelete,
}: CardPreviewProps) {
  const theme = ELEMENT_THEME[card.element]
  const style = {
    '--card-primary': theme.primary,
    '--card-secondary': theme.secondary,
    '--card-glow': theme.glow,
  } as CSSProperties

  const classNames = [
    'card-preview',
    accent ? `accent-${accent}` : '',
    highlight ? 'is-highlighted' : '',
    compact ? 'is-compact' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const illustrationStyle: CSSProperties = card.backgroundImage
    ? {
        backgroundImage: `url(${card.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {}

  return (
    <div className="card-preview-wrapper">
      {onDelete && (
        <button
          type="button"
          className="card-delete-button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onDelete()
          }}
          aria-label="Kártya törlése"
        >
          ×
        </button>
      )}
      
      <article className={classNames} style={style} data-card-kind={card.kind}>
        <div className="card-preview__illustration" style={illustrationStyle}>
          {!card.backgroundImage && (
            <>
              <div className="card-preview__shape"></div>
              <div className="card-preview__shape card-preview__shape--accent"></div>
            </>
          )}
          
          <div className="card-preview__overlay">
            <header className="card-preview__header">
              {card.kind === 'leader' && (
                <span className="card-badge card-badge--leader">👑</span>
              )}
              <div className="card-preview__stats-compact">
                <div className="stat-item">
                  <span className="stat-value">{health ?? card.health}</span>
                  <span className="stat-emoji">❤️</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{damage ?? card.damage}</span>
                  <span className="stat-emoji">⚔️</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{theme.label}</span>
                  <span className="stat-emoji">{theme.emoji}</span>
                </div>
              </div>
            </header>

            <footer className="card-preview__name-footer">
              <h5 title={card.name}>{card.name}</h5>
            </footer>
          </div>
        </div>

        {(actions || footer) && (
          <div className="card-preview__footer">
            {actions && <div className="card-preview__actions">{actions}</div>}
            {footer && <div className="card-preview__extra">{footer}</div>}
          </div>
        )}
      </article>
    </div>
  )
}
