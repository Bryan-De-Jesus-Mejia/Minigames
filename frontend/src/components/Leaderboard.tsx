import type { ReactNode } from 'react'
import { useLanguage } from '../context/language'
import { entryValue } from '../lib/api'
import type { LeaderboardEntry, Metric } from '../lib/api'
import { formatDate, formatTime } from '../lib/format'
import './Leaderboard.css'

const PODIUM_SIZE = 3
const LIST_SIZE = 15

type LeaderboardProps = {
  entries: LeaderboardEntry[] | null
  loading: boolean
  metric: Metric
  playerRank?: number | null
  playerEntry?: LeaderboardEntry | null
}

function formatValue(entry: LeaderboardEntry, metric: Metric): string {
  const value = entryValue(entry, metric)
  return metric === 'score' ? String(value) : formatTime(value)
}

function entryKey(entry: LeaderboardEntry, metric: Metric): string {
  return `${entry.username}-${entryValue(entry, metric)}-${entry.date}`
}

function Row({
  place,
  entry,
  metric,
  highlight = false,
}: {
  place: number
  entry: LeaderboardEntry
  metric: Metric
  highlight?: boolean
}) {
  return (
    <li className={`lb-row ${highlight ? 'lb-row-you' : ''}`}>
      <span className="lb-rank tabular">#{place}</span>
      <span className="lb-name">{entry.username}</span>
      <span className="lb-value tabular">{formatValue(entry, metric)}</span>
      <span className="lb-date tabular">{formatDate(entry.date)}</span>
    </li>
  )
}

/**
 * Podium for the top three plus a ranked list, with the player's own row pinned
 * at the bottom when they fall outside it. Shared by all three games.
 */
export function Leaderboard({ entries, loading, metric, playerRank, playerEntry }: LeaderboardProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="lb-loading" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>{t('leaderboard.calculatingPlace')}</span>
      </div>
    )
  }

  const all = entries ?? []
  const podium = all.slice(0, PODIUM_SIZE)
  const list = all.slice(PODIUM_SIZE, LIST_SIZE)
  const showPlayerRow =
    playerRank != null && playerRank > LIST_SIZE && playerEntry != null

  return (
    <div className="lb-layout">
      <div className="lb-podium" aria-label={t('leaderboard.podium')}>
        {podium.length === 0 ? (
          <div className="lb-empty">{t('leaderboard.empty')}</div>
        ) : (
          podium.map((entry, index) => (
            <div key={entryKey(entry, metric)} className={`lb-podium-slot lb-podium-${index + 1}`}>
              <div className="lb-podium-place">#{index + 1}</div>
              <div className="lb-podium-name">{entry.username}</div>
              <div className="lb-podium-value tabular">{formatValue(entry, metric)}</div>
              <div className="lb-podium-date tabular">{formatDate(entry.date)}</div>
            </div>
          ))
        )}
      </div>

      {list.length > 0 && (
        <ol className="lb-list">
          {list.map((entry, index) => (
            <Row
              key={entryKey(entry, metric)}
              place={index + PODIUM_SIZE + 1}
              entry={entry}
              metric={metric}
            />
          ))}
        </ol>
      )}

      {showPlayerRow && (
        <>
          <div className="lb-separator">· · ·</div>
          <ol className="lb-list">
            <Row place={playerRank} entry={playerEntry} metric={metric} highlight />
          </ol>
        </>
      )}
    </div>
  )
}

type LeaderboardPageProps = LeaderboardProps & {
  title: string
  meta?: ReactNode
}

/** Full leaderboard route body: card shell, heading and the board itself. */
export function LeaderboardPage({ title, meta, ...boardProps }: LeaderboardPageProps) {
  return (
    <div className="game-page game-page--center lb-page">
      <div className="lb-card">
        <h2 className="lb-title">{title}</h2>
        {meta ? <div className="lb-meta">{meta}</div> : null}
        <Leaderboard {...boardProps} />
      </div>
    </div>
  )
}
