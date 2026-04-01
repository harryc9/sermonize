/**
 * Integration tests for auth flows against real Supabase cloud.
 * Creates a confirmed test user via admin API, then verifies
 * sign-in, token validation, and cleanup with real calls.
 */
import { NextRequest } from 'next/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authenticateRequest, authenticateToken } from '@/lib/api-auth'
import { sbc } from '@/lib/supabase.client'
import { supabaseServer } from '@/lib/supabase.server'

const TEST_EMAIL = `test-${crypto.randomUUID()}@sermonize-test.com`
const TEST_PASSWORD = 'TestPass_Integration_123!'

let testUserId: string
let accessToken: string

beforeAll(async () => {
  const { data, error } = await supabaseServer.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message ?? 'no user returned'}`)
  }

  testUserId = data.user.id
})

afterAll(async () => {
  if (testUserId) {
    await supabaseServer.auth.admin.deleteUser(testUserId)
  }
})

describe('email/password sign-in', () => {
  it('signs in with valid credentials and returns a session', async () => {
    const { data, error } = await sbc.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    expect(error).toBeNull()
    expect(data.session).not.toBeNull()
    expect(data.session!.access_token).toBeTruthy()
    expect(data.user).not.toBeNull()
    expect(data.user!.email).toBe(TEST_EMAIL)
    expect(data.user!.id).toBe(testUserId)

    accessToken = data.session!.access_token
  })

  it('rejects sign-in with wrong password', async () => {
    const { data, error } = await sbc.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: 'WrongPassword999!',
    })

    expect(error).not.toBeNull()
    expect(data.session).toBeNull()
  })

  it('rejects sign-in with non-existent email', async () => {
    const { data, error } = await sbc.auth.signInWithPassword({
      email: 'nonexistent-user@sermonize-test.com',
      password: TEST_PASSWORD,
    })

    expect(error).not.toBeNull()
    expect(data.session).toBeNull()
  })
})

describe('Bearer token validation (authenticateRequest)', () => {
  it('validates a real access token and returns correct userId', async () => {
    const request = new NextRequest('http://localhost:4004/api/test', {
      headers: { authorization: `Bearer ${accessToken}` },
    })

    const result = await authenticateRequest(request)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.userId).toBe(testUserId)
    }
  })

  it('rejects a garbage token with 401', async () => {
    const request = new NextRequest('http://localhost:4004/api/test', {
      headers: { authorization: 'Bearer garbage-invalid-token' },
    })

    const result = await authenticateRequest(request)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(401)
    }
  })

  it('rejects a missing Authorization header with 401', async () => {
    const request = new NextRequest('http://localhost:4004/api/test')

    const result = await authenticateRequest(request)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(401)
    }
  })
})

describe('token validation (authenticateToken)', () => {
  it('validates a real access token and returns correct userId', async () => {
    const result = await authenticateToken(accessToken)

    expect(result).toEqual({ success: true, userId: testUserId })
  })

  it('rejects a garbage token', async () => {
    const result = await authenticateToken('garbage-invalid-token')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
  })

  it('rejects an empty token', async () => {
    const result = await authenticateToken('')

    expect(result).toEqual({ success: false, error: 'No token provided' })
  })
})

describe('sign out', () => {
  it('clears the session', async () => {
    const { error } = await sbc.auth.signOut()

    expect(error).toBeNull()

    const { data } = await sbc.auth.getSession()
    expect(data.session).toBeNull()
  })
})
