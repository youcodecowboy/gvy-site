'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useEditor, EditorContent, EditorContext } from '@tiptap/react'
import { useMutation, useQuery } from 'convex/react'
import { TiptapCollabProvider } from '@tiptap-pro/provider'
import { Doc as YDoc } from 'yjs'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

// --- Tiptap Core Extensions ---
import { StarterKit } from '@tiptap/starter-kit'
import { Mention } from '@tiptap/extension-mention'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TextAlign } from '@tiptap/extension-text-align'
import { Typography } from '@tiptap/extension-typography'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Selection, Placeholder } from '@tiptap/extensions'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { UniqueID } from '@tiptap/extension-unique-id'
import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'
import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji'
import { Collaboration, isChangeOrigin } from '@tiptap/extension-collaboration'
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret'

// --- TipTap Pro Extensions ---
import { Ai } from '@tiptap-pro/extension-ai'
import { CommentsKit } from '@tiptap-pro/extension-comments'

// --- UI Primitives ---
import { Spacer } from '@/components/tiptap-ui-primitive/spacer'
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from '@/components/tiptap-ui-primitive/toolbar'

// --- Tiptap Node Extensions ---
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension'
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension'
import { Image } from '@/components/tiptap-node/image-node/image-node-extension'
import { NodeBackground } from '@/components/tiptap-extension/node-background-extension'
import { NodeAlignment } from '@/components/tiptap-extension/node-alignment-extension'
import { UiState } from '@/components/tiptap-extension/ui-state-extension'
import { ListNormalizationExtension } from '@/components/tiptap-extension/list-normalization-extension'

// --- Section Link Node ---
import { SectionLinkNode } from '@/components/tiptap-node/section-link-node'

// --- Table Node ---
import { TableKit } from '@/components/tiptap-node/table-node/extensions/table-node-extension'
import { TableHandleExtension } from '@/components/tiptap-node/table-node/extensions/table-handle'
import { TableHandle } from '@/components/tiptap-node/table-node/ui/table-handle/table-handle'
import { TableSelectionOverlay } from '@/components/tiptap-node/table-node/ui/table-selection-overlay'
import { TableCellHandleMenu } from '@/components/tiptap-node/table-node/ui/table-cell-handle-menu'
import { TableExtendRowColumnButtons } from '@/components/tiptap-node/table-node/ui/table-extend-row-column-button'

// --- Tiptap UI Components ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu'
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button'
import { ExportDropdown } from '@/components/tiptap-ui/export-dropdown'
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu'
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button'
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button'
import { ColorHighlightPopover } from '@/components/tiptap-ui/color-highlight-popover'
import { LinkPopover } from '@/components/tiptap-ui/link-popover'
import { MarkButton } from '@/components/tiptap-ui/mark-button'
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button'
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button'
import { MessageSquare, X } from 'lucide-react'
import { ThreadPopover } from '@/components/tiptap-ui/thread-popover/thread-popover'
import { ThreadsPanel } from '@/components/threads/ThreadsPanel'

// --- Notion-like UI Components ---
import { EmojiDropdownMenu } from '@/components/tiptap-ui/emoji-dropdown-menu'
import { MentionDropdownMenu } from '@/components/tiptap-ui/mention-dropdown-menu'
import { SlashDropdownMenu } from '@/components/tiptap-ui/slash-dropdown-menu'
import { DragContextMenu } from '@/components/tiptap-ui/drag-context-menu'
import { AiMenu } from '@/components/tiptap-ui/ai-menu'

// --- Floating Toolbar ---
import { NotionToolbarFloating } from '@/components/tiptap-templates/notion-like/notion-like-editor-toolbar-floating'

// --- Auto Format Button ---
import { AutoFormatButton } from '@/components/tiptap-ui/auto-format-button'

// --- Contexts ---
import { UserProvider, useTiptapUser } from '@/contexts/user-context'
import { useToc } from '@/components/tiptap-node/toc-node/context/toc-context'

// --- Hooks ---
import { useIsBreakpoint } from '@/hooks/use-is-breakpoint'

// --- Lib ---
import { MAX_FILE_SIZE } from '@/lib/tiptap-utils'
import {
  TIPTAP_AI_APP_ID,
  TIPTAP_COLLAB_APP_ID,
  TIPTAP_COLLAB_DOC_PREFIX,
} from '@/lib/tiptap-collab-utils'
import { transformPastedHTMLColors } from '@/lib/paste-color-handler'

