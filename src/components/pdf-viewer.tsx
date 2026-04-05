'use client'

type Props = {
  url: string
}

export function PdfViewer({ url }: Props) {
  return (
    <iframe
      src={url}
      className="h-full w-full border-0"
      title="Sermon PDF"
    />
  )
}
