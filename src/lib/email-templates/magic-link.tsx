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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.outerContainer}>
        <Section style={brand.wordmarkSection}>
          <Text style={brand.wordmark}>Layerly</Text>
        </Section>

        <Container style={brand.card}>
          <Heading style={brand.h1}>Your login link</Heading>
          <Text style={brand.text}>
            Click the button below to log in to {siteName}. This link will expire shortly.
          </Text>

          <Section style={brand.buttonWrap}>
            <Button style={brand.button} href={confirmationUrl}>
              Log in
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
            If you didn't request this link, you can safely ignore this email.
          </Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
