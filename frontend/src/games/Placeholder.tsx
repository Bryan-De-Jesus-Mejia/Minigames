import { useLanguage } from '../context/language'
import './Placeholder.css'

export function Placeholder({ gameName }: { gameName: string }) {
  const { t } = useLanguage()

  return (
    <div className="placeholder">
      <h2 className="placeholder-title">{t('placeholder.title')}</h2>
      <p className="placeholder-body">{t('placeholder.body', { game: gameName })}</p>
    </div>
  )
}
