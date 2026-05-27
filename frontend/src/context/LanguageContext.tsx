import React, { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
  
type Language = 'en' | 'es'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<Language, Record<string, string>> = {
  en: {
    'menu.title': 'MINIGAMES',
    'minesweeper': 'Minesweeper',
    'memory': 'Memory',
    'memory.pairs': 'pairs',
    'snake': 'Snake',
    'tetris': 'Tetris',
    'tetris.menu.title': 'Choose your gamemode',
    'tetris.mode.classic': 'Classic',
    'tetris.mode.marathon': 'Marathon',
    'tetris.mode.zen': 'Zen',
    'tetris.mode.classic.summary': 'Balanced and familiar.',
    'tetris.mode.marathon.summary': 'Faster and tighter.',
    'tetris.mode.zen.summary': 'Slow and steady.',
    'tetris.control.title': 'Controls preview',
    'tetris.control.move': 'Move',
    'tetris.control.rotate': 'Rotate',
    'tetris.control.softDrop': 'Soft drop',
    'tetris.control.hardDrop': 'Hard drop',
    'tetris.hud.score': 'Score',
    'tetris.hud.lines': 'Lines',
    'tetris.hud.level': 'Level',
    'tetris.hud.mode': 'Mode',
    'tetris.play.tip': 'Arrow keys move, Up rotates, and Space hard drops.',
    'flappybird': 'Flappy Bird',
    'btn.back': 'Back',
    'btn.start': 'Start',
    'btn.difficulty': 'Difficulty',
    'btn.reset': 'Reset',
    'btn.flag': 'Flag',
    'btn.timer': 'Timer',
    'difficulty.choose': 'Choose difficulty',
    'difficulty.easy': 'Easy',
    'difficulty.medium': 'Medium',
    'difficulty.hard': 'Hard',
    'game.over': 'Game Over',
    'game.win': 'You Win',
    'flag.on': 'ON',
    'flag.off': 'OFF',
    'leaderboard.title': 'Leaderboard',
    'leaderboard.empty': 'No wins recorded yet.',
    'leaderboard.podium': 'Podium',
    'leaderboard.calculatingPlace': 'Calculating leaderboard place',
    'username.notice': 'Set a player name so your scores are saved to the leaderboard.',
    'username.label': 'Player name',
  },
  es: {
    'menu.title': 'MINIGAMES',
    'minesweeper': 'Buscaminas',
    'memory': 'Memoria',
    'memory.pairs': 'pares',
    'snake': 'Snake',
    'tetris': 'Tetris',
    'tetris.menu.title': 'Elige tu pila',
    'tetris.mode.classic': 'Clásico',
    'tetris.mode.marathon': 'Maratón',
    'tetris.mode.zen': 'Zen',
    'tetris.mode.classic.summary': 'Equilibrado y familiar.',
    'tetris.mode.marathon.summary': 'Más rápido y tenso.',
    'tetris.mode.zen.summary': 'Lento y constante.',
    'tetris.control.title': 'Vista previa de controles',
    'tetris.control.move': 'Mover',
    'tetris.control.rotate': 'Girar',
    'tetris.control.softDrop': 'Caída suave',
    'tetris.control.hardDrop': 'Caída rápida',
    'tetris.hud.score': 'Puntuación',
    'tetris.hud.lines': 'Líneas',
    'tetris.hud.level': 'Nivel',
    'tetris.hud.mode': 'Modo',
    'tetris.play.tip': 'Las flechas mueven, Arriba gira y Espacio cae rápido.',
    'flappybird': 'Flappy Bird',
    'btn.back': 'Atrás',
    'btn.start': 'Comenzar',
    'btn.difficulty': 'Dificultad',
    'btn.reset': 'Reiniciar',
    'btn.flag': 'Banderas',
    'btn.timer': 'Tiempo',
    'difficulty.choose': 'Elegir dificultad',
    'difficulty.easy': 'Fácil',
    'difficulty.medium': 'Medio',
    'difficulty.hard': 'Difícil',
    'game.over': 'Perdiste',
    'game.win': 'Has ganado',
    'flag.on': 'ENCENDIDO',
    'flag.off': 'APAGADO',
    'leaderboard.title': 'Tabla de Clasificación',
    'leaderboard.empty': 'Aun no hay victorias registradas.',
    'leaderboard.podium': 'Podio',
    'leaderboard.calculatingPlace': 'Calculando puesto en la clasificación',
    'username.notice': 'Establece un nombre para que tus puntajes sean guardados en la tabla de clasificación.',
    'username.label': 'Nombre de jugador',
  },
  
}

interface LanguageProviderProps {
  children: ReactNode
  initialLanguage?: Language
}

export function LanguageProvider({
  children,
  initialLanguage = 'en',
}: LanguageProviderProps) {
  const [language, setLanguage] = React.useState<Language>(initialLanguage)

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
