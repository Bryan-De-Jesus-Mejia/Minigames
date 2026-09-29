import { createContext, useContext } from 'react'
import type { Language } from './translations'

export type Translate = (key: string, vars?: Record<string, string>) => string

export interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translate
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
