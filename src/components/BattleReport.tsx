import type { BattleResult, GameEnvironment } from '../types'
import { useTranslation } from '../state/LanguageContext'

interface BattleReportProps {
  result: BattleResult
  environment: GameEnvironment
}

function resolveName(environment: GameEnvironment, cardId: string) {
  return environment.worldCards.find((card) => card.id === cardId)?.name ?? cardId
}

export function BattleReport({ result, environment }: BattleReportProps) {
  const { t } = useTranslation()

  const translateReason = (round: BattleResult['rounds'][number]) => {
    if (!round.reasonKey) {
      return round.reason
    }
    const baseParams = { ...(round.reasonParams ?? {}) }
    if (
      round.reasonParams &&
      'playerElement' in round.reasonParams &&
      typeof round.reasonParams.playerElement === 'string'
    ) {
      baseParams.playerElementName = t(`elements.${round.reasonParams.playerElement}`)
      delete (baseParams as any).playerElement
    }
    if (
      round.reasonParams &&
      'dungeonElement' in round.reasonParams &&
      typeof round.reasonParams.dungeonElement === 'string'
    ) {
      baseParams.dungeonElementName = t(`elements.${round.reasonParams.dungeonElement}`)
      delete (baseParams as any).dungeonElement
    }
    return t(round.reasonKey, baseParams)
  }

  return (
    <section className="panel-block battle-report">
      <h3>{t('battleReport.title')}</h3>
      <p className="battle-summary">
        {result.playerVictory ? t('battleReport.summaryVictory') : t('battleReport.summaryDefeat')}{' '}
        {t('battleReport.record', { wins: result.playerWins, losses: result.dungeonWins })}
      </p>
      <ol className="round-list">
        {result.rounds.map((round, index) => {
          const outcomeClass = round.winner === 'player' ? 'round-item win' : 'round-item loss'
          return (
            <li
              key={round.round}
              className={`${outcomeClass}`}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="round-item__header">
                <span className="round-index">#{round.round}</span>
                <span className="round-outcome">
                  {round.winner === 'player' ? t('battleReport.roundPlayer') : t('battleReport.roundDungeon')}
                </span>
              </div>
              <div className="round-item__matchup">
                <span>{resolveName(environment, round.playerCardId)}</span>
                <span className="round-vs">{t('battleReport.roundVs')}</span>
                <span>{resolveName(environment, round.dungeonCardId)}</span>
              </div>
              <div className="reason">{translateReason(round)}</div>
            </li>
          )
        })}
      </ol>
      <p className="timestamp">
        {t('battleReport.timestamp', { timestamp: new Date(result.timestamp).toLocaleString() })}
      </p>
    </section>
  )
}
