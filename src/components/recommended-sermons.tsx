'use client'

import { useQuery } from '@tanstack/react-query'
import { authenticatedFetch } from '@/lib/api-client'
import type { CachedRecommendedSermon } from '@/inngest/functions/refresh-recommended-sermons'

type Props = {
  onSelect: (params: { url: string; youtubeId: string }) => void
}

async function fetchRecommended(): Promise<CachedRecommendedSermon[]> {
  const res = await authenticatedFetch('/api/sermons/recommended')
  if (!res.ok) throw new Error('Failed to load recommendations')
  const json = await res.json()
  return json.sermons
}

export function RecommendedSermons({ onSelect }: Props) {
  const { data: sermons } = useQuery({
    queryKey: ['sermons', 'recommended'],
    queryFn: fetchRecommended,
  })

  if (!sermons?.length) return null

  return (
    <div className="w-full max-w-3xl mx-auto mt-12">
      <p className="text-sm uppercase tracking-widest text-gray-400 font-medium mb-4">
        Popular sermons
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {sermons.map((sermon) => (
          <button
            key={sermon.youtube_id}
            onClick={() =>
              onSelect({ url: sermon.youtube_url, youtubeId: sermon.youtube_id })
            }
            className="text-left group"
          >
            <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 mb-2">
              <img
                src={sermon.thumbnail_url}
                alt={sermon.title}
                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
              />
            </div>
            <div className="min-h-[3.5rem]">
              <p className="text-sm text-gray-900 line-clamp-2 leading-snug">{sermon.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{sermon.channel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
