import { ArrowUp } from 'lucide-react'

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
  {
    bg: 'bg-[#0d1f0d]',
    accent: '#7ddb7d',
    label: 'YOU ARE ENOUGH',
    sublabel: 'Breaking Free From Comparison',
    channel: 'Joyce Meyer',
    views: '3.1M views',
    ago: '2 months ago',
    duration: '44:51',
    initials: 'JM',
    avatarBg: 'bg-emerald-600',
  },
]

const chatMessages = [
  {
    role: 'assistant' as const,
    text: `I've loaded "When God Says Wait." Ask me anything — find exact quotes, look up Bible verses, explore themes, or jump to any moment.`,
  },
  {
    role: 'user' as const,
    text: 'What verse did he use about waiting on God?',
  },
  {
    role: 'assistant' as const,
    text: 'He referenced Isaiah 40:31 at [12:47] — "Those who wait on the Lord shall renew their strength; they shall mount up with wings like eagles." He called it the anchor verse for the whole message.',
  },
  {
    role: 'user' as const,
    text: 'What were the 3 main points?',
  },
]

export function HeroVisual({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-start justify-center gap-6 ${className}`}>
      {/* Thumbnails column */}
      <div className="relative h-[420px] w-[210px] shrink-0">
        <div className="absolute left-0 top-0 w-[185px] rotate-[-7deg] overflow-hidden rounded-xl shadow-xl">
          <ThumbnailCard {...thumbnails[0]} />
        </div>
        <div className="absolute left-[15px] top-[120px] w-[185px] rotate-[-1deg] overflow-hidden rounded-xl shadow-xl">
          <ThumbnailCard {...thumbnails[2]} />
        </div>
        <div className="absolute left-[30px] top-[240px] w-[185px] rotate-[3deg] overflow-hidden rounded-xl shadow-xl">
          <ThumbnailCard {...thumbnails[1]} />
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex h-[420px] w-[240px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-b px-3 py-2.5">
          <p className="truncate text-xs font-medium text-gray-900">When God Says Wait</p>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-2.5 overflow-hidden p-3">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          <div className="flex justify-start">
            <div className="rounded-2xl bg-gray-100 px-3 py-2 text-sm">
              <span className="inline-flex gap-0.5">
                <span className="animate-bounce text-gray-400" style={{ animationDelay: '0ms' }}>·</span>
                <span className="animate-bounce text-gray-400" style={{ animationDelay: '120ms' }}>·</span>
                <span className="animate-bounce text-gray-400" style={{ animationDelay: '240ms' }}>·</span>
              </span>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t p-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
            <span className="flex-1 text-[11px] text-gray-400">Ask anything...</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary">
              <ArrowUp size={10} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type ThumbnailProps = (typeof thumbnails)[number]

function ThumbnailCard({ bg, accent, label, sublabel, channel, views, ago, duration, initials, avatarBg }: ThumbnailProps) {
  return (
    <div className="bg-white">
      <div className={`relative ${bg} pb-[56.25%]`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center">
          <span className="text-[13px] font-black leading-tight tracking-wide" style={{ color: accent }}>
            {label}
          </span>
          <span className="text-[10px] font-medium text-white/70">{sublabel}</span>
        </div>
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 py-0.5 text-[9px] font-medium text-white">
          {duration}
        </span>
      </div>
      <div className="flex gap-2 px-2.5 py-2">
        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${avatarBg} text-[9px] font-bold text-white`}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-snug text-gray-900">{channel}</p>
          <p className="text-[10px] text-gray-400">{views} · {ago}</p>
        </div>
      </div>
    </div>
  )
}
