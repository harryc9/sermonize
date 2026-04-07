'use client'

/**
 * Dashboard input for the Passages study mode. Accepts:
 *  - Free-form Bible references typed into the textarea
 *  - Pasted images (Cmd+V from clipboard)
 *  - Drag-and-dropped image files
 *  - Image files chosen via the upload button
 *
 * On submit, calls /api/passages/parse and hands the result to the parent
 * for the confirmation step.
 */
import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { authenticatedFetch } from '@/lib/api-client'
import type { ParsedRef } from '@/lib/bible/usfm'
import type { FetchedPassage } from '@/lib/bible/fetch-passages'
import { X, Paperclip } from 'lucide-react'

type ParseResult = {
  refs: ParsedRef[]
  passages: FetchedPassage[]
  warning?: string
}

type Props = {
  onParsed: (result: ParseResult & { rawInput: string }) => void
}

export function PassagesInput({ onParsed }: Props) {
  const [text, setText] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api/passages/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim() || undefined,
          imageBase64: imageBase64 ?? undefined,
          imageMimeType: imageMimeType ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to parse')
      return data as ParseResult
    },
    onSuccess: (data) => {
      if (data.refs.length === 0) {
        setError(data.warning ?? 'No Bible references found in your input.')
        return
      }
      onParsed({ ...data, rawInput: text.trim() })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to parse input')
    },
  })

  function ingestFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [, base64] = result.split(',')
      setImageBase64(base64)
      setImageMimeType(file.type)
      setImagePreview(result)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) ingestFile(file)
        return
      }
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!isDraggingOver) setIsDraggingOver(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingOver(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) ingestFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) ingestFile(file)
    // Reset so picking the same file again still triggers onChange
    e.target.value = ''
  }

  function clearImage() {
    setImageBase64(null)
    setImageMimeType(null)
    setImagePreview(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!text.trim() && !imageBase64) {
      setError('Type a reference, drag in an image, or paste a screenshot.')
      return
    }
    parseMutation.mutate()
  }

  const isLoading = parseMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full rounded-2xl border bg-background transition-colors duration-150 ${
          isDraggingOver
            ? 'border-primary bg-primary/5'
            : 'border-gray-200'
        }`}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          rows={imagePreview ? 2 : 4}
          placeholder={
            imagePreview
              ? 'Add notes (optional) or just hit Start Study'
              : 'Type passages like "Romans 8:1-17; Proverbs 20" — or drop in a screenshot of your reading plan'
          }
          className="w-full resize-none rounded-2xl bg-transparent px-4 pt-3 pb-12 text-sm placeholder:text-gray-400 focus-visible:outline-none"
        />

        {imagePreview && (
          <div className="relative inline-block px-4 pb-3">
            <img
              src={imagePreview}
              alt="Reading plan"
              className="max-h-48 rounded-lg border border-gray-200"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-2 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-background text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Toolbar pinned to the bottom-left of the input */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-900"
            aria-label="Upload an image"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {isDraggingOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-primary/5 text-sm text-primary">
            Drop image to upload
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Upload, drag, or paste an image of your reading plan
        </p>
        <Button
          type="submit"
          isLoading={isLoading}
          className="rounded-lg px-6"
        >
          Start Study
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
