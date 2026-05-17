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
    'snake': 'Snake',
    'tetris': 'Tetris',
    'flappybird': 'Flappy Bird',
    'btn.back': 'Back',
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
    'leaderboard.view': 'Leaderboard',
    'leaderboard.back': 'Back to game',
    'leaderboard.podium': 'Podium',
    'username.notice': 'Set a player name so your scores are saved to the leaderboard.',
    'username.label': 'Player name',
  },
  es: {
    'menu.title': 'MINIGAMES',
    'minesweeper': 'Buscaminas',
    'memory': 'Memoria',
    'snake': 'Snake',
    'tetris': 'Tetris',
    'flappybird': 'Flappy Bird',
    'btn.back': 'Atrás',
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
    'leaderboard.title': 'Clasificacion',
    'leaderboard.empty': 'Aun no hay victorias registradas.',
    'leaderboard.view': 'Clasificacion',
    'leaderboard.back': 'Volver al juego',
    'leaderboard.podium': 'Podio',
    'username.notice': 'Establece un nombre para que tus puntajes sean guardados en el marcador.',
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
