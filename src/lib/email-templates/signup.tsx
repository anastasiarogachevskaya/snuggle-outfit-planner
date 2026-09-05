import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={wordmarkSection}>
          <Text style={wordmark}>Layerly</Text>
        </Section>

        <Container style={card}>
          <Heading style={h1}>Confirm your email</Heading>
          <Text style={text}>
            Thanks for signing up for{' '}
            <Link href={siteUrl} style={link}>
              {siteName}
            </Link>
            . Confirm{' '}
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>{' '}
            to start getting weather-ready outfit picks for your baby.
          </Text>

          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Confirm email
            </Button>
          </Section>

          <Text style={mutedText}>
            Or paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={plainLink}>
              {confirmationUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            If you didn't create a Layerly account, you can safely ignore this email.
          </Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#FAF9F6',
  fontFamily:
    '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '40px 20px',
}

const outerContainer = { maxWidth: '480px', margin: '0 auto' }

const wordmarkSection = { textAlign: 'center' as const, marginBottom: '20px' }

const wordmark = {
  fontFamily: '"Fraunces", Georgia, serif',
  fontSize: '20px',
  fontWeight: 600,
  color: '#7D8F69',
  letterSpacing: '0.01em',
  margin: 0,
}

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '36px 32px',
  border: '1px solid rgba(45,45,45,0.06)',
}

const h1 = {
  fontFamily: '"Fraunces", Georgia, serif',
  fontSize: '24px',
  fontWeight: 600,
  color: '#2D2D2D',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 28px',
  textAlign: 'center' as const,
}

const link = { color: '#7D8F69', textDecoration: 'underline' }
const plainLink = { color: '#7D8F69', textDecoration: 'underline', wordBreak: 'break-all' as const }

const buttonWrap = { textAlign: 'center' as const, margin: '0 0 24px' }

const button = {
  backgroundColor: '#7D8F69',
  color: '#FCFBFA',
  fontSize: '15px',
  fontWeight: 500,
  borderRadius: '999px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}

const mutedText = {
  fontSize: '12px',
  color: '#9a9a9a',
  lineHeight: '1.6',
  textAlign: 'center' as const,
  margin: '0 0 8px',
}

const hr = { borderColor: 'rgba(45,45,45,0.08)', margin: '28px 0 20px' }

const footer = {
  fontSize: '12px',
  color: '#9a9a9a',
  textAlign: 'center' as const,
  margin: 0,
}
