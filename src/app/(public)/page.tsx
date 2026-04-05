/**
 * Public landing page — product explainer with hero illustration and CTA.
 */
'use client'
import { BackgroundDecoration } from '@/components/landing/background-decoration'
import { HeroVisual } from '@/components/landing/hero-visual'
import { Button } from '@/components/ui/button'
import { BookOpen, FileText, MessageSquare } from 'lucide-react'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#fafafa]">
      <BackgroundDecoration />

      {/* Top nav */}
      <header className="relative z-10 px-10 py-6">
        <span className="font-serif text-2xl font-semibold tracking-tight text-gray-900">
          Sermonize
        </span>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
      <div className="grid max-w-5xl w-full items-center gap-12 md:grid-cols-2 md:gap-20">
        <div className="space-y-10">
          <div className="space-y-4">
            <h1 className="font-serif leading-relaxed text-5xl font-semibold text-gray-900 sm:text-6xl">
              Go deeper in the Bible
            </h1>
            <p className="text-lg leading-relaxed text-gray-400">
              Paste any sermon from YouTube and turn it into a personal study — notes, verses, and conversation, all in one place.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <FileText size={20} className="mt-0.5 shrink-0 text-orange-300" />
              <div>
                <p className="font-medium text-gray-900">Retain what you heard</p>
                <p className="text-sm text-gray-400">
                  Structured notes capture every key point, verse, and takeaway so nothing slips away
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <BookOpen size={20} className="mt-0.5 shrink-0 text-orange-300" />
              <div>
                <p className="font-medium text-gray-900">Find exactly what was said</p>
                <p className="text-sm text-gray-400">
                  Pull any quote or passage word for word, with full context
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MessageSquare size={20} className="mt-0.5 shrink-0 text-orange-300" />
              <div>
                <p className="font-medium text-gray-900">Keep the conversation going</p>
                <p className="text-sm text-gray-400">
                  Ask questions and dig into any theme or verse from the sermon
                </p>
              </div>
            </div>
          </div>

          <div>
            <Link href="/auth">
              <Button className="h-12 rounded-lg bg-primary px-10 text-base font-medium text-primary-foreground hover:bg-primary/90">
                Get started
              </Button>
            </Link>
          </div>
        </div>

        <HeroVisual className="hidden w-full justify-self-center md:flex" />
      </div>
      </div>
    </div>
  )
}
