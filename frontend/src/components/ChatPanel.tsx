import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  MessageSquare,
  X,
  Minimize2,
  Send,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Dna,
} from 'lucide-react'
import type { ChatMessage, ChatSource, SuggestionItem } from '../types/chat'
import { sendChatMessage, getChatSuggestions, clearChatSession } from '../api/chat'

interface ChatPanelProps {
  onVariantClick?: (variantId: string) => void
}

export default function ChatPanel({ onVariantClick }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem('genemaprchat_session')
    if (stored) return stored
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem('genemaprchat_session', id)
    return id
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load messages from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('genemaprchat_messages')
    if (stored) {
      try {
        setMessages(JSON.parse(stored))
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  // Save messages to sessionStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('genemaprchat_messages', JSON.stringify(messages))
    }
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Load suggestions when panel opens and no messages
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadSuggestions()
    }
  }, [isOpen, messages.length])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const loadSuggestions = async () => {
    try {
      const data = await getChatSuggestions()
      setSuggestions(data.suggestions)
    } catch {
      // Silently fail - suggestions are non-critical
    }
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await sendChatMessage({
        message: text.trim(),
        session_id: sessionId,
        variant_context: true,
      })

      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: response.reply,
        sources: response.sources,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now(),
        error: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleClearChat = async () => {
    try {
      await clearChatSession(sessionId)
    } catch {
      // Continue clearing locally even if backend fails
    }
    setMessages([])
    sessionStorage.removeItem('genemaprchat_messages')
    loadSuggestions()
  }

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRetry = (content: string) => {
    // Remove the error message and resend
    setMessages((prev) => prev.slice(0, -1))
    sendMessage(content)
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
              bg-gradient-to-br from-dna-cyan to-blue-600
              shadow-glow-cyan flex items-center justify-center
              hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition-shadow"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <MessageSquare className="w-6 h-6 text-white" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-dna-magenta rounded-full
                text-xs text-white flex items-center justify-center font-mono-variant">
                {messages.filter((m) => m.role === 'assistant').length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px]
                flex flex-col
                bg-bg-primary/80 backdrop-blur-2xl
                border-l border-dna-cyan/15
                shadow-[-8px_0_30px_rgba(0,212,255,0.08)]"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-5 py-4 border-b border-slate-700/50
                bg-gradient-to-r from-dna-cyan/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-dna-cyan/20 to-dna-magenta/20
                      flex items-center justify-center border border-dna-cyan/20">
                      <Sparkles className="w-5 h-5 text-dna-cyan" />
                    </div>
                    <div>
                      <h2 className="text-sm font-headline font-bold text-slate-100">
                        GeneMapr AI Assistant
                      </h2>
                      <p className="text-xs text-slate-500 font-body">
                        Variant analysis chat
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleClearChat}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
                      title="Clear conversation"
                    >
                      <Trash2 className="w-4 h-4 text-slate-500 group-hover:text-dna-magenta transition-colors" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
                      title="Minimize"
                    >
                      <Minimize2 className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
                      title="Close"
                    >
                      <X className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
                {/* Empty State with Suggestions */}
                {messages.length === 0 && (
                  <motion.div
                    className="flex flex-col items-center justify-center h-full text-center px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-dna-cyan/10 to-dna-magenta/10
                      flex items-center justify-center mb-4 border border-dna-cyan/10">
                      <Dna className="w-8 h-8 text-dna-cyan/60" />
                    </div>
                    <h3 className="text-sm font-headline font-semibold text-slate-300 mb-1">
                      Ask about your variants
                    </h3>
                    <p className="text-xs text-slate-500 mb-6 font-body max-w-[280px]">
                      I can help analyze your genomic dataset, explain clinical significance, and identify key findings.
                    </p>

                    {suggestions.length > 0 && (
                      <div className="space-y-2 w-full">
                        {suggestions.map((s, i) => (
                          <motion.button
                            key={i}
                            className="w-full text-left px-4 py-3 rounded-xl
                              glass-panel border border-slate-700/30
                              hover:border-dna-cyan/30 hover:bg-dna-cyan/5
                              transition-all group"
                            onClick={() => sendMessage(s.text)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.05 }}
                            whileHover={{ x: 4 }}
                          >
                            <div className="flex items-center gap-3">
                              <ChevronRight className="w-4 h-4 text-dna-cyan/40 group-hover:text-dna-cyan
                                transition-colors flex-shrink-0" />
                              <span className="text-xs text-slate-400 group-hover:text-slate-200
                                transition-colors font-body leading-relaxed">
                                {s.text}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Message Bubbles */}
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={`max-w-[85%] group relative ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-dna-cyan/20 to-blue-600/20 border border-dna-cyan/20 rounded-2xl rounded-br-md'
                          : msg.error
                          ? 'glass-panel border border-dna-magenta/20 rounded-2xl rounded-bl-md'
                          : 'glass-panel border border-slate-700/30 rounded-2xl rounded-bl-md'
                      } px-4 py-3`}
                    >
                      {/* Message content */}
                      {msg.role === 'user' ? (
                        <p className="text-sm text-slate-200 font-body whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      ) : (
                        <div className="text-sm text-slate-300 font-body chat-markdown">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                              strong: ({ children }) => <strong className="text-slate-100 font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="text-slate-400 italic">{children}</em>,
                              code: ({ children, className }) => {
                                const isBlock = className?.includes('language-')
                                if (isBlock) {
                                  return (
                                    <code className="block bg-black/30 rounded-lg p-3 my-2 font-mono-variant text-xs text-dna-cyan overflow-x-auto">
                                      {children}
                                    </code>
                                  )
                                }
                                return (
                                  <code className="px-1.5 py-0.5 bg-dna-cyan/10 text-dna-cyan rounded font-mono-variant text-xs">
                                    {children}
                                  </code>
                                )
                              },
                              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 ml-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 ml-1">{children}</ol>,
                              li: ({ children }) => <li className="text-slate-300">{children}</li>,
                              a: ({ href, children }) => (
                                <a href={href} className="text-dna-cyan hover:underline" target="_blank" rel="noopener noreferrer">
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Source chips */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-700/30">
                          {msg.sources.map((source: ChatSource, sIdx: number) => (
                            <button
                              key={sIdx}
                              onClick={() => onVariantClick?.(source.variant_id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md
                                bg-dna-cyan/10 border border-dna-cyan/20
                                text-xs font-mono-variant text-dna-cyan
                                hover:bg-dna-cyan/20 hover:border-dna-cyan/40
                                transition-all cursor-pointer"
                              title={source.relevance || undefined}
                            >
                              <Dna className="w-3 h-3" />
                              {source.gene || 'variant'}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Timestamp + action buttons */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-600 font-mono-variant">
                          {formatTime(msg.timestamp)}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-white/5 transition-colors"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-dna-green" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500" />
                            )}
                          </button>
                          {msg.error && idx === messages.length - 1 && (
                            <button
                              onClick={() => {
                                // Find the last user message to retry
                                const lastUserMsg = [...messages]
                                  .reverse()
                                  .find((m) => m.role === 'user')
                                if (lastUserMsg) handleRetry(lastUserMsg.content)
                              }}
                              className="p-1 rounded hover:bg-white/5 transition-colors"
                              title="Retry"
                            >
                              <RotateCcw className="w-3 h-3 text-dna-amber" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="glass-panel border border-slate-700/30 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <motion.div
                          className="w-2 h-2 rounded-full bg-dna-cyan"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-dna-cyan"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-dna-cyan"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex-shrink-0 px-4 py-3 border-t border-slate-700/50
                bg-gradient-to-t from-bg-primary/50 to-transparent">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your variants..."
                      rows={1}
                      className="w-full resize-none rounded-xl px-4 py-3 pr-10
                        bg-white/5 border border-slate-700/50
                        focus:border-dna-cyan/40 focus:bg-white/8
                        focus:ring-1 focus:ring-dna-cyan/20
                        text-sm text-slate-200 placeholder-slate-600
                        font-body outline-none transition-all
                        max-h-32 scrollbar-thin"
                      style={{ minHeight: '44px' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        target.style.height = `${Math.min(target.scrollHeight, 128)}px`
                      }}
                      disabled={isLoading}
                    />
                    <span className="absolute right-3 bottom-2 text-[10px] text-slate-600 font-mono-variant pointer-events-none">
                      {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+↵
                    </span>
                  </div>
                  <motion.button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    className="flex-shrink-0 w-11 h-11 rounded-xl
                      bg-gradient-to-br from-dna-cyan to-blue-600
                      flex items-center justify-center
                      disabled:opacity-30 disabled:cursor-not-allowed
                      hover:shadow-glow-cyan transition-shadow"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
