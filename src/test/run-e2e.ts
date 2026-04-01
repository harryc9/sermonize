/**
 * E2E test runner using Stagehand (AI browser automation).
 * Creates a confirmed test user via Supabase Admin API,
 * launches a local Chrome instance, and runs auth E2E tests.
 *
 * Usage: bun run test:e2e
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })
import { Stagehand } from '@browserbasehq/stagehand'
import { createClient } from '@supabase/supabase-js'
import { DateTime } from 'luxon'
import {
  testEmailSignIn,
  testEmailSignInWrongPassword,
  testGoogleOAuthSignIn,
} from './e2e/auth.e2e'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const TEST_EMAIL = `e2e-${DateTime.now().toMillis()}@sermonize-test.com`
const TEST_PASSWORD = 'E2E_TestPass_123!'

type TestEntry = {
  name: string
  fn: (stagehand: Stagehand) => Promise<void>
  flaky?: boolean
}

const tests: TestEntry[] = [
  {
    name: 'Email sign-in with valid credentials',
    fn: (sh) => testEmailSignIn(sh, { email: TEST_EMAIL, password: TEST_PASSWORD }),
  },
  {
    name: 'Email sign-in with wrong password',
    fn: (sh) => testEmailSignInWrongPassword(sh, TEST_EMAIL),
  },
]

const googleEmail = process.env.TEST_GOOGLE_EMAIL
const googlePassword = process.env.TEST_GOOGLE_PASSWORD

if (googleEmail && googlePassword) {
  tests.push({
    name: 'Google OAuth full sign-in',
    fn: (sh) =>
      testGoogleOAuthSignIn(sh, {
        email: googleEmail,
        password: googlePassword,
      }),
    flaky: true,
  })
} else {
  console.log(
    '[SKIP] Google OAuth test — set TEST_GOOGLE_EMAIL and TEST_GOOGLE_PASSWORD to enable',
  )
}

async function main() {
  let testUserId: string | undefined
  let stagehand: Stagehand | undefined

  try {
    // Create confirmed test user
    console.log(`\nCreating test user: ${TEST_EMAIL}`)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })

    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message ?? 'no user'}`)
    }
    testUserId = data.user.id
    console.log(`Test user created: ${testUserId}\n`)

    // Launch Stagehand
    stagehand = new Stagehand({
      env: 'LOCAL',
      model: {
        modelName: 'gpt-4.1',
        apiKey: process.env.OPENAI_API_KEY,
      },
    })
    await stagehand.init()

    // Run tests
    let passed = 0
    let failed = 0
    let skipped = 0

    for (const test of tests) {
      console.log(`\n--- ${test.name} ---`)
      try {
        await test.fn(stagehand)
        passed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (test.flaky) {
          console.log(`[FLAKY FAIL] ${test.name}: ${msg}`)
          skipped++
        } else {
          console.error(`[FAIL] ${test.name}: ${msg}`)
          failed++
        }
      }
    }

    console.log(`\n========================================`)
    console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} flaky`)
    console.log(`========================================\n`)

    if (failed > 0) {
      process.exit(1)
    }
  } finally {
    // Cleanup
    if (stagehand) {
      await stagehand.close().catch(() => {})
    }
    if (testUserId) {
      console.log(`Cleaning up test user: ${testUserId}`)
      await supabaseAdmin.auth.admin.deleteUser(testUserId)
    }
  }
}

main().catch((err) => {
  console.error('E2E runner crashed:', err)
  process.exit(1)
})
