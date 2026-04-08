/**
 * Processing state UI for a sermon that's being downloaded/transcribed.
 * Shows the YouTube embed, a step indicator, and polls for completion.
 */
'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Download, AudioLines, Save, FileText, Check, Loader2, AlertCircle, RotateCw, ScanText, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authenticatedFetch } from '@/lib/api-client'
import { useInvalidateSermonList } from '@/components/sidebar'
import { cn } from '@/lib/utils'

type Props = {
  sermon: {
    id: string
    title: string | null
    youtube_id: string | null
    source_type: string
    status: string
    processing_step: string | null
  }
}

type StatusResponse = {
  id: string
  status: string
  error: string | null
  title: string | null
  processing_step: string | null
}

const YOUTUBE_STEPS = [
  { key: 'downloading', label: 'Downloading audio', icon: Download },
  { key: 'transcribing', label: 'Transcribing sermon', icon: AudioLines },
  { key: 'generating_notes', label: 'Generating notes', icon: FileText },
  { key: 'saving', label: 'Saving', icon: Save },
] as const

const PDF_STEPS = [
  { key: 'extracting', label: 'Extracting text', icon: ScanText },
  { key: 'generating_notes', label: 'Generating notes', icon: FileText },
] as const

const PASSAGES_STEPS = [
  { key: 'fetching_passages', label: 'Looking up verses', icon: BookOpen },
  { key: 'generating_notes', label: 'Generating notes', icon: FileText },
] as const


export function SermonProcessingView({ sermon }: Props) {
  const router = useRouter()
  const invalidateSermonList = useInvalidateSermonList()

  const { data } = useQuery<StatusResponse>({
    queryKey: ['sermon', sermon.id, 'status'],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/sermons/${sermon.id}/status`)
      if (!res.ok) throw new Error('Failed to fetch status')
      return res.json()
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'error') return false
      return 3000
    },
  })

  const currentStatus = data?.status ?? sermon.status
  const currentStep = data?.processing_step ?? sermon.processing_step
  const currentTitle = data?.title ?? sermon.title
  const isError = currentStatus === 'error'

  if (currentStatus === 'completed') {
    invalidateSermonList()
    router.refresh()
    return null
  }

  const isPdf = sermon.source_type === 'pdf'
  const isPassages = sermon.source_type === 'passages'
  const steps = isPassages ? PASSAGES_STEPS : isPdf ? PDF_STEPS : YOUTUBE_STEPS
  const activeIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      {!isPdf && !isPassages && sermon.youtube_id && (
        <div className="w-full max-w-lg">
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-gray-200 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${sermon.youtube_id}?rel=0&modestbranding=1`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-6">
        {currentTitle && (
          <h2 className="text-center font-serif text-xl font-semibold text-gray-900">
            {currentTitle}
          </h2>
        )}

        {isError ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">
                {data?.error ?? (isPdf || isPassages ? 'Processing failed' : 'Transcription failed')}
              </span>
            </div>
            <Button
              onClick={async () => {
                await authenticatedFetch(`/api/sermons/${sermon.id}/retry`, {
                  method: 'POST',
                })
                router.refresh()
              }}
            >
              <RotateCw size={16} />
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {steps.map((step, i) => {
                const isActive = i === activeIndex
                const isComplete = i < activeIndex
                const Icon = step.icon

                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                        isComplete && 'bg-gray-900 text-white',
                        isActive && 'bg-gray-900 text-white',
                        !isComplete && !isActive && 'bg-gray-100 text-gray-300',
                      )}
                    >
                      {isComplete ? (
                        <Check size={14} />
                      ) : isActive ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Icon size={14} />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm transition-colors',
                        isActive && 'font-medium text-gray-900',
                        isComplete && 'text-gray-500',
                        !isComplete && !isActive && 'text-gray-300',
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-sm text-gray-400">
              {isPdf || isPassages ? 'This may take a moment.' : 'This may take a while for longer sermons.'}
              <br />
              Feel free to close this page — we&apos;ll notify you when it&apos;s ready.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
