import * as React from 'react'

import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import * as brand from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={brand.main}>
      <Container style={brand.outerContainer}>
        <Section style={brand.wordmarkSection}>
          <Text style={brand.wordmark}>Layerly</Text>
        </Section>

        <Container style={brand.card}>
          <Heading style={brand.h1}>Confirm it's you</Heading>
          <Text style={brand.text}>Use this code to confirm your identity:</Text>

          <Text style={brand.codeStyle}>{token}</Text>

          <Hr style={brand.hr} />

          <Text style={brand.footer}>
            This code expires shortly. If you didn't request it, you can safely ignore this
            email.
          </Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
