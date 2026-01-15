import { useEffect, useState, useRef } from "react"
import { type Editor } from "@tiptap/react"
import { MessageSquare } from "lucide-react"
import { NewThreadPopover } from "@/components/tiptap-ui/thread-popover/thread-popover"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { useUiEditorState } from "@/hooks/use-ui-editor-state"
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useFloatingToolbarVisibility } from "@/hooks/use-floating-toolbar-visibility"

// --- Node ---
import { ImageNodeFloating } from "@/components/tiptap-node/image-node/image-node-floating"

// --- Icons ---
import { MoreVerticalIcon } from "@/components/tiptap-icons/more-vertical-icon"

// --- UI ---
import { ColorTextPopover } from "@/components/tiptap-ui/color-text-popover"
import { ImproveDropdown } from "@/components/tiptap-ui/improve-dropdown"
import { LinkPopover } from "@/components/tiptap-ui/link-popover"
import type { Mark } from "@/components/tiptap-ui/mark-button"
import { canToggleMark, MarkButton } from "@/components/tiptap-ui/mark-button"
import type { TextAlign } from "@/components/tiptap-ui/text-align-button"
import {
  canSetTextAlign,
  TextAlignButton,
} from "@/components/tiptap-ui/text-align-button"
import { TurnIntoDropdown } from "@/components/tiptap-ui/turn-into-dropdown"
import { EraserDiagramButton } from "@/components/tiptap-ui/eraser-diagram-button"

// --- Utils ---
import { isSelectionValid } from "@/lib/tiptap-collab-utils"

// --- Primitive UI Components ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/tiptap-ui-primitive/popover"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- UI Utils ---
import { FloatingElement } from "@/components/tiptap-ui-utils/floating-element"

export function NotionToolbarFloating() {
  const { editor } = useTiptapEditor()
  const isMobile = useIsBreakpoint("max", 480)
  const { lockDragHandle, aiGenerationActive, commentInputVisible } =
    useUiEditorState(editor)

  const { shouldShow } = useFloatingToolbarVisibility({
    editor,
    isSelectionValid,
    extraHideWhen: Boolean(aiGenerationActive || commentInputVisible),
  })

  if (lockDragHandle || isMobile) return null

  return (
    <FloatingElement shouldShow={shouldShow}>
      <Toolbar variant="floating">
        <ToolbarGroup>
          <ImproveDropdown hideWhenUnavailable={true} />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <TurnIntoDropdown hideWhenUnavailable={true} />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <MarkButton type="bold" hideWhenUnavailable={true} />
          <MarkButton type="italic" hideWhenUnavailable={true} />
          <MarkButton type="underline" hideWhenUnavailable={true} />
          <MarkButton type="strike" hideWhenUnavailable={true} />
          <MarkButton type="code" hideWhenUnavailable={true} />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ImageNodeFloating />
        </ToolbarGroup>

        <ToolbarGroup>
          <EraserDiagramButton hideWhenUnavailable={true} />
        </ToolbarGroup>

        <ToolbarGroup>
          <LinkPopover
            autoOpenOnLinkActive={false}
            hideWhenUnavailable={true}
          />
          <ColorTextPopover hideWhenUnavailable={true} />
          <CommentButton editor={editor} />
        </ToolbarGroup>

        <MoreOptions hideWhenUnavailable={true} />
      </Toolbar>
    </FloatingElement>
  )
}

function canMoreOptions(editor: Editor | null): boolean {
  if (!editor) {
    return false
  }

  const canTextAlignAny = ["left", "center", "right", "justify"].some((align) =>
    canSetTextAlign(editor, align as TextAlign)
  )

  const canMarkAny = ["superscript", "subscript"].some((type) =>
    canToggleMark(editor, type as Mark)
  )

  return canMarkAny || canTextAlignAny
}

function shouldShowMoreOptions(params: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const { editor, hideWhenUnavailable } = params

  if (!editor) {
    return false
  }

  if (hideWhenUnavailable && !editor.isActive("code")) {
    return canMoreOptions(editor)
  }

  return Boolean(editor?.isEditable)
}

export interface MoreOptionsProps extends Omit<ButtonProps, "type"> {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Whether to hide the dropdown when no options are available.
   * @default false
   */
  hideWhenUnavailable?: boolean
}

export function MoreOptions({
  editor: providedEditor,
  hideWhenUnavailable = false,
  ...props
}: MoreOptionsProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      setShow(
        shouldShowMoreOptions({
          editor,
          hideWhenUnavailable,
        })
      )
    }

    handleSelectionUpdate()

    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, hideWhenUnavailable])

  if (!show || !editor || !editor.isEditable) {
    return null
  }

  return (
    <>
      <ToolbarSeparator />
      <ToolbarGroup>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              data-style="ghost"
              role="button"
              tabIndex={-1}
              tooltip="More options"
              {...props}
            >
              <MoreVerticalIcon className="tiptap-button-icon" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            side="top"
            align="end"
            alignOffset={4}
            sideOffset={4}
            asChild
          >
            <Toolbar variant="floating" tabIndex={0}>
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
            </Toolbar>
          </PopoverContent>
        </Popover>
      </ToolbarGroup>
    </>
  )
}

interface CommentButtonProps {
  editor: Editor | null
}

function CommentButton({ editor }: CommentButtonProps) {
  const [canComment, setCanComment] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!editor) return

    const updateCanComment = () => {
      const { from, to } = editor.state.selection
      // Can add comment if there's a text selection
      setCanComment(from !== to && editor.isEditable)
    }

    updateCanComment()
    editor.on("selectionUpdate", updateCanComment)

    return () => {
      editor.off("selectionUpdate", updateCanComment)
    }
  }, [editor])

  if (!canComment || !editor) {
    return null
  }

  const handleClick = () => {
    // Check if setThread command exists (CommentsKit is loaded)
    if (!editor.commands.setThread) {
      console.warn("Comments extension not available")
      return
    }

    // Get selection position from the editor view
    try {
      const { from, to } = editor.state.selection
      const start = editor.view.coordsAtPos(from)
      const end = editor.view.coordsAtPos(to)
      
      // Position below the selection
      setPopoverPosition({
        top: Math.max(start.bottom, end.bottom) + 8,
        left: Math.min(start.left, end.left),
      })
      setShowPopover(true)
    } catch (e) {
      // Fallback to selection API
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setPopoverPosition({
          top: rect.bottom + 8,
          left: rect.left,
        })
        setShowPopover(true)
      }
    }
  }

  return (
    <>
      <Button
        type="button"
        data-style="ghost"
        onClick={handleClick}
        tooltip="Add comment"
      >
        <MessageSquare className="tiptap-button-icon h-4 w-4" />
      </Button>
      {showPopover && popoverPosition && (
        <NewThreadPopover
          editor={editor}
          position={popoverPosition}
          onClose={() => setShowPopover(false)}
        />
      )}
    </>
  )
}
