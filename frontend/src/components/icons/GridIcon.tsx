import React from 'react'

export default function GridIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M1 1h2v2H1V1zm0 5h2v2H1V6zm0 5h2v2H1v-2zm5-10h2v2H6V1zm0 5h2v2H6V6zm0 5h2v2H6v-2zm5-10h2v2h-2V1zm0 5h2v2h-2V6zm0 5h2v2h-2v-2z"/>
    </svg>
  )
}
