/**
 * Sidebar listing saved sermons with navigation. Collapsible on mobile.
 */
'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import { Plus, Menu, X, LogOut, Loader2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-provider'
import { authenticatedFetch } from '@/lib/api-client'

const STUCK_THRESHOLD_MINUTES = 45

type SermonListItem = {
  id: string
  title: string | null
  youtube_id: string
  status: string
  processing_step: string | null
  created_at: string
}

const STEP_LABELS: Record<string, string> = {
  downloading: 'Downloading audio…',
  transcribing: 'Transcribing…',
  saving: 'Saving…',
}

type DateGroup = { label: string; sermons: SermonListItem[] }

function groupSermonsByDate(sermons: SermonListItem[]): DateGroup[] {
  const now = DateTime.now().startOf('day')
  const buckets: Record<string, SermonListItem[]> = {}
  const order: string[] = []

  for (const sermon of sermons) {
    const dt = DateTime.fromISO(sermon.created_at).toLocal().startOf('day')
    const diff = now.diff(dt, 'days').days

    let label: string
    if (diff < 1) label = 'Today'
    else if (diff < 2) label = 'Yesterday'
    else if (diff < 7) label = 'Last 7 days'
    else if (diff < 30) label = 'Last 30 days'
    else label = dt.toFormat('MMMM yyyy')

    if (!buckets[label]) {
      buckets[label] = []
      order.push(label)
    }
    buckets[label].push(sermon)
  }

  return order.map((label) => ({ label, sermons: buckets[label] }))
}

function getSermonListQueryKey() {
  return ['sermons', 'list'] as const
}

async function fetchSermons(): Promise<SermonListItem[]> {
  const res = await authenticatedFetch('/api/sermons')
  if (!res.ok) throw new Error('Failed to load sermons')
  const json = await res.json()
  return json.sermons
}

export function useInvalidateSermonList() {
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getSermonListQueryKey() })
  }, [queryClient])
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const params = useParams()
  const activeId = params?.id as string | undefined
  const { isAuthenticated, signOut, user } = useAuth()
  const queryClient = useQueryClient()

  const prevStatusesRef = useRef<Record<string, string>>({})

  const { data: sermons = [], isLoading: sermonsLoading } = useQuery({
    queryKey: getSermonListQueryKey(),
    queryFn: fetchSermons,
    enabled: isAuthenticated,
    refetchInterval: (query) =>
      query.state.data?.some(
        (s) => s.status === 'pending' || s.status === 'processing',
      )
        ? 5000
        : false,
    select: (data) => {
      const prev = prevStatusesRef.current
      for (const sermon of data) {
        const wasProcessing = prev[sermon.id] === 'pending' || prev[sermon.id] === 'processing'
        if (wasProcessing && sermon.status === 'completed') {
          toast.success(`"${sermon.title || 'Sermon'}" is ready`, {
            action: {
              label: 'Open',
              onClick: () => router.push(`/s/${sermon.id}`),
            },
          })
        }
      }
      prevStatusesRef.current = Object.fromEntries(data.map((s) => [s.id, s.status]))
      return data
    },
  })

  const [retriedAt, setRetriedAt] = useState<Record<string, number>>({})

  const retryMutation = useMutation({
    mutationFn: async (sermonId: string) => {
      const res = await authenticatedFetch(`/api/sermons/${sermonId}/retry`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Retry failed')
      return sermonId
    },
    onSuccess: (sermonId) => {
      setRetriedAt((prev) => ({ ...prev, [sermonId]: DateTime.now().toMillis() }))
      queryClient.invalidateQueries({ queryKey: getSermonListQueryKey() })
    },
  })

  function handleNavigate(path: string) {
    router.push(path)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-3 top-3 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-[#fafafa] transition-transform duration-200 md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-serif text-lg font-semibold">Sermonize</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate('/dashboard')}
            title="New sermon"
          >
            <Plus size={18} />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {!sermonsLoading && sermons.filter((s) => s.status !== 'error').length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No sermons yet
            </p>
          )}
          {groupSermonsByDate(sermons.filter((s) => s.status !== 'error')).map((group) => (
            <div key={group.label} className="mb-1">
              <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-widest text-gray-400">
                {group.label}
              </p>
              {group.sermons.map((sermon) => {
                const isTranscribing = sermon.status === 'pending' || sermon.status === 'processing'
                const retryTime = retriedAt[sermon.id]
                const lastActivity = retryTime
                  ? DateTime.fromMillis(retryTime)
                  : DateTime.fromISO(sermon.created_at)
                const isStuck =
                  isTranscribing &&
                  lastActivity.diffNow('minutes').minutes < -STUCK_THRESHOLD_MINUTES
                const isRetrying = retryMutation.isPending && retryMutation.variables === sermon.id

                const stepLabel = isTranscribing
                  ? (sermon.processing_step && STEP_LABELS[sermon.processing_step]) || 'Processing…'
                  : null

                return (
                  <button
                    key={sermon.id}
                    onClick={() => handleNavigate(`/s/${sermon.id}`)}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100',
                      activeId === sermon.id && 'bg-gray-100',
                    )}
                  >
                    <div className="relative mt-0.5 shrink-0">
                      <img
                        src={`https://img.youtube.com/vi/${sermon.youtube_id}/mqdefault.jpg`}
                        alt=""
                        className={cn(
                          'h-7 w-12 rounded object-cover',
                          isTranscribing && 'opacity-40',
                        )}
                      />
                      {isTranscribing && (
                        <Loader2
                          size={14}
                          className="absolute inset-0 m-auto animate-spin text-gray-500"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {sermon.title || 'Untitled Sermon'}
                      </p>
                      {isStuck ? (
                        <span
                          role="button"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!isRetrying) retryMutation.mutate(sermon.id)
                          }}
                        >
                          {isRetrying ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <RotateCw size={10} />
                          )}
                          Stuck — retry
                        </span>
                      ) : (
                        <p className="text-xs text-gray-400">
                          {stepLabel ?? DateTime.fromISO(sermon.created_at).toRelative()}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t px-4 py-3">
          <button
            onClick={async () => {
              queryClient.clear()
              await signOut()
              window.location.href = '/auth'
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <LogOut size={14} />
            <span className="truncate">{user?.email ?? 'Sign out'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
