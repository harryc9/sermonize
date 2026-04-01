/**
 * Shown when a sermon doesn't exist or hasn't finished transcribing.
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SermonNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-gray-900">
          Sermon not found
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          This sermon doesn&apos;t exist or is still being transcribed. Try again in a moment.
        </p>
      </div>
      <Link href="/dashboard">
        <Button>
          <ArrowLeft size={16} />
          Back to home
        </Button>
      </Link>
    </div>
  )
}
