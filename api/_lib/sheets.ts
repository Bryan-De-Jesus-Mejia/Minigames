import { google } from 'googleapis'

export interface LeaderboardEntry {
  username: string
  time?: number
  score?: number
  date: string
}

const SCORE_GAMES = new Set(['tetris'])

function getLeaderboardField(game: string): 'time' | 'score' {
  return SCORE_GAMES.has(game) ? 'score' : 'time'
}

function getEntryValue(game: string, row: string[]): number {
  return parseFloat(String(row[1]))
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[]
  playerRank?: number
  playerEntry?: LeaderboardEntry
}

export async function readLeaderboard(
  game: string,
  difficulty: string,
  options?: { username?: string },
): Promise<LeaderboardResult> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${game}-${difficulty}!A2:C`,
  })
  const rows = response.data.values ?? []

  const parsed = rows
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      username: String(row[0]),
      value: getEntryValue(game, row),
      date: String(row[2] ?? new Date().toISOString()),
    }))
    .filter((entry) => !isNaN(entry.value))

  // Keep only each player's personal best
  const bestByUser = new Map<string, LeaderboardEntry>()
  for (const entry of parsed) {
    const existing = bestByUser.get(entry.username)
    if (!existing) {
      bestByUser.set(entry.username, {
        username: entry.username,
        [getLeaderboardField(game)]: entry.value,
        date: entry.date,
      })
      continue
    }

    const existingValue = existing.time ?? existing.score ?? Number.POSITIVE_INFINITY
    const isScoreGame = SCORE_GAMES.has(game)
    const isBetter = isScoreGame ? entry.value > existingValue : entry.value < existingValue
    if (isBetter) {
      bestByUser.set(entry.username, {
        username: entry.username,
        [getLeaderboardField(game)]: entry.value,
        date: entry.date,
      })
    }
  }

  const isScoreGame = SCORE_GAMES.has(game)
  const all = Array.from(bestByUser.values()).sort((a, b) => {
    const aValue = a.time ?? a.score ?? 0
    const bValue = b.time ?? b.score ?? 0
    return isScoreGame ? bValue - aValue : aValue - bValue
  })
  const entries = all.slice(0, 15)

  if (!options?.username) return { entries }

  const idx = all.findIndex((e) => e.username === options.username)
  if (idx === -1) return { entries }

  return { entries, playerRank: idx + 1, playerEntry: all[idx] }
}

export async function appendScore(
  game: string,
  difficulty: string,
  username: string,
  value: number,
  date: string,
): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${game}-${difficulty}!A:C`,
    valueInputOption: 'RAW',
    requestBody: { values: [[username, value, date]] },
  })
}
