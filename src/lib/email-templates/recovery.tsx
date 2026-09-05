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
import * as brand from './brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.outerContainer}>
        <Section style={brand.wordmarkSection}>
          <Text style={brand.wordmark}>Layerly</Text>
        </Section>

        <Container style={brand.card}>
          <Heading style={brand.h1}>Reset your password</Heading>
          <Text style={brand.text}>
            We received a request to reset your password for {siteName}. Click the button below
            to choose a new one.
          </Text>

          <Section style={brand.buttonWrap}>
            <Button style={brand.button} href={confirmationUrl}>
              Reset password
            </Button>
          </Section>

          <Text style={brand.mutedText}>
            Or paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={brand.plainLink}>
              {confirmationUrl}
            </Link>
          </Text>

          <Hr style={brand.hr} />

          <Text style={brand.footer}>
            If you didn't request a password reset, you can safely ignore this email — your
            password won't be changed.
          </Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
