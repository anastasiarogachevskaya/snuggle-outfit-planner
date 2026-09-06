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
    <Body style={brand.main}>
      <Container style={brand.outerContainer}>
        <Section style={brand.wordmarkSection}>
          <Text style={brand.wordmark}>Layerly</Text>
        </Section>

        <Container style={brand.card}>
          <Heading style={brand.h1}>Confirm your email</Heading>
          <Text style={brand.text}>
            Thanks for signing up for{' '}
            <Link href={siteUrl} style={brand.link}>
              {siteName}
            </Link>
            . Confirm{' '}
            <Link href={`mailto:${recipient}`} style={brand.link}>
              {recipient}
            </Link>{' '}
            to start getting weather-ready outfit picks for your baby.
          </Text>

          <Section style={brand.buttonWrap}>
            <Button style={brand.button} href={confirmationUrl}>
              Confirm email
            </Button>
          </Section>

          <Text style={brand.mutedText}>
            Button not working?{' '}
            <Link href={confirmationUrl} style={brand.plainLink}>
              Confirm your email here
            </Link>
            .
          </Text>

          <Hr style={brand.hr} />

          <Text style={brand.footer}>
            If you didn't create a Layerly account, you can safely ignore this email.
          </Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
