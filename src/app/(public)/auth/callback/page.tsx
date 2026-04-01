/**
 * OAuth callback page. The Supabase browser client auto-detects
 * tokens from the URL hash fragment via onAuthStateChange.
 * Waits for authentication, then redirects to dashboard.
 */
'use client'

import { Redirect } from '@/components/redirect'
import { useAuth } from '@/context/auth-provider'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    )

  if (isAuthenticated) return <Redirect to="/dashboard" />

  return <Redirect to="/auth?error=auth_callback_failed" />
}
