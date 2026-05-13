export function Placeholder({ gameName }: { gameName: string }) {
  return (
    <div style={{
      textAlign: 'center',
      color: '#ffffff',
      padding: '40px 20px',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', fontWeight: 600 }}>
        Coming Soon
      </h2>
      <p style={{ fontSize: '1rem', opacity: 0.7, margin: 0 }}>
        {gameName} is under development
      </p>
    </div>
  )
}
