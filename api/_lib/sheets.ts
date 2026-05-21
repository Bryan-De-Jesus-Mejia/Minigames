import { google } from 'googleapis'

export interface LeaderboardEntry {
  username: string
  time: number
  date: string
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
  submissionRank?: number
  submissionEntry?: LeaderboardEntry
}

export async function readLeaderboard(
  game: string,
  difficulty: string,
  options?: {
    username?: string
    submission?: LeaderboardEntry
  },
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
      time: parseFloat(String(row[1])),
      date: String(row[2] ?? new Date().toISOString()),
    }))
    .filter((entry) => !isNaN(entry.time))

  const orderedByScore = parsed
    .slice()
    .sort((a, b) => a.time - b.time || a.date.localeCompare(b.date) || a.username.localeCompare(b.username))

  // Keep only each player's personal best
  const bestByUser = new Map<string, LeaderboardEntry>()
  for (const entry of parsed) {
    const existing = bestByUser.get(entry.username)
    if (!existing || entry.time < existing.time) {
      bestByUser.set(entry.username, entry)
    }
  }

  const all = Array.from(bestByUser.values()).sort((a, b) => a.time - b.time)
  const entries = all.slice(0, 15)

  if (!options?.username) return { entries }

  const idx = all.findIndex((e) => e.username === options.username)
  const result: LeaderboardResult = { entries }
  if (idx !== -1) {
    result.playerRank = idx + 1
    result.playerEntry = all[idx]
  }

  if (options?.submission) {
    const submissionIdx = orderedByScore.findIndex(
      (entry) =>
        entry.username === options.submission!.username &&
        entry.time === options.submission!.time &&
        entry.date === options.submission!.date,
    )
    if (submissionIdx !== -1) {
      result.submissionRank = submissionIdx + 1
      result.submissionEntry = orderedByScore[submissionIdx]
    }
  }

  return result
}

export async function appendScore(
  game: string,
  difficulty: string,
  username: string,
  time: number,
  date: string,
): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${game}-${difficulty}!A:C`,
    valueInputOption: 'RAW',
    requestBody: { values: [[username, time, date]] },
  })
}
