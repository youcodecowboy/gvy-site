'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import {
  Send,
  X,
  Loader2,
  FileText,
  Folder,
  Sparkles,
  Trash2,
  Copy,
  Check,
  Plus,
  ChevronDown,
  MessageSquare,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import ReactMarkdown from 'react-markdown'

type ContextType = 'document' | 'folder' | 'custom'

interface AIChatPanelProps {
  docId?: Id<'nodes'>
  docTitle?: string
  folderId?: Id<'nodes'>
  folderTitle?: string
  parentFolderId?: Id<'nodes'>
  isOpen: boolean
  onClose: () => void
}

const SUGGESTED_PROMPTS = [
  { label: 'Summarize this document', prompt: 'Summarize this document in a few key points.' },
  { label: 'Write an introduction', prompt: 'Write an introduction paragraph for this document.' },
  { label: 'Explain in simple terms', prompt: 'Explain this content in simple terms.' },
  { label: 'Generate action items', prompt: 'Generate a list of action items based on this content.' },
]

export function AIChatPanel({
  docId,
  docTitle,
  folderId,
  folderTitle,
  parentFolderId,
  isOpen,
  onClose,
}: AIChatPanelProps) {
  const [activeChatId, setActiveChatId] = useState<Id<'aiChats'> | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isWriting, setIsWriting] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [writtenId, setWrittenId] = useState<string | null>(null)
  const [showChatList, setShowChatList] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextType, setContextType] = useState<ContextType>('document')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Convex queries and mutations
  const chat = useAction(api.ai.chat)
  const writeToDocument = useAction(api.ai.writeToDocument)
  const createChat = useMutation(api.aiChats.createChat)
  const addMessage = useMutation(api.aiChats.addMessage)
  const archiveChat = useMutation(api.aiChats.archiveChat)

  // Get chats for this document/folder
  const chats = useQuery(
    api.aiChats.listChats,
    docId ? { documentId: docId, limit: 10 } : folderId ? { folderId, limit: 10 } : { limit: 10 }
  )

  // Get messages for active chat
  const messages = useQuery(
    api.aiChats.getChatMessages,
    activeChatId ? { chatId: activeChatId } : 'skip'
  )

  // Get active chat details
  const activeChat = useQuery(
    api.aiChats.getChat,
    activeChatId ? { chatId: activeChatId } : 'skip'
  )

  // Auto-select most recent chat or create new one
  useEffect(() => {
    if (chats && chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0]._id)
    }
  }, [chats, activeChatId])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Update context type from active chat
  useEffect(() => {
    if (activeChat) {
      setContextType(activeChat.contextType)
    }
  }, [activeChat])

  const handleNewChat = async () => {
    try {
      const chatId = await createChat({
        contextType,
        documentId: contextType === 'document' ? docId : undefined,
        folderId: contextType === 'folder' ? (parentFolderId || folderId) : undefined,
      })
      setActiveChatId(chatId)
      setShowChatList(false)
    } catch (error) {
      console.error('Failed to create chat:', error)
    }
  }

  const handleSend = useCallback(async (message?: string) => {
    const content = message || input.trim()
    if (!content || isLoading) return

    setInput('')
    setIsLoading(true)

    try {
      // Create chat if none exists
      let chatId = activeChatId
      if (!chatId) {
        chatId = await createChat({
          contextType,
          documentId: contextType === 'document' ? docId : undefined,
          folderId: contextType === 'folder' ? (parentFolderId || folderId) : undefined,
        })
        setActiveChatId(chatId)
      }

      // Save user message
      await addMessage({
        chatId,
        role: 'user',
        content,
      })

      // Build conversation history from saved messages
      const conversationHistory = (messages || []).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Call AI
      const response = await chat({
        message: content,
        documentId: contextType === 'document' ? docId : undefined,
        folderId: contextType === 'folder' ? (parentFolderId || folderId) : undefined,
        conversationHistory,
        mode: 'chat',
      })

      // Save assistant response
      await addMessage({
        chatId,
        role: 'assistant',
        content: response,
      })
    } catch (error) {
      console.error('AI chat error:', error)
      // Save error message if we have a chat
      if (activeChatId) {
        await addMessage({
          chatId: activeChatId,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, chat, docId, folderId, parentFolderId, activeChatId, createChat, addMessage, contextType])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleWriteToDoc = async (content: string, id: string) => {
    if (!docId || isWriting) return

    setIsWriting(id)
    try {
      const result = await writeToDocument({
        documentId: docId,
        content,
        mode: 'append',
      })

      if (result.success) {
        setWrittenId(id)
        setTimeout(() => setWrittenId(null), 2000)
      } else {
        console.error('Failed to write to document:', result.error)
      }
    } catch (error) {
      console.error('Error writing to document:', error)
    } finally {
      setIsWriting(null)
    }
  }

  const handleArchiveChat = async () => {
    if (!activeChatId) return
    try {
      await archiveChat({ chatId: activeChatId })
      setActiveChatId(null)
    } catch (error) {
      console.error('Failed to archive chat:', error)
    }
  }

  const handleContextChange = (newType: ContextType) => {
    setContextType(newType)
    setShowContextMenu(false)
  }

  if (!isOpen) return null

  const contextLabel = contextType === 'document'
    ? docTitle || 'This document'
    : contextType === 'folder'
      ? folderTitle || 'This folder'
      : 'Custom'

  return (
    <div className="ai-chat-panel">
      {/* Header */}
      <header className="ai-chat-header">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Disco</h2>
            {/* Context scope selector */}
            <div className="relative">
              <button
                onClick={() => setShowContextMenu(!showContextMenu)}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {contextType === 'document' ? (
                  <FileText className="h-3 w-3" />
                ) : (
                  <Folder className="h-3 w-3" />
                )}
                <span className="truncate max-w-[150px]">{contextLabel}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showContextMenu && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-xl py-1 z-50 min-w-[200px]">
                  <button
                    onClick={() => handleContextChange('document')}
                    className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-muted transition-colors ${contextType === 'document' ? 'bg-muted' : 'bg-background'}`}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">This document</div>
                      <div className="text-xs text-muted-foreground">Context from current doc</div>
                    </div>
                    {contextType === 'document' && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </button>
                  <button
                    onClick={() => handleContextChange('folder')}
                    className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-muted transition-colors ${contextType === 'folder' ? 'bg-muted' : 'bg-background'}`}
                  >
                    <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">Parent folder</div>
                      <div className="text-xs text-muted-foreground">Context from all docs in folder</div>
                    </div>
                    {contextType === 'folder' && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Chat list toggle */}
          <button
            onClick={() => setShowChatList(!showChatList)}
            className={`p-2 rounded-lg transition-colors ${showChatList ? 'bg-accent' : 'hover:bg-accent'}`}
            title="Chat history"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </button>
          {/* New chat */}
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="New chat"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
          {/* Delete chat */}
          {activeChatId && (
            <button
              onClick={handleArchiveChat}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              title="Delete chat"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Chat list sidebar */}
      {showChatList && (
        <div className="border-b border-border bg-muted/30 p-2 max-h-48 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Recent Chats</div>
          {chats && chats.length > 0 ? (
            <div className="space-y-1">
              {chats.map((chatItem) => (
                <button
                  key={chatItem._id}
                  onClick={() => {
                    setActiveChatId(chatItem._id)
                    setShowChatList(false)
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm truncate transition-colors ${
                    chatItem._id === activeChatId
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  {chatItem.title}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground px-2">No chats yet</div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="ai-chat-messages">
        {!messages || messages.length === 0 ? (
          <div className="ai-chat-empty">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Hey, I'm Disco!</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {contextType === 'document' && docTitle
                ? `I can help you understand, write, and edit "${docTitle}". Ask me anything!`
                : contextType === 'folder'
                  ? `I can help you with all documents in this folder.`
                  : 'I can help you write, edit, and understand your content.'}
            </p>
            <div className="grid gap-2">
              {SUGGESTED_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleSend(item.prompt)}
                  className="ai-chat-suggestion"
                >
                  <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-chat-message-list">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`ai-chat-message ${message.role === 'user' ? 'ai-chat-message-user' : 'ai-chat-message-assistant'}`}
              >
                <div className="ai-chat-message-avatar">
                  {message.role === 'user' ? (
                    <span className="text-xs font-medium">You</span>
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>
                <div className="ai-chat-message-content">
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  {message.role === 'assistant' && (
                    <div className="ai-chat-message-actions">
                      <button
                        onClick={() => handleCopy(message.content, message._id)}
                        className="ai-chat-action-btn"
                        title="Copy to clipboard"
                      >
                        {copiedId === message._id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {docId && (
                        <button
                          onClick={() => handleWriteToDoc(message.content, message._id)}
                          className="ai-chat-action-btn"
                          title="Add to document"
                          disabled={isWriting === message._id}
                        >
                          {isWriting === message._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : writtenId === message._id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="ai-chat-message ai-chat-message-assistant">
                <div className="ai-chat-message-avatar">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="ai-chat-message-content">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="ai-chat-input-container">
        <div className="ai-chat-input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // Auto-resize textarea up to 4 lines
              const textarea = e.target
              textarea.style.height = 'auto'
              const lineHeight = 24 // approximate line height
              const maxHeight = lineHeight * 4 // 4 lines max
              textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask Disco anything..."
            className="ai-chat-input"
            rows={1}
            style={{ resize: 'none', overflow: 'auto', maxHeight: '96px' }}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="ai-chat-send-btn"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {docId ? 'Disco can read and write to this document' : 'AI can make mistakes. Verify important information.'}
        </p>
      </div>
    </div>
  )
}
