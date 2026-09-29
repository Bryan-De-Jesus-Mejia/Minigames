import { useCallback, useEffect, useState } from 'react'

export const USERNAME_STORAGE_KEY = 'minigames-username'
export const DEFAULT_USERNAME = 'Player'

const SYNC_EVENT = 'minigames-username-change'

function readStoredUsername(): string {
  return localStorage.getItem(USERNAME_STORAGE_KEY) ?? DEFAULT_USERNAME
}

export function useUsername() {
  const [username, setUsernameState] = useState<string>(readStoredUsername)

  useEffect(() => {
    const sync = () => setUsernameState(readStoredUsername())
    window.addEventListener(SYNC_EVENT, sync)
    return () => window.removeEventListener(SYNC_EVENT, sync)
  }, [])

  const setUsername = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 30) || DEFAULT_USERNAME
    localStorage.setItem(USERNAME_STORAGE_KEY, trimmed)
    setUsernameState(trimmed)
    window.dispatchEvent(new Event(SYNC_EVENT))
  }, [])

  /** The API discards scores submitted under the default name. */
  const hasCustomUsername = username !== DEFAULT_USERNAME

  return { username, setUsername, hasCustomUsername }
}
