// Shared look for every auth email: Layerly's own canvas/ink/sage palette
// and a Fraunces wordmark instead of react-email's default black-button
// scaffold. Kept as plain style objects (not components) so each template
// can still compose its own copy and JSX freely — see signup.tsx for the
// full pattern this was extracted from.

export const main = {
  backgroundColor: '#FAF9F6',
  fontFamily:
    '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '40px 20px',
}

export const outerContainer = { maxWidth: '480px', margin: '0 auto' }

export const wordmarkSection = { textAlign: 'center' as const, marginBottom: '20px' }

export const wordmark = {
  fontFamily: '"Fraunces", Georgia, serif',
  fontSize: '20px',
  fontWeight: 600,
  color: '#7D8F69',
  letterSpacing: '0.01em',
  margin: 0,
}

export const card = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '36px 32px',
  border: '1px solid rgba(45,45,45,0.06)',
}

export const h1 = {
  fontFamily: '"Fraunces", Georgia, serif',
  fontSize: '24px',
  fontWeight: 600,
  color: '#2D2D2D',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

export const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 28px',
  textAlign: 'center' as const,
}

export const link = { color: '#7D8F69', textDecoration: 'underline' }
export const plainLink = {
  color: '#7D8F69',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}

export const buttonWrap = { textAlign: 'center' as const, margin: '0 0 24px' }

export const button = {
  backgroundColor: '#7D8F69',
  color: '#FCFBFA',
  fontSize: '15px',
  fontWeight: 500,
  borderRadius: '999px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const mutedText = {
  fontSize: '12px',
  color: '#9a9a9a',
  lineHeight: '1.6',
  textAlign: 'center' as const,
  margin: '0 0 8px',
}

export const hr = { borderColor: 'rgba(45,45,45,0.08)', margin: '28px 0 20px' }

export const footer = {
  fontSize: '12px',
  color: '#9a9a9a',
  textAlign: 'center' as const,
  margin: 0,
}

// Reauthentication's one-time code, set apart from regular body text.
export const codeStyle = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: '32px',
  fontWeight: 600,
  letterSpacing: '0.15em',
  color: '#2D2D2D',
  textAlign: 'center' as const,
  margin: '0 0 28px',
}
