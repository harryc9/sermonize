'use client'

import { useRef, useState } from 'react'
import { Upload, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function validate(f: File): string | null {
  if (f.type !== 'application/pdf') return 'Please upload a PDF file'
  if (f.size > MAX_FILE_SIZE) return 'PDF must be under 50MB'
  return null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  onSubmit: (file: File) => void
  isLoading?: boolean
}

export function PdfUpload({ onSubmit, isLoading }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleFile(f: File) {
    const err = validate(f)
    if (err) {
      setValidationError(err)
      setFile(null)
    } else {
      setValidationError(null)
      setFile(f)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors duration-150',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50',
        )}
      >
        {file ? (
          <>
            <FileText size={24} className="text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-400">{formatBytes(file.size)} · click to change</p>
            </div>
          </>
        ) : (
          <>
            <Upload size={24} className={isDragging ? 'text-primary' : 'text-gray-300'} />
            <div>
              <p className="text-sm text-gray-600">Drop a PDF here or click to browse</p>
              <p className="mt-0.5 text-xs text-gray-400">
                Sermon notes, devotionals, study booklets — any religious text · up to 50MB
              </p>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {validationError && (
        <p className="text-sm text-destructive">{validationError}</p>
      )}

      {file && (
        <Button
          type="button"
          onClick={() => onSubmit(file)}
          isLoading={isLoading}
          className="w-full rounded-lg"
        >
          Load Document
        </Button>
      )}
    </div>
  )
}
