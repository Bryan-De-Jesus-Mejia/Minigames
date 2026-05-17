# Leaderboard — Design Spec
**Date:** 2026-05-16  
**Scope:** Minesweeper (extensible to future games)  
**Stack:** Vercel serverless functions (Node.js) + Google Sheets API + React/Vite frontend

---

## Overview

Replace the current `localStorage`-based leaderboard with a persistent, shared leaderboard backed by a Google Spreadsheet. Scores are submitted via Vercel serverless functions that validate a short-lived signed session token (anti-cheat), read/write using a Google service account, and return the top 15 entries per difficulty. The leaderboard read is cached for 60 seconds.

---

## Architecture

```
Frontend (React/Vite)                  Vercel Serverless (Node.js)          Google Sheets
                                        
[First cell click]     ──────────────► POST /api/game-session               (no sheet access)
                       ◄────────────── { token }                            

[Player wins]          ──────────────► POST /api/leaderboard
                                         - verify HMAC token
                                         - plausibility check on time       ► Append row to tab
                       ◄────────────── { entries: top 15 }                  

[Leaderboard page]     ──────────────► GET /api/leaderboard?game=X&diff=Y
                                         Cache-Control: max-age=60          ► Read + sort tab
                       ◄────────────── { entries: top 15 }                  
```

---

## API Endpoints

### `POST /api/game-session`
Issues a short-lived signed token when a game session starts.

**Request body:**
```json
{ "game": "minesweeper", "difficulty": "easy" }
```

**Response:**
```json
{ "token": "<base64url-payload>.<base64url-hmac>" }
```

**Token payload (JSON, base64url-encoded):**
```json
{ "game": "minesweeper", "difficulty": "easy", "iat": 1747432800, "nonce": "uuid-v4" }
```

Token is signed with HMAC-SHA256 using `HMAC_SECRET`. Valid for 2 hours.

---

### `GET /api/leaderboard`
Reads the top 15 entries for a given game/difficulty.

**Query params:** `game=minesweeper&difficulty=easy`

**Response:**
```json
{
  "entries": [
    { "username": "HexMiner", "time": 22.401, "date": "2026-05-15T12:00:00.000Z" }
  ]
}
```

**Response header:** `Cache-Control: public, max-age=60, s-maxage=60`

---

### `POST /api/leaderboard`
Validates token and submits a score.

**Request body:**
```json
{ "token": "...", "username": "HexMiner", "time": 34.512 }
```

**Validation steps:**
1. Parse token: split on `.`, verify HMAC signature (constant-time compare)
2. Check token age: `iat` must be within 7200 seconds of now
3. Check plausibility: `time >= 0.5` and `time <= 7200`
4. Sanitize username: trim, max 30 characters, non-empty (fallback: `"Player"`)

**On success:** Appends `[username, time, date]` row to the Google Sheet tab, then reads and returns top 15.

**Response:** Same shape as GET response.

**Error responses:**
- `400` — missing/invalid fields
- `401` — invalid or expired token
- `500` — Google Sheets API error

---

## Google Sheets Structure

**Spreadsheet ID:** `1qg6rCV9yNP7HbS0I7ouuIY9_K_bdZ5i4FptYjsJ327o`

**Tab names:** `minesweeper-easy`, `minesweeper-medium`, `minesweeper-hard`

**Columns (row 1 = headers):**

| A: username | B: time | C: date |
|-------------|---------|---------|
| HexMiner    | 22.401  | 2026-05-15T12:00:00.000Z |

- All submitted scores are kept in the sheet (no trimming).
- The API reads all rows, sorts by `time` ascending, returns top 15.

---

## File Structure

```
api/
  game-session.ts         — POST handler: issues HMAC token
  leaderboard.ts          — GET handler (read + cache) / POST handler (validate + write)
  _lib/
    sheets.ts             — Google Sheets client (googleapis, service account auth)
    token.ts              — HMAC sign/verify (Node.js crypto, no extra library)

frontend/src/
  hooks/
    useUsername.ts        — reads/writes username from localStorage
  components/
    UsernameInput.tsx     — inline name-entry input (shown in GameFrame or settings area)
  games/
    Minesweeper.tsx       — modified: call /api/game-session on first click,
                            call /api/leaderboard on win,
                            fetch /api/leaderboard on leaderboard page load,
                            remove all localStorage leaderboard logic
```

Root `package.json` gains:
```json
"dependencies": {
  "googleapis": "^144.x"
}
```

**`vercel.json` must be updated:** The current catch-all route `^/(?!.*\\.).*$` matches `/api/leaderboard` (no dots in path) and would serve `index.html` instead of the function. The route regex must exclude `/api/`:
```json
{ "src": "^/(?!api/)(?!.*\\.).*$", "dest": "/index.html" }
```

---

## Environment Variables

Set in Vercel dashboard (or via `vercel env add`):

| Variable                      | Value source                          |
|-------------------------------|---------------------------------------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`| Service account JSON → `client_email` |
| `GOOGLE_PRIVATE_KEY`          | Service account JSON → `private_key` (keep `\n` escaped) |
| `GOOGLE_SPREADSHEET_ID`       | `1qg6rCV9yNP7HbS0I7ouuIY9_K_bdZ5i4FptYjsJ327o` |
| `HMAC_SECRET`                 | Random 32-byte hex string (generate once) |

---

## Frontend Username Flow

- `useUsername()` hook wraps `localStorage` key `"minigames-username"`.
- Default value: `"Player"` (used if no name has been set).
- A small `<UsernameInput>` component renders an editable field (likely in the GameFrame header or a small settings area). Saving updates `localStorage` immediately.
- Minesweeper reads the username from the hook at the moment of score submission.

---

## Error Handling

- API unreachable on leaderboard page → show empty list with a subtle error message; no crash.
- API unreachable on score submission → show a local "score saved" fallback (don't block the win screen).
- Token missing (e.g., network error on first click) → attempt one retry; if still missing, skip the score submission silently (win screen still shown, score just not recorded).

---

## Out of Scope

- User accounts / authentication
- Score deletion or moderation tools
- Real-time leaderboard updates (WebSocket/SSE)
- Adding games other than Minesweeper (tabs will be created on demand)
