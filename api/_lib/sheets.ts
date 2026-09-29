import { google } from 'googleapis'
import type { sheets_v4 } from 'googleapis'

export interface LeaderboardEntry {
  username: string
  time?: number
  score?: number
  date: string
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  playerRank?: number
  playerEntry?: LeaderboardEntry
}

/** Games ranked by a high score; everything else is ranked by a low time. */
const SCORE_GAMES = new Set(['tetris'])

const MAX_ENTRIES = 15

/** Columns of every per-game sheet: username, value, ISO date. */
const COLUMNS = 'A:C'

let client: sheets_v4.Sheets | undefined

function getSheets(): sheets_v4.Sheets {
  if (!client) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    client = google.sheets({ version: 'v4', auth })
  }
  return client
}

function sheetName(game: string, difficulty: string): string {
  return `${game}-${difficulty}`
}

function toEntry(game: string, username: string, value: number, date: string): LeaderboardEntry {
  return SCORE_GAMES.has(game)
    ? { username, score: value, date }
    : { username, time: value, date }
}

function valueOf(entry: LeaderboardEntry): number {
  return entry.score ?? entry.time ?? 0
}

export async function readLeaderboard(
  game: string,
  difficulty: string,
  options?: { username?: string },
): Promise<LeaderboardResult> {
  const response = await getSheets().spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${sheetName(game, difficulty)}!A2:C`,
  })

  const isScoreGame = SCORE_GAMES.has(game)

  // Keep only each player's personal best.
  const bestByUser = new Map<string, LeaderboardEntry>()
  for (const row of response.data.values ?? []) {
    if (!row[0] || !row[1]) continue

    const value = parseFloat(String(row[1]))
    if (isNaN(value)) continue

    const username = String(row[0])
    const existing = bestByUser.get(username)
    const isBetter = !existing || (isScoreGame ? value > valueOf(existing) : value < valueOf(existing))
    if (isBetter) {
      bestByUser.set(username, toEntry(game, username, value, String(row[2] ?? new Date().toISOString())))
    }
  }

  const all = Array.from(bestByUser.values()).sort((a, b) =>
    isScoreGame ? valueOf(b) - valueOf(a) : valueOf(a) - valueOf(b),
  )
  const entries = all.slice(0, MAX_ENTRIES)

  if (!options?.username) return { entries }

  const index = all.findIndex((entry) => entry.username === options.username)
  if (index === -1) return { entries }

  return { entries, playerRank: index + 1, playerEntry: all[index] }
}

export async function appendScore(
  game: string,
  difficulty: string,
  username: string,
  value: number,
  date: string,
): Promise<void> {
  await getSheets().spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${sheetName(game, difficulty)}!${COLUMNS}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[username, value, date]] },
  })
}
