import type { ComponentType, SVGProps } from 'react'
import { CloudIcon, GridIcon, KanbanIcon, MinesweeperIcon, PlayIcon } from '../components/icons'

export type GameId = 'minesweeper' | 'memory' | 'snake' | 'tetris' | 'flappybird'

export type GameDefinition = {
  id: GameId
  /** Translation key for the display name; the key equals the id by convention. */
  nameKey: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** false while the game is still a "coming soon" placeholder. */
  playable: boolean
}

/**
 * Single source of truth for the game catalogue: the menu, the router and the
 * placeholder route all read from here instead of keeping their own lists.
 */
export const GAMES: GameDefinition[] = [
  { id: 'minesweeper', nameKey: 'minesweeper', Icon: MinesweeperIcon, playable: true },
  { id: 'memory', nameKey: 'memory', Icon: GridIcon, playable: true },
  { id: 'snake', nameKey: 'snake', Icon: PlayIcon, playable: true },
  { id: 'tetris', nameKey: 'tetris', Icon: KanbanIcon, playable: true },
  { id: 'flappybird', nameKey: 'flappybird', Icon: CloudIcon, playable: false },
]

export function findGame(id: string | undefined): GameDefinition | undefined {
  return GAMES.find((game) => game.id === id)
}
