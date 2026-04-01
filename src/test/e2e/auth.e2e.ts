/**
 * Stagehand E2E auth tests — run against localhost:4004 with a real browser.
 * Uses AI (OpenAI gpt-4.1) to interpret the page and execute natural language actions.
 * No brittle selectors — self-healing when UI changes.
 */
import type { Stagehand } from '@browserbasehq/stagehand'

const BASE_URL = 'http://localhost:4004'

async function waitForUrlContaining(
  page: ReturnType<Stagehand['context']['pages']>[0],
  substring: string,
  timeoutMs = 15_000,
) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (page.url().includes(substring)) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(
    `Timed out waiting for URL containing "${substring}" (current: ${page.url()})`,
  )
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function testEmailSignIn(
  stagehand: Stagehand,
  credentials: { email: string; password: string },
) {
  const page = stagehand.context.pages()[0]
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })

  await stagehand.act('click the "Sign in" text link at the bottom of the form')
  await stagehand.act(`type %email% into the email field`, {
    variables: { email: credentials.email },
  })
  await stagehand.act(`type %password% into the password field`, {
    variables: { password: credentials.password },
  })
  await stagehand.act('click the "Sign in" submit button')

  await waitForUrlContaining(page, '/dashboard')

  // Clear session so subsequent tests start unauthenticated
  await page.evaluate(() => localStorage.clear())
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })

  console.log('[PASS] testEmailSignIn — redirected to /dashboard')
}

export async function testEmailSignInWrongPassword(
  stagehand: Stagehand,
  email: string,
) {
  const page = stagehand.context.pages()[0]
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })

  await stagehand.act('click the "Sign in" text link at the bottom of the form')
  await stagehand.act(`type %email% into the email field`, {
    variables: { email },
  })
  await stagehand.act('type "WrongPassword999!" into the password field')
  await stagehand.act('click the "Sign in" submit button')

  await sleep(3_000)

  const errorText = await stagehand.extract(
    'extract any error message shown on the page',
  )

  if (!errorText) {
    throw new Error('Expected error message for wrong password, got none')
  }

  console.log('[PASS] testEmailSignInWrongPassword — error displayed')
}

export async function testGoogleOAuthSignIn(
  stagehand: Stagehand,
  google: { email: string; password: string },
) {
  const page = stagehand.context.pages()[0]
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' })

  await stagehand.act('click the "Continue with Google" button')

  await waitForUrlContaining(page, 'accounts.google.com', 10_000)

  await stagehand.act('type %email% into the email field and click Next', {
    variables: { email: google.email },
  })

  await sleep(3_000)

  await stagehand.act('type %password% into the password field and click Next', {
    variables: { password: google.password },
  })

  await sleep(3_000)

  const url = page.url()
  if (url.includes('consent') || url.includes('oauthchooseaccount')) {
    await stagehand.act(
      'click the "Continue" or "Allow" button to grant access',
    )
  }

  await waitForUrlContaining(page, '/dashboard')

  console.log('[PASS] testGoogleOAuthSignIn — redirected to /dashboard')
}
