'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent, EditorContext } from '@tiptap/react'
import { useMutation } from 'convex/react'
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
import { ThreadsPanel } from '@/components/threads/ThreadsPanel'

// --- Notion-like UI Components ---
import { EmojiDropdownMenu } from '@/components/tiptap-ui/emoji-dropdown-menu'
import { MentionDropdownMenu } from '@/components/tiptap-ui/mention-dropdown-menu'
import { SlashDropdownMenu } from '@/components/tiptap-ui/slash-dropdown-menu'
import { DragContextMenu } from '@/components/tiptap-ui/drag-context-menu'

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

interface TipTapEditorProps {
  docId: string
  docTitle: string
  content: any
  versionString?: string
  onSavingChange?: (isSaving: boolean) => void
  scrollToPosition?: { from: number; to: number }
  showThreads?: boolean
  onToggleThreads?: () => void
  threadCount?: number
}

// Main Toolbar Content Component
function MainToolbarContent({
  isMobile,
  docId,
  docTitle,
  versionString,
}: {
  isMobile: boolean
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

      <Spacer />
    </>
  )
}

// Inner editor component - Convex-only, no TipTap Cloud
function TipTapEditorInner({
  docId,
  docTitle,
  content: initialContent,
  versionString,
  onSavingChange,
  scrollToPosition,
  showThreads: showThreadsProp,
  onToggleThreads: onToggleThreadsProp,
}: TipTapEditorProps) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const getFileUrl = useMutation(api.files.getFileUrl)
  const updateContent = useMutation(api.nodes.updateContent)
  const createMentions = useMutation(api.mentions.createMentions)
  const isMobile = useIsBreakpoint()
  const { setTocContent } = useToc()
  const toolbarRef = useRef<HTMLDivElement>(null)
  const { user } = useTiptapUser()
  const [showThreadsInternal, setShowThreadsInternal] = useState(false)
  const [pendingScrollPosition, setPendingScrollPosition] = useState<{ from: number; to: number } | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use controlled props when provided, otherwise use internal state
  const isThreadsControlled = showThreadsProp !== undefined
  const showThreads = isThreadsControlled ? showThreadsProp : showThreadsInternal
  const setShowThreads = isThreadsControlled
    ? (value: boolean | ((prev: boolean) => boolean)) => {
        const newValue = typeof value === 'function' ? value(showThreadsProp!) : value
        if (newValue !== showThreadsProp && onToggleThreadsProp) {
          onToggleThreadsProp()
        }
      }
    : setShowThreadsInternal

  // Use refs for values accessed in callbacks to prevent editor recreation
  const docIdRef = useRef(docId)
  const docTitleRef = useRef(docTitle)
  const userRef = useRef(user)
  const onSavingChangeRef = useRef(onSavingChange)
  const updateContentRef = useRef(updateContent)
  const createMentionsRef = useRef(createMentions)

  // Store initial content in a ref so it doesn't cause editor recreation
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
    ],
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
          }
        } catch (error) {
          console.error('Failed to save content to Convex:', error)
        } finally {
          onSavingChangeRef.current?.(false)
        }
      }, 2000) // 2 second debounce
    },
  }, [handleImageUpload])

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Update editor content when docId changes (switching documents)
  useEffect(() => {
    if (editor && initialContent) {
      // Only update if content is different to avoid unnecessary re-renders
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(initialContent)) {
        editor.commands.setContent(initialContent)
      }
    }
  }, [docId, editor, initialContent])

  // Scroll to position when navigating from a flag link
  const hasScrolledToFlagRef = useRef(false)
  useEffect(() => {
    if (scrollToPosition && editor && !hasScrolledToFlagRef.current) {
      const timeout = setTimeout(() => {
        try {
          const { from, to } = scrollToPosition
          const docSize = editor.state.doc.content.size

          if (from >= 0 && to <= docSize && from < to) {
            editor.chain().focus().setTextSelection({ from, to }).run()
            const coords = editor.view.coordsAtPos(from)
            if (coords) {
              window.scrollTo({
                top: coords.top - 200,
                behavior: 'smooth',
              })
            }
            hasScrolledToFlagRef.current = true
          }
        } catch (error) {
          console.error('Failed to scroll to flag position:', error)
        }
      }, 300)

      return () => clearTimeout(timeout)
    }
  }, [scrollToPosition, editor])

  // Handle navigation from thread anchor to document position
  const handleNavigateToAnchor = useCallback((anchorData: { from: number; to: number }) => {
    setShowThreads(false)
    setPendingScrollPosition(anchorData)
  }, [])

  // Effect to scroll to anchor position after threads panel closes
  useEffect(() => {
    if (pendingScrollPosition && !showThreads && editor) {
      const timeout = setTimeout(() => {
        try {
          const { from, to } = pendingScrollPosition
          const docSize = editor.state.doc.content.size

          if (from >= 0 && to <= docSize && from < to) {
            editor.chain().focus().setTextSelection({ from, to }).run()
            const coords = editor.view.coordsAtPos(from)
            if (coords) {
              window.scrollTo({
                top: coords.top - 200,
                behavior: 'smooth',
              })
            }
          }
        } catch (error) {
          console.error('Failed to scroll to anchor position:', error)
        }
        setPendingScrollPosition(null)
      }, 100)

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

  return (
    <div className="notion-like-editor-wrapper flex">
      <div className="flex-1 transition-all duration-200">
        <EditorContext.Provider value={{ editor }}>
          {/* Fixed Toolbar */}
          <Toolbar ref={toolbarRef} className="mb-4 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <MainToolbarContent
              isMobile={isMobile}
              docId={docId}
              docTitle={docTitle}
              versionString={versionString}
            />
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
    </div>
  )
}

// Main component that wraps with providers
// No longer needs tokens - Convex-only!
export function TipTapEditor(props: TipTapEditorProps) {
  return (
    <UserProvider>
      <TipTapEditorInner
        docId={props.docId}
        docTitle={props.docTitle}
        content={props.content}
        versionString={props.versionString}
        onSavingChange={props.onSavingChange}
        scrollToPosition={props.scrollToPosition}
        showThreads={props.showThreads}
        onToggleThreads={props.onToggleThreads}
        threadCount={props.threadCount}
      />
    </UserProvider>
  )
}
