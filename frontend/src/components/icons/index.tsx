import type { ReactNode, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement>

/** Shared <svg> shell; every icon below only supplies its own geometry. */
function Icon({
  viewBox = '0 0 16 16',
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox={viewBox} fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      {children}
    </svg>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        fillRule="evenodd"
        d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"
      />
    </Icon>
  )
}

export function TrophyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33.076 33.076 0 0 1 2.5.5zm.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935zm10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935z" />
    </Icon>
  )
}

export function CloudIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.181 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z" />
    </Icon>
  )
}

export function GridIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1 1h2v2H1V1zm0 5h2v2H1V6zm0 5h2v2H1v-2zm5-10h2v2H6V1zm0 5h2v2H6V6zm0 5h2v2H6v-2zm5-10h2v2h-2V1zm0 5h2v2h-2V6zm0 5h2v2h-2v-2z" />
    </Icon>
  )
}

export function KanbanIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.5 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h11zm-11-1a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-11zM6.5 3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3zm6 0a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3zm-6 7a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h3z" />
    </Icon>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z" />
    </Icon>
  )
}

export function FlagIcon(props: IconProps) {
  return (
    <Icon viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 3v18M4 3h12a2 2 0 012 2v8a2 2 0 01-2 2H4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Icon>
  )
}

export function MinesweeperIcon(props: IconProps) {
  return (
    <Icon viewBox="0 0 24 24" fill="none" {...props}>
      <g fill="currentColor">
        <rect x="1" y="1" width="6" height="6" />
        <rect x="8" y="1" width="6" height="6" />
        <rect x="15" y="1" width="8" height="6" />

        <rect x="1" y="8" width="6" height="6" />
        <rect x="8" y="8" width="6" height="6" />
        <rect x="15" y="8" width="8" height="6" />

        <rect x="1" y="15" width="6" height="8" />
        <rect x="8" y="15" width="6" height="8" />
        <rect x="15" y="15" width="8" height="8" />

        {/* flag on one cell */}
        <rect x="17" y="3" width="4" height="4" fill="currentColor" />
        <path d="M18 6 L18 3" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 3 L20 4 L18 5 Z" fill="#fff" />

        <text x="11" y="6.4" fontSize="3.6" fontWeight="700" textAnchor="middle" fill="#fff">1</text>
        <text x="5" y="12.4" fontSize="3.6" fontWeight="700" textAnchor="middle" fill="#fff">2</text>
        <text x="13" y="18.4" fontSize="3.6" fontWeight="700" textAnchor="middle" fill="#fff">3</text>
      </g>
    </Icon>
  )
}
