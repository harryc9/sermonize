/**
 * Public landing page — product explainer with CTA to sign up.
 */
import { Button } from '@/components/ui/button'
import { BookOpen, Clock, FileText, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#fafafa] px-6">
      <div className="max-w-lg space-y-10">
        <div className="space-y-4">
          <span className="font-serif text-2xl font-semibold tracking-tight text-gray-900">
            Sermonize
          </span>
          <h1 className="font-serif text-5xl font-semibold leading-[1.1] text-gray-900">
            Talk to any
            <br />
            sermon
          </h1>
          <p className="text-lg leading-relaxed text-gray-400">
            Paste a YouTube sermon and have a conversation about it — pull
            exact quotes, find verses, explore themes, jump to timestamps.
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <FileText size={20} className="mt-0.5 shrink-0 text-gray-300" />
            <div>
              <p className="font-medium text-gray-900">Sermon notes</p>
              <p className="text-sm text-gray-400">
                Auto-generated structured notes with key points, scripture
                references, and takeaways
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <BookOpen size={20} className="mt-0.5 shrink-0 text-gray-300" />
            <div>
              <p className="font-medium text-gray-900">Verse & quote lookup</p>
              <p className="text-sm text-gray-400">
                Ask about any passage and get the exact transcript with context
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MessageSquare size={20} className="mt-0.5 shrink-0 text-gray-300" />
            <div>
              <p className="font-medium text-gray-900">Natural conversation</p>
              <p className="text-sm text-gray-400">
                Chat freely — ask questions, request summaries, dig into themes
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Clock size={20} className="mt-0.5 shrink-0 text-gray-300" />
            <div>
              <p className="font-medium text-gray-900">Timestamped references</p>
              <p className="text-sm text-gray-400">
                Every answer links back to the exact moment in the sermon
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/auth">
            <Button className="h-12 rounded-lg bg-primary px-10 text-base font-medium text-primary-foreground hover:bg-primary/90">
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
