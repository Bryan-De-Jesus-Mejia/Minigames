import React from 'react'

export default function MinesweeperIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g fill="currentColor">
        {/* grid */}
        <rect x="1" y="1" width="6" height="6" />
        <rect x="8" y="1" width="6" height="6" />
        <rect x="15" y="1" width="8" height="6" />

        <rect x="1" y="8" width="6" height="6" />
        <rect x="8" y="8" width="6" height="6" />
        <rect x="15" y="8" width="8" height="6" />

        <rect x="1" y="15" width="6" height="8" />
        <rect x="8" y="15" width="6" height="8" />
        <rect x="15" y="15" width="8" height="8" />

        {/* a small flag on one cell */}
        <rect x="17" y="3" width="4" height="4" fill="currentColor" />
        <path d="M18 6 L18 3" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 3 L20 4 L18 5 Z" fill="#fff" />

        {/* numbered cells: use small numbers inside some squares */}
        <text x="11" y="6.4" fontSize="3.6" fontWeight="700" textAnchor="middle" fill="#fff">1</text>
        <text x="5" y="12.4" fontSize="3.6" fontWeight="700" textAnchor="middle" fill="#fff">2</text>
        <text x="13" y="18.4" fontSize="3.6" fontWeight="700" textAnchor="middle" fill="#fff">3</text>
      </g>
    </svg>
  )
}
