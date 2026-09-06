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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.outerContainer}>
        <Section style={brand.wordmarkSection}>
          <Text style={brand.wordmark}>Layerly</Text>
        </Section>

        <Container style={brand.card}>
          <Heading style={brand.h1}>You've been invited</Heading>
          <Text style={brand.text}>
            You've been invited to join{' '}
            <Link href={siteUrl} style={brand.link}>
              {siteName}
            </Link>
            . Click the button below to accept and create your account.
          </Text>

          <Section style={brand.buttonWrap}>
            <Button style={brand.button} href={confirmationUrl}>
              Accept invitation
            </Button>
          </Section>

          <Text style={brand.mutedText}>
            Button not working?{' '}
            <Link href={confirmationUrl} style={brand.plainLink}>
              Accept the invitation here
            </Link>
            .
          </Text>

          <Hr style={brand.hr} />

          <Text style={brand.footer}>
            If you weren't expecting this invitation, you can safely ignore this email.
          </Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
