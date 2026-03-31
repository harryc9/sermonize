/**
 * Client-side providers (Auth + React Query) wrapping the app.
 */
'use client'

import { AuthProvider } from '@/context/auth-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRef } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useRef(
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
        },
      },
    }),
  )

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient.current}>
        {children}
      </QueryClientProvider>
    </AuthProvider>
  )
}
