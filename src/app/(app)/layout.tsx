/**
 * Authenticated app shell — sidebar + main content area.
 * Redirects to /auth when session is missing.
 */
'use client'

import { Redirect } from '@/components/redirect'
import { Sidebar } from '@/components/sidebar'
import { useAuth } from '@/context/auth-provider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect to="/auth" />

  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