// --- Node Styles ---
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss'
import '@/components/tiptap-node/code-block-node/code-block-node.scss'
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss'
import '@/components/tiptap-node/list-node/list-node.scss'
import '@/components/tiptap-node/image-node/image-node.scss'
import '@/components/tiptap-node/heading-node/heading-node.scss'
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss'
import '@/components/tiptap-node/table-node/styles/prosemirror-table.scss'
import '@/components/tiptap-node/table-node/styles/table-node.scss'
import '@/components/tiptap-node/section-link-node/section-link-node.scss'

// --- Template Styles ---
import '@/components/tiptap-templates/notion-like/notion-like-editor.scss'
import '@/components/editor/comments.scss'
import '@/components/threads/thread-styles.scss'

interface TipTapEditorProps {
  docId: string
  docTitle: string
  content: any
  versionString?: string
  onSavingChange?: (isSaving: boolean) => void
  scrollToPosition?: { from: number; to: number }
  aiToken?: string | null
  collabToken?: string | null
  showThreads?: boolean
  onToggleThreads?: () => void
  threadCount?: number
}

interface CollaboratorInfo {
  clientId: number
  user: {
    id: string
    name: string
    color: string
    avatar?: string
  }
}

// Main Toolbar Content Component
function MainToolbarContent({
  isMobile,
  showComments,
  onToggleComments,
  commentCount = 0,
  hasProvider = false,
  docId,
  docTitle,
  versionString,
}: {
  isMobile: boolean
  showComments?: boolean
  onToggleComments?: () => void
  commentCount?: number
  hasProvider?: boolean
  docId: string
  docTitle?: string
  versionString?: string
}) {
  return (
    <>
      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3]} portal={isMobile} />
        <ListDropdownMenu
          types={['bulletList', 'orderedList', 'taskList']}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="underline" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <ColorHighlightPopover />
        <LinkPopover />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Image" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ExportDropdown
          docId={docId}
          docTitle={docTitle || 'Untitled'}
          versionString={versionString}
        />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <AutoFormatButton />
      </ToolbarGroup>

      {hasProvider && onToggleComments && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
            <button
              onClick={onToggleComments}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors
                ${showComments
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }
              `}
              title="Toggle comments"
            >
              <MessageSquare className="h-4 w-4" />
              {commentCount > 0 && (
                <span className="text-xs">{commentCount}</span>
              )}
            </button>
          </ToolbarGroup>
        </>
      )}

      <Spacer />
    </>
  )
}

// Collaborators display component
function CollaboratorsDisplay({ collaborators }: { collaborators: CollaboratorInfo[] }) {
  if (collaborators.length === 0) return null
  
  return (
    <div className="flex items-center gap-1">
      {collaborators.slice(0, 5).map((collab) => (
        <div
          key={collab.clientId}
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
          style={{ backgroundColor: collab.user.color }}
          title={collab.user.name}
        >
          {collab.user.avatar ? (
            <img 
              src={collab.user.avatar} 
              alt={collab.user.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            collab.user.name.charAt(0).toUpperCase()
          )}
        </div>
      ))}
      {collaborators.length > 5 && (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
          +{collaborators.length - 5}
        </div>
      )}
    </div>
  )
}

// Inner editor component with collaboration
function TipTapEditorInner({
  docId,
  docTitle,
  content: initialContent,
  versionString,
  onSavingChange,
  scrollToPosition,
  aiToken,
  collabToken,
  showThreads: showThreadsProp,
  onToggleThreads: onToggleThreadsProp,
  threadCount: threadCountProp,
}: TipTapEditorProps & {
  aiToken: string | null
  collabToken: string | null
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const getFileUrl = useMutation(api.files.getFileUrl)
  const updateContent = useMutation(api.nodes.updateContent)
  const createMentions = useMutation(api.mentions.createMentions)
  const createComment = useMutation(api.comments.createComment)
  const isMobile = useIsBreakpoint()
  const { setTocContent } = useToc()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const { user } = useTiptapUser()
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showThreadsInternal, setShowThreadsInternal] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)

  // Use controlled props when provided, otherwise use internal state
  const isThreadsControlled = showThreadsProp !== undefined
  const showThreads = isThreadsControlled ? showThreadsProp : showThreadsInternal
  const setShowThreads = isThreadsControlled
    ? (value: boolean | ((prev: boolean) => boolean)) => {
        // When controlled, we need to call the prop handler to toggle
        const newValue = typeof value === 'function' ? value(showThreadsProp!) : value
        if (newValue !== showThreadsProp && onToggleThreadsProp) {
          onToggleThreadsProp()
        }
      }
    : setShowThreadsInternal
  const [threads, setThreads] = useState<any[]>([])
  const [threadPopoverPosition, setThreadPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const [isSynced, setIsSynced] = useState(false)
  const [isCloudEmpty, setIsCloudEmpty] = useState(false)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [pendingScrollPosition, setPendingScrollPosition] = useState<{ from: number; to: number } | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editorReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use refs for values accessed in callbacks to prevent editor recreation
  const docIdRef = useRef(docId)
  const docTitleRef = useRef(docTitle)
  const userRef = useRef(user)
  const onSavingChangeRef = useRef(onSavingChange)
  const updateContentRef = useRef(updateContent)
  const createMentionsRef = useRef(createMentions)
  
  // Store initial content in a ref so it doesn't cause editor recreation
  // Only use the first non-null value
  const initialContentRef = useRef(initialContent)
  if (initialContent && !initialContentRef.current) {
    initialContentRef.current = initialContent
  }
  
  // Keep refs in sync
  useEffect(() => {
    docIdRef.current = docId
    docTitleRef.current = docTitle
    userRef.current = user
    onSavingChangeRef.current = onSavingChange
    updateContentRef.current = updateContent
    createMentionsRef.current = createMentions
  }, [docId, docTitle, user, onSavingChange, updateContent, createMentions])

  // Reset state when document changes
  useEffect(() => {
    setIsSynced(false)
    setIsCloudEmpty(false)
    setIsEditorReady(false)

    // Clear any existing timeout
    if (editorReadyTimeoutRef.current) {
      clearTimeout(editorReadyTimeoutRef.current)
    }

    // Set a timeout to mark editor ready (fallback for non-collab mode or slow sync)
    editorReadyTimeoutRef.current = setTimeout(() => {
      console.log('Editor ready (timeout fallback)')
      setIsEditorReady(true)
    }, 500)

    return () => {
      if (editorReadyTimeoutRef.current) {
        clearTimeout(editorReadyTimeoutRef.current)
      }
    }
  }, [docId])

  // Create Yjs document for each document
  const ydoc = useMemo(() => {
    console.log('Creating new YDoc for:', docId)
    return new YDoc()
  }, [docId])

  // Create collaboration provider
  const provider = useMemo(() => {
    if (!collabToken || !TIPTAP_COLLAB_APP_ID) {
      console.log('Collaboration disabled - no token or app ID')
      return null
    }

    const documentName = `${TIPTAP_COLLAB_DOC_PREFIX}${docId}`
    console.log('Creating collaboration provider for:', documentName)

    const newProvider = new TiptapCollabProvider({
      name: documentName,
      appId: TIPTAP_COLLAB_APP_ID,
      token: collabToken,
      document: ydoc,
      onAuthenticationFailed: ({ reason }) => {
        console.error('TipTap Cloud auth failed:', reason)
      },
      onSynced: () => {
        console.log('TipTap Cloud synced')
        setIsSynced(true)
        // Clear the fallback timeout since we synced
        if (editorReadyTimeoutRef.current) {
          clearTimeout(editorReadyTimeoutRef.current)
        }
        // Check if the Yjs doc is empty after syncing with TipTap Cloud
        const fragment = ydoc.getXmlFragment('default')
        console.log('Yjs fragment length after sync:', fragment.length)
        if (fragment.length === 0) {
          console.log('TipTap Cloud doc is empty, will initialize with Convex content')
          setIsCloudEmpty(true)
        }
        // Mark editor as ready after sync completes
        setIsEditorReady(true)
      },
    })

    return newProvider
  }, [collabToken, docId, ydoc])


  // Handle provider events
  useEffect(() => {
    if (!provider) return

    const handleConnect = () => {
      setIsConnected(true)
      onSavingChange?.(false)
    }
    
    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleAwarenessUpdate = () => {
      const states = provider.awareness?.getStates()
      if (!states) return
      
      const users: CollaboratorInfo[] = []
      states.forEach((state, clientId) => {
        if (state.user && clientId !== provider.awareness?.clientID) {
          users.push({
            clientId,
            user: state.user,
          })
        }
      })
      setCollaborators(users)
    }
    
    const handleThreadsChange = () => {
      try {
        const allThreads = provider.getThreads()
        setThreads(allThreads || [])
      } catch (e) {
        // Threads may not be available yet
      }
    }
    
    provider.on('connect', handleConnect)
    provider.on('disconnect', handleDisconnect)
    provider.awareness?.on('update', handleAwarenessUpdate)
    
    // Fetch threads periodically when connected
    // Note: We use a ref pattern inside the interval to avoid re-running the effect when isConnected changes
    const threadInterval = setInterval(() => {
      try {
        handleThreadsChange()
      } catch (e) {
        // Ignore errors when not connected
      }
    }, 2000)
    
    return () => {
      provider.off('connect', handleConnect)
      provider.off('disconnect', handleDisconnect)
      provider.awareness?.off('update', handleAwarenessUpdate)
      clearInterval(threadInterval)
      provider.destroy()
    }
  }, [provider, onSavingChange])

  // Image upload handler using Convex storage
  const handleImageUpload = useCallback(
    async (
      file: File,
      onProgress?: (event: { progress: number }) => void,
      abortSignal?: AbortSignal
    ): Promise<string> => {
      if (!file) {
        throw new Error('No file provided')
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
        )
      }

      try {
        onProgress?.({ progress: 10 })
        const uploadUrl = await generateUploadUrl()
        
        if (abortSignal?.aborted) {
          throw new Error('Upload cancelled')
        }

        onProgress?.({ progress: 30 })
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
          signal: abortSignal,
        })

        if (!result.ok) {
          throw new Error('Failed to upload file')
        }

        onProgress?.({ progress: 70 })
        const { storageId } = await result.json()

        onProgress?.({ progress: 90 })
        const imageUrl = await getFileUrl({ storageId })
        
        if (!imageUrl) {
          throw new Error('Failed to get image URL')
        }
        
        onProgress?.({ progress: 100 })
        return imageUrl
      } catch (error) {
        if (abortSignal?.aborted) {
          throw new Error('Upload cancelled')
        }
        throw error
      }
    },
    [generateUploadUrl, getFileUrl]
  )

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        'aria-label': 'Document editor',
        class: 'notion-like-editor',
      },
      transformPastedHTML(html) {
        return transformPastedHTMLColors(html)
      },
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        horizontalRule: false,
        dropcursor: {
          width: 2,
        },
        link: {
          openOnClick: false,
        },
        // Disable history when using collaboration
        undoRedo: provider ? false : undefined,
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands...",
        emptyNodeClass: 'is-empty with-slash',
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      CharacterCount.configure({
        limit: null,
      }),
      TextStyle,
      Color,
      Mention,
      Emoji.configure({
        emojis: gitHubEmojis.filter(
          (emoji) => !emoji.name.includes('regional')
        ),
        forceFallbackImages: true,
      }),
      TableKit.configure({
        table: {
          resizable: true,
          cellMinWidth: 120,
        },
      }),
      TableHandleExtension,
      NodeBackground.configure({
        types: [
          'paragraph',
          'heading',
          'blockquote',
          'taskList',
          'bulletList',
          'orderedList',
          'tableCell',
          'tableHeader',
        ],
      }),
      NodeAlignment,
      UiState,
      ListNormalizationExtension,
      SectionLinkNode,
      UniqueID.configure({
        types: [
          'table',
          'paragraph',
          'bulletList',
          'orderedList',
          'taskList',
          'heading',
          'blockquote',
          'codeBlock',
        ],
        filterTransaction: (transaction) => !isChangeOrigin(transaction),
      }),
      TableOfContents.configure({
        getIndex: getHierarchicalIndexes,
        onUpdate(content) {
          setTocContent(content)
        },
      }),
      ImageUploadNode.configure({
        accept: 'image/*',
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error('Upload failed:', error),
      }),
      // Collaboration extensions
      ...(provider ? [
        Collaboration.configure({
          document: ydoc,
        }),
        CollaborationCaret.configure({
          provider,
          user: {
            id: user.id,
            name: user.name,
            color: user.color,
          },
        }),
        CommentsKit.configure({
          provider,
          onClickThread: (threadId) => {
            if (threadId) {
              setSelectedThreadId(threadId)
              // Position will be set by clicking in sidebar or via selection
              // For now, use a delayed approach to let the DOM settle
              setTimeout(() => {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0)
                  const rect = range.getBoundingClientRect()
                  if (rect.width > 0 || rect.height > 0) {
                    setThreadPopoverPosition({
                      top: rect.bottom + 8,
                      left: Math.max(rect.left, 16),
                    })
                  }
                }
              }, 50)
            } else {
              setSelectedThreadId(null)
              setThreadPopoverPosition(null)
            }
          },
        }),
      ] : []),
      // AI Extension - using GPT-5
      Ai.configure({
        appId: TIPTAP_AI_APP_ID,
        token: aiToken || undefined,
        autocompletion: false,
        showDecorations: true,
        hideDecorationsOnStreamEnd: false,
        onLoading: (context) => {
          context.editor.commands.aiGenerationSetIsLoading(true)
          context.editor.commands.aiGenerationHasMessage(false)
        },
        onChunk: (context) => {
          context.editor.commands.aiGenerationSetIsLoading(true)
          context.editor.commands.aiGenerationHasMessage(true)
        },
        onSuccess: (context) => {
          const hasMessage = !!context.response
          context.editor.commands.aiGenerationSetIsLoading(false)
          context.editor.commands.aiGenerationHasMessage(hasMessage)
        },
      }),
    ],
    // Always set initial content from Convex (using ref to prevent recreation)
    // When using collaboration, this becomes the starting point if the Yjs doc is empty
    content: initialContentRef.current,
    onUpdate: ({ editor }) => {
      // Debounce saves to Convex
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      onSavingChangeRef.current?.(true)
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const json = editor.getJSON()
          const currentDocId = docIdRef.current
          console.log('Saving content to Convex...', currentDocId)
          await updateContentRef.current({ 
            id: currentDocId as Id<'nodes'>, 
            content: json 
          })
          console.log('Content saved to Convex successfully')
          
          // Extract and save mentions
          try {
            await createMentionsRef.current({
              docId: currentDocId as Id<'nodes'>,
              docTitle: docTitleRef.current || 'Untitled',
              content: json,
              mentionedByUserName: userRef.current?.name || 'Unknown',
            })
          } catch (mentionError) {
            console.error('Failed to save mentions:', mentionError)
            // Don't fail the save if mentions fail
          }
        } catch (error) {
          console.error('Failed to save content to Convex:', error)
        } finally {
          onSavingChangeRef.current?.(false)
        }
      }, 3000) // 3 second debounce for better UX
    },
  }, [aiToken, handleImageUpload, provider, ydoc])

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Initialize editor with Convex content if TipTap Cloud doc is empty after sync
  useEffect(() => {
    if (isSynced && isCloudEmpty && editor && initialContent) {
      console.log('Initializing editor with Convex content after empty cloud sync')
      // Use requestAnimationFrame for optimal timing instead of setTimeout
      requestAnimationFrame(() => {
        editor.commands.setContent(initialContent)
        setIsCloudEmpty(false) // Only do this once
      })
    }
  }, [isSynced, isCloudEmpty, editor, initialContent])

  // Scroll to position when navigating from a flag link
  const hasScrolledToFlagRef = useRef(false)
  useEffect(() => {
    if (scrollToPosition && editor && !hasScrolledToFlagRef.current) {
      // Wait for editor to be ready
      const timeout = setTimeout(() => {
        try {
          const { from, to } = scrollToPosition
          const docSize = editor.state.doc.content.size

          // Validate position is within document bounds
          if (from >= 0 && to <= docSize && from < to) {
            // Set selection to highlight the flagged text
            editor.chain().focus().setTextSelection({ from, to }).run()

            // Scroll the selection into view
            const coords = editor.view.coordsAtPos(from)
            if (coords) {
              window.scrollTo({
                top: coords.top - 200, // Offset from top for better visibility
                behavior: 'smooth',
              })
            }
            hasScrolledToFlagRef.current = true
          }
        } catch (error) {
          console.error('Failed to scroll to flag position:', error)
        }
      }, 500) // Wait for editor to be fully initialized

      return () => clearTimeout(timeout)
    }
  }, [scrollToPosition, editor])

  // All hooks must be before any early returns
  const handleAddComment = useCallback(async () => {
    if (!editor) return
    
    const { from, to } = editor.state.selection
    if (from === to) {
      // No selection, can't add comment
      return
    }
    
    const commentContent = `Comment by ${user?.name || 'Unknown'}`
    editor.commands.setThread({
      content: commentContent,
      data: {
        authorId: user?.id || '',
        authorName: user?.name || 'Unknown',
        authorColor: user?.color || '#888',
      },
    })
    setShowComments(true)

    // Save comment to Convex for dashboard display
    try {
      await createComment({
        docId: docId as Id<'nodes'>,
        docTitle: docTitle || 'Untitled',
        content: commentContent,
        authorName: user?.name || 'Unknown',
      })
    } catch (error) {
      console.error('Failed to save comment to Convex:', error)
    }
  }, [editor, user, docId, docTitle, createComment])

  // Handle navigation from thread anchor to document position
  const handleNavigateToAnchor = useCallback((anchorData: { from: number; to: number }) => {
    // Close threads panel first
    setShowThreads(false)
    // Store the position to scroll to after the panel closes
    setPendingScrollPosition(anchorData)
  }, [])

  // Effect to scroll to anchor position after threads panel closes
  useEffect(() => {
    if (pendingScrollPosition && !showThreads && editor) {
      const timeout = setTimeout(() => {
        try {
          const { from, to } = pendingScrollPosition
          const docSize = editor.state.doc.content.size

          // Validate position is within document bounds
          if (from >= 0 && to <= docSize && from < to) {
            // Set selection to highlight the anchored text
            editor.chain().focus().setTextSelection({ from, to }).run()

            // Scroll the selection into view
            const coords = editor.view.coordsAtPos(from)
            if (coords) {
              window.scrollTo({
                top: coords.top - 200, // Offset from top for better visibility
                behavior: 'smooth',
              })
            }
          }
        } catch (error) {
          console.error('Failed to scroll to anchor position:', error)
        }
        setPendingScrollPosition(null)
      }, 100) // Small delay to let the panel close

      return () => clearTimeout(timeout)
    }
  }, [pendingScrollPosition, showThreads, editor])

  if (!editor) {
    return (
      <div className="min-h-[300px] animate-pulse">
        <div className="h-10 bg-muted rounded mb-4" />
        <div className="h-6 bg-muted rounded w-3/4 mb-4" />
        <div className="h-4 bg-muted rounded w-full mb-2" />
        <div className="h-4 bg-muted rounded w-5/6 mb-2" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
    )
  }

  const characterCount = editor.storage.characterCount
  const characters = characterCount?.characters?.() ?? 0
  const words = characterCount?.words?.() ?? 0

  const unresolvedThreads = threads.filter((t: any) => !t.resolvedAt)

  // Toggle handlers with mutual exclusivity
  const handleToggleComments = () => {
    if (!showComments) {
      setShowThreads(false) // Close threads when opening comments
    }
    setShowComments(!showComments)
  }

  const handleToggleThreads = () => {
    if (!showThreads) {
      setShowComments(false) // Close comments when opening threads
    }
    // Use prop handler if controlled, otherwise use internal state
    if (onToggleThreadsProp) {
      onToggleThreadsProp()
    } else {
      setShowThreadsInternal(!showThreads)
    }
  }

  return (
    <div className="notion-like-editor-wrapper flex">
      <div className={`flex-1 ${showComments ? 'mr-80' : ''} transition-all duration-200 relative`}>
        {/* Loading overlay - fades out when editor is ready */}
        {!isEditorReady && provider && (
          <div className="absolute inset-0 z-30 bg-background/80 flex items-center justify-center animate-pulse transition-opacity duration-300">
            <div className="text-sm text-muted-foreground">Syncing...</div>
          </div>
        )}

        <EditorContext.Provider value={{ editor }}>
          {/* Fixed Toolbar */}
          <Toolbar ref={toolbarRef} className="mb-4 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <MainToolbarContent
              isMobile={isMobile}
              showComments={showComments}
              onToggleComments={handleToggleComments}
              commentCount={unresolvedThreads.length}
              hasProvider={!!provider}
              docId={docId}
              docTitle={docTitle}
              versionString={versionString}
            />

            {/* Collaborators */}
            <CollaboratorsDisplay collaborators={collaborators} />

            {/* Connection status */}
            {provider && (
              <div className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}
                title={isConnected ? 'Connected' : 'Connecting...'}
              />
            )}
          </Toolbar>

          {/* Conditionally show editor or threads panel */}
          {showThreads ? (
            <ThreadsPanel
              docId={docId as Id<'nodes'>}
              docTitle={docTitle}
              isOpen={showThreads}
              onClose={() => setShowThreads(false)}
              onNavigateToAnchor={handleNavigateToAnchor}
            />
          ) : (
            <>
              {/* Editor Content with Notion-like UI */}
              <EditorContent
                editor={editor}
                className="notion-like-editor-content"
              >
                <DragContextMenu />
                <AiMenu />
                <EmojiDropdownMenu />
                <MentionDropdownMenu />
                <SlashDropdownMenu />
                <NotionToolbarFloating docId={docId} />
              </EditorContent>

              {/* Table UI */}
              <TableExtendRowColumnButtons />
              <TableHandle />
              <TableSelectionOverlay
                showResizeHandles={true}
                cellMenu={(props) => (
                  <TableCellHandleMenu
                    editor={props.editor}
                    onMouseDown={(e) => props.onResizeStart?.('br')(e)}
                  />
                )}
              />

              {/* Character Count */}
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>{characters} characters</span>
                  <span>{words} words</span>
                </div>
              </div>
            </>
          )}
        </EditorContext.Provider>
      </div>

      {/* Comments Panel */}
      {showComments && provider && (
        <div className="fixed right-0 top-0 h-full w-80 border-l border-border bg-background shadow-lg z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Comments</span>
              <span className="text-xs text-muted-foreground">({unresolvedThreads.length})</span>
            </div>
            <button
              onClick={() => setShowComments(false)}
              className="p-1 rounded hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {threads.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No comments yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select text and use the floating toolbar to add a comment
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((thread: any) => (
                  <div 
                    key={thread.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      thread.resolvedAt ? 'bg-muted/50 opacity-60' : 'bg-card hover:bg-accent/50'
                    } ${selectedThreadId === thread.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => {
                      setSelectedThreadId(thread.id)
                      editor.commands.selectThread({ id: thread.id, scrollIntoView: true })
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                        style={{ backgroundColor: thread.data?.authorColor || '#888' }}
                      >
                        {(thread.data?.authorName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium">{thread.data?.authorName || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {thread.resolvedAt ? 'Resolved' : ''}
                      </span>
                    </div>
                    <p className="text-sm">{thread.comments?.[0]?.content || 'Comment'}</p>
                    {thread.comments?.length > 1 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {thread.comments.length - 1} more replies
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {!thread.resolvedAt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            provider.restoreThread(thread.id)
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          editor.commands.removeThread({ id: thread.id, deleteThread: true })
                        }}
                        className="text-xs text-destructive hover:text-destructive/80"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Threads Panel is now rendered as full-page replacement above */}

      {/* Thread Popover for viewing/editing existing threads */}
      {selectedThreadId && threadPopoverPosition && provider && (
        <ThreadPopover
          editor={editor}
          thread={threads.find((t: any) => t.id === selectedThreadId) || null}
          position={threadPopoverPosition}
          provider={provider}
          onClose={() => {
            setSelectedThreadId(null)
            setThreadPopoverPosition(null)
          }}
        />
      )}
    </div>
  )
}

// Main component that wraps with providers
// IMPORTANT: Tokens must be provided via props from TokenCacheProvider
// Do NOT add fallback token fetching here - it causes 3-5 second delays due to Clerk auth()
export function TipTapEditor(props: TipTapEditorProps) {
  // Use tokens directly from props - they come from TokenCacheProvider (fetched once on app load)
  const aiToken = props.aiToken ?? null
  const collabToken = props.collabToken ?? null

  // Only show loading if tokens haven't been fetched yet (rare - only on first app load)
  if (props.aiToken === undefined && props.collabToken === undefined) {
    return (
      <div className="min-h-[300px] animate-pulse">
        <div className="h-10 bg-muted rounded mb-4" />
        <div className="h-6 bg-muted rounded w-3/4 mb-4" />
        <div className="h-4 bg-muted rounded w-full mb-2" />
        <div className="h-4 bg-muted rounded w-5/6 mb-2" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
    )
  }

  return (
    <UserProvider>
      <TipTapEditorInner
        docId={props.docId}
        docTitle={props.docTitle}
        content={props.content}
        versionString={props.versionString}
        onSavingChange={props.onSavingChange}
        scrollToPosition={props.scrollToPosition}
        aiToken={aiToken}
        collabToken={collabToken}
        showThreads={props.showThreads}
        onToggleThreads={props.onToggleThreads}
        threadCount={props.threadCount}
      />
    </UserProvider>
  )
}
