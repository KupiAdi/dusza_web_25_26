import type { CSSProperties, ReactNode } from 'react'
import type { WorldCard } from '../types'

const ELEMENT_THEME: Record<WorldCard['element'], {
  label: string
  primary: string
  secondary: string
  glow: string
}> = {
  fire: { label: 'Fire', primary: '#f97316', secondary: '#ef4444', glow: 'rgba(239, 68, 68, 0.35)' },
  earth: { label: 'Earth', primary: '#16a34a', secondary: '#166534', glow: 'rgba(34, 197, 94, 0.3)' },
  water: { label: 'Water', primary: '#0ea5e9', secondary: '#1e3a8a', glow: 'rgba(14, 165, 233, 0.3)' },
  air: { label: 'Air', primary: '#a855f7', secondary: '#6366f1', glow: 'rgba(99, 102, 241, 0.3)' },
}

const KIND_BADGE: Record<WorldCard['kind'], string> = {
  standard: 'Standard',
  leader: 'Leader',
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
    <article className={classNames} style={style} data-card-kind={card.kind}>
      <header className="card-preview__header">
        <div className="element-marker" aria-label={`Element ${theme.label}`}>
          <span>{theme.label.slice(0, 1)}</span>
        </div>
        <div className="card-preview__meta">
          <h5 title={card.name}>{card.name}</h5>
          <span className="card-badge">{KIND_BADGE[card.kind]}</span>
        </div>
      </header>

      <section className="card-preview__body">
        <div className="card-preview__illustration" style={illustrationStyle}>
          {!card.backgroundImage && (
            <>
              <div className="card-preview__shape"></div>
              <div className="card-preview__shape card-preview__shape--accent"></div>
            </>
          )}
        </div>
        <dl className="card-preview__stats">
          <div>
            <dt>Damage</dt>
            <dd>{damage ?? card.damage}</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd>{health ?? card.health}</dd>
          </div>
          <div>
            <dt>Element</dt>
            <dd>{theme.label}</dd>
          </div>
        </dl>
      </section>

      {(actions || footer) && (
        <footer className="card-preview__footer">
          {actions && <div className="card-preview__actions">{actions}</div>}
          {footer && <div className="card-preview__extra">{footer}</div>}
        </footer>
      )}
    </article>
  )
}
