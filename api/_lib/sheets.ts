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

export async function readLeaderboard(
  game: string,
  difficulty: string,
): Promise<LeaderboardEntry[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `${game}-${difficulty}!A2:C`,
  })
  const rows = response.data.values ?? []
  return rows
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      username: String(row[0]),
      time: parseFloat(String(row[1])),
      date: String(row[2] ?? new Date().toISOString()),
    }))
    .filter((entry) => !isNaN(entry.time))
    .sort((a, b) => a.time - b.time)
    .slice(0, 15)
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
