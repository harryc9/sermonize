/**
 * Auth context provider using browser Supabase client.
 * Manages session state and exposes useAuth() hook.
 */
'use client'

import { sbc } from '@/lib/supabase.client'
import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type AuthState = {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

type AuthContextType = AuthState & {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    async function loadSession() {
      try {
        const { data, error } = await sbc.auth.getSession()
        if (error) throw error

        setState({
          user: data.session?.user ?? null,
          session: data.session,
          isLoading: false,
          isAuthenticated: !!data.session,
        })
      } catch (error) {
        console.error('Error loading auth session:', error)
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = sbc.auth.onAuthStateChange(async (_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    try {
      setState((prev) => ({ ...prev, isLoading: true }))
      await sbc.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  async function refreshSession() {
    try {
      setState((prev) => ({ ...prev, isLoading: true }))
      const { data, error } = await sbc.auth.getSession()
      if (error) throw error

      setState({
        user: data.session?.user ?? null,
        session: data.session,
        isLoading: false,
        isAuthenticated: !!data.session,
      })
    } catch (error) {
      console.error('Error refreshing session:', error)
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
