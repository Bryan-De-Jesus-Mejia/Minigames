import type { ReactNode } from 'react'
import { UsernameField } from './UsernameInput'
import './MenuCard.css'

type MenuCardProps = {
  title: ReactNode
  /** Show the editable player name above the options. */
  withUsername?: boolean
  children: ReactNode
}

export function MenuCard({ title, withUsername = false, children }: MenuCardProps) {
  return (
    <div className="menu-card">
      <h2 className="menu-card-title">{title}</h2>
      {withUsername ? <UsernameField /> : null}
      {children}
    </div>
  )
}

export type MenuOption = {
  key: string
  label: ReactNode
  meta?: ReactNode
}

type MenuOptionListProps = {
  options: MenuOption[]
  onSelect: (key: string) => void
  /** Stack label and meta on narrow screens, for long descriptions. */
  stackOnMobile?: boolean
}

export function MenuOptionList({ options, onSelect, stackOnMobile = false }: MenuOptionListProps) {
  return (
    <div className="menu-options">
      {options.map((option) => (
        <button
          key={option.key}
          className={`menu-option ${stackOnMobile ? 'menu-option--stack' : ''}`}
          onClick={() => onSelect(option.key)}
          type="button"
        >
          <span className="menu-option-label">{option.label}</span>
          {option.meta !== undefined ? <span className="menu-option-meta">{option.meta}</span> : null}
        </button>
      ))}
    </div>
  )
}
