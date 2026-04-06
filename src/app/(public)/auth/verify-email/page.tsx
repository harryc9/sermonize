/**
 * Post-signup page — tells the user to check their email for a confirmation link.
 */
'use client'

import { Redirect } from '@/components/redirect'
import { useAuth } from '@/context/auth-provider'
import { Mail } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (!isLoading && isAuthenticated) return <Redirect to="/dashboard" />

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-xl font-semibold text-gray-900">
            Check your email
          </h1>
          <p className="text-sm leading-relaxed text-gray-400">
            We sent you a confirmation link. Click the link in your email to
            activate your account.
          </p>
        </div>
        <p className="text-sm text-gray-400">
          Already confirmed?{' '}
          <Link
            href="/auth"
            className="font-medium text-gray-900 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
