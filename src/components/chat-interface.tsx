'use client'

import { Button } from '@/components/ui/button'
import { sbc } from '@/lib/supabase.client'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { BIBLE_VERSE_RE, buildVerseUrl } from '@/lib/bible-utils'
import { ArrowUp } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'

function flatMapChildren(
  children: ReactNode,
  fn: (child: ReactNode) => ReactNode[],
): ReactNode {
  if (Array.isArray(children))
    return children.flatMap((child) => flatMapChildren(child, fn))
  return fn(children)
}

type ChatInterfaceProps = {
  sermonId: string
  sermonTitle: string | null
  initialMessages?: UIMessage[]
  onTimestampClick?: (seconds: number) => void
  headerActions?: ReactNode
}

const TIMESTAMP_RE = /\(?\[(\d{1,2}:\d{2}(?::\d{2})?)\]\)?/g

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return parts[0] * 60 + parts[1]
}

export function ChatInterface({ sermonId, sermonTitle, initialMessages, onTimestampClick, headerActions }: ChatInterfaceProps) {
  const [input, setInput] = useState('')

  const welcomeMessage: UIMessage = useMemo(
    () => ({
      id: 'welcome',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: `I've loaded the sermon${sermonTitle ? ` "${sermonTitle}"` : ''}. Ask me anything — I can find specific quotes, Bible verses, key themes, timestamps, or give you a summary.`,
        },
      ],
    }),
    [sermonTitle],
  )

  const seedMessages = useMemo(() => {
    if (initialMessages && initialMessages.length > 0)
      return [welcomeMessage, ...initialMessages]
    return [welcomeMessage]
  }, [welcomeMessage, initialMessages])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { sermonId },
        headers: async () => {
          const { data } = await sbc.auth.getSession()
          return {
            Authorization: `Bearer ${data.session?.access_token ?? ''}`,
          }
        },
      }),
    [sermonId],
  )

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: seedMessages,
  })

  const isLoading = status === 'streaming' || status === 'submitted'
  const bottomElRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasMountScrolledRef = useRef(false)

  const bottomRefCallback = useCallback((node: HTMLDivElement | null) => {
    bottomElRef.current = node
    if (node && !hasMountScrolledRef.current) {
      hasMountScrolledRef.current = true
      requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: 'instant' })
      })
    }
  }, [])

  const lastMessage = messages[messages.length - 1]
  const lastMessageText = lastMessage ? getMessageText(lastMessage) : ''
  const prevScrollTriggerRef = useRef({ count: messages.length, textLen: 0 })

  if (
    messages.length !== prevScrollTriggerRef.current.count ||
    (isLoading && lastMessageText.length !== prevScrollTriggerRef.current.textLen)
  ) {
    prevScrollTriggerRef.current = { count: messages.length, textLen: lastMessageText.length }
    queueMicrotask(() => {
      bottomElRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  function getMessageText(message: UIMessage): string {
    return message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''
  }

  const renderWithTimestamps = useCallback(
    (children: ReactNode): ReactNode => {
      if (!onTimestampClick) return children

      return flatMapChildren(children, (child) => {
        if (typeof child !== 'string') return [child]
        const parts: ReactNode[] = []
        let lastIndex = 0
        const regex = new RegExp(TIMESTAMP_RE.source, 'g')
        let match: RegExpExecArray | null

        while ((match = regex.exec(child)) !== null) {
          if (match.index > lastIndex)
            parts.push(child.slice(lastIndex, match.index))

          const ts = match[1]
          const seconds = parseTimestampToSeconds(ts)
          parts.push(
            <button
              key={`${ts}-${match.index}`}
              type="button"
              onClick={() => onTimestampClick(seconds)}
              className="inline-flex cursor-pointer items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {ts}
            </button>,
          )
          lastIndex = regex.lastIndex
        }

        if (lastIndex === 0) return [child]
        if (lastIndex < child.length) parts.push(child.slice(lastIndex))
        return parts
      })
    },
    [onTimestampClick],
  )

  const renderWithVerseLinks = useCallback(
    (children: ReactNode): ReactNode => {
      return flatMapChildren(children, (child) => {
        if (typeof child !== 'string') return [child]
        const parts: ReactNode[] = []
        let lastIndex = 0
        const regex = new RegExp(BIBLE_VERSE_RE.source, 'gi')
        let match: RegExpExecArray | null

        while ((match = regex.exec(child)) !== null) {
          if (match.index > lastIndex)
            parts.push(child.slice(lastIndex, match.index))

          const verseRef = match[0]
          const url = buildVerseUrl(verseRef)
          parts.push(
            <a
              key={`${verseRef}-${match.index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary/60"
            >
              {verseRef}
            </a>,
          )
          lastIndex = regex.lastIndex
        }

        if (lastIndex === 0) return [child]
        if (lastIndex < child.length) parts.push(child.slice(lastIndex))
        return parts
      })
    },
    [],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b px-4 py-3">
        <h2 className="truncate pl-10 text-sm font-medium md:pl-0">
          {sermonTitle || 'Sermon Chat'}
        </h2>
        {headerActions && <div className="shrink-0">{headerActions}</div>}
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{renderWithVerseLinks(renderWithTimestamps(children))}</p>,
                      strong: ({ children }) => (
                        <strong className="font-semibold">{renderWithVerseLinks(renderWithTimestamps(children))}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>
                      ),
                      li: ({ children }) => <li className="mb-1">{renderWithVerseLinks(renderWithTimestamps(children))}</li>,
                      code: ({ children }) => (
                        <code className="rounded bg-background/50 px-1 py-0.5 text-xs">
                          {children}
                        </code>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-primary/30 pl-3 italic">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {getMessageText(message)}
                  </ReactMarkdown>
                ) : (
                  getMessageText(message)
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>·</span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRefCallback} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="mx-auto flex max-w-3xl gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
              bottomElRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Ask about the sermon..."
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-lg shrink-0">
            <ArrowUp size={16} />
          </Button>
        </div>
      </form>
    </div>
  )
}
