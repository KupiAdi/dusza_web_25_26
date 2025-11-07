import type { BattleResult, GameEnvironment } from '../types'

interface BattleReportProps {
  result: BattleResult
  environment: GameEnvironment
}

function resolveName(environment: GameEnvironment, cardId: string) {
  return environment.worldCards.find((card) => card.id === cardId)?.name ?? cardId
}

export function BattleReport({ result, environment }: BattleReportProps) {
  return (
    <section className="panel-block battle-report">
      <h3>Harc jelentese</h3>
      <p className="battle-summary">
        {result.playerVictory ? 'A jatekos gyozott.' : 'A kazamata diadalmaskodott.'}{' '}
        {result.playerWins} gyozelem / {result.dungeonWins} vereseg
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
                <span className="round-outcome">{round.winner === 'player' ? 'Jatekos' : 'Kazamata'}</span>
              </div>
              <div className="round-item__matchup">
                <span>{resolveName(environment, round.playerCardId)}</span>
                <span className="round-vs">vs</span>
                <span>{resolveName(environment, round.dungeonCardId)}</span>
              </div>
              <div className="reason">{round.reason}</div>
            </li>
          )
        })}
      </ol>
      <p className="timestamp">
        Lejatszas ideje: {new Date(result.timestamp).toLocaleString()}
      </p>
    </section>
  )
}
