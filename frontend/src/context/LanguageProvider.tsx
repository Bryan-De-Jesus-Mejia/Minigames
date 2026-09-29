import { useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LanguageContext } from './language'
import type { Translate } from './language'
import { DEFAULT_LANGUAGE, isLanguage, translations } from './translations'
import type { Language } from './translations'

/**
 * The active language is derived from the first path segment, so the URL is the
 * single source of truth and switching language is just a navigation. Routes no
 * longer have to push the language into the provider with an effect.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const language = useMemo(() => {
    const segment = location.pathname.split('/')[1]
    return isLanguage(segment) ? segment : DEFAULT_LANGUAGE
  }, [location.pathname])

  const setLanguage = useCallback(
    (next: Language) => {
      const parts = location.pathname.split('/')
      parts[1] = next
      navigate(parts.join('/') || `/${next}`)
    },
    [location.pathname, navigate],
  )

  const t = useCallback<Translate>(
    (key, vars) => {
      const template = translations[language][key] ?? key
      if (!vars) return template
      return Object.entries(vars).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, value),
        template,
      )
    },
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
