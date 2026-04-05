const thumbnails = [
  {
    bg: 'bg-[#0f0f0f]',
    accent: '#ff6b35',
    label: 'WHEN GOD SAYS WAIT',
    sublabel: "Don't Give Up On Your Promise",
    channel: 'Elevation Church',
    views: '2.4M views',
    ago: '3 weeks ago',
    duration: '41:22',
    initials: 'EC',
    avatarBg: 'bg-purple-600',
  },
  {
    bg: 'bg-[#1a1a2e]',
    accent: '#f5c518',
    label: 'THE FAVOR OF GOD',
    sublabel: 'Walking in His Blessing',
    channel: 'Steven Furtick',
    views: '1.8M views',
    ago: '1 month ago',
    duration: '38:07',
    initials: 'SF',
    avatarBg: 'bg-orange-500',
  },
]

export function YoutubeThumbnails({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="relative h-[340px] w-[320px]">
        {/* Back card */}
        <div className="absolute left-8 top-0 w-[280px] rotate-[-5deg] overflow-hidden rounded-xl shadow-2xl">
          <ThumbnailCard {...thumbnails[0]} />
        </div>

        {/* Front card */}
        <div className="absolute bottom-0 right-0 w-[280px] rotate-[3deg] overflow-hidden rounded-xl shadow-2xl">
          <ThumbnailCard {...thumbnails[1]} />
        </div>
      </div>
    </div>
  )
}

type ThumbnailProps = (typeof thumbnails)[number]

function ThumbnailCard({ bg, accent, label, sublabel, channel, views, ago, duration, initials, avatarBg }: ThumbnailProps) {
  return (
    <div className="bg-white">
      {/* 16:9 thumbnail */}
      <div className={`relative ${bg} pb-[56.25%]`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
          <span className="text-base font-black leading-tight tracking-wide text-white" style={{ color: accent }}>
            {label}
          </span>
          <span className="text-[11px] font-medium text-white/70">{sublabel}</span>
        </div>
        {/* Duration badge */}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
          {duration}
        </span>
      </div>

      {/* Card meta */}
      <div className="flex gap-2.5 px-3 py-2.5">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${avatarBg} text-[10px] font-bold text-white`}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold leading-snug text-gray-900">{channel}</p>
          <p className="text-[11px] text-gray-400">{views} · {ago}</p>
        </div>
      </div>
    </div>
  )
}
