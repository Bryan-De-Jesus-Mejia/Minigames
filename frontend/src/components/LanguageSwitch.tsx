import { useLanguage } from '../context/language'
import { LANGUAGES } from '../context/translations'
import './LanguageSwitch.css'

/**
 * The menu and the game header used to carry two separate copies of this,
 * each with its own way of rewriting the URL.
 */
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage()

  return (
    <>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          className={`lang-btn ${language === code ? 'active' : ''}`}
          onClick={() => setLanguage(code)}
          type="button"
        >
          {code.toUpperCase()}
        </button>
      ))}
    </>
  )
}
