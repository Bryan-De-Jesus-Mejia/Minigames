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
}

export async function readLeaderboard(
  game: string,
  difficulty: string,
  options?: { username?: string; submittedTime?: number },
): Promise<LeaderboardResult> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${game}-${difficulty}!A2:C`,
  })
  const rows = response.data.values ?? []
  const all = rows
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      username: String(row[0]),
      time: parseFloat(String(row[1])),
      date: String(row[2] ?? new Date().toISOString()),
    }))
    .filter((entry) => !isNaN(entry.time))
    .sort((a, b) => a.time - b.time)

  const entries = all.slice(0, 15)

  if (!options?.username) return { entries }

  let playerEntry: LeaderboardEntry | undefined
  let playerRank: number | undefined

  if (options.submittedTime !== undefined) {
    // Rank = how many entries beat this time + 1
    playerRank = all.filter((e) => e.time < options.submittedTime!).length + 1
    playerEntry = all.find(
      (e) => e.username === options.username && e.time === options.submittedTime,
    ) ?? { username: options.username, time: options.submittedTime, date: new Date().toISOString() }
  } else {
    // Best entry for this username
    const idx = all.findIndex((e) => e.username === options.username)
    if (idx !== -1) {
      playerRank = idx + 1
      playerEntry = all[idx]
    }
  }

  return { entries, playerRank, playerEntry }
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
