"use client"

import { forwardRef, useCallback } from "react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { useEraserDiagram } from "./use-eraser-diagram"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"

// --- Icons ---
import { Network } from "lucide-react"

type IconProps = React.SVGProps<SVGSVGElement>
type IconComponent = ({ className, ...props }: IconProps) => React.ReactElement

export interface EraserDiagramButtonProps
  extends Omit<ButtonProps, "type"> {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
  /**
   * Optional custom icon component to render instead of the default.
   */
  icon?: React.MemoExoticComponent<IconComponent> | React.FC<IconProps>
  /**
   * Callback function called after a successful diagram insertion.
   */
  onInserted?: () => void
  /**
   * Whether the button should hide when insertion is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
}

/**
 * Button component for generating diagrams from selected text using Eraser.io
 */
export const EraserDiagramButton = forwardRef<
  HTMLButtonElement,
  EraserDiagramButtonProps
>(
  (
    {
      editor: providedEditor,
      text,
      onInserted,
      onClick,
      icon: CustomIcon,
      children,
      hideWhenUnavailable = false,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const {
      isVisible,
      isLoading,
      error,
      handleEraserDiagram,
      canInsert,
      label,
      Icon: LoadingIcon,
    } = useEraserDiagram({
      editor,
      onInserted,
      hideWhenUnavailable,
    })

    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        await handleEraserDiagram()
      },
      [handleEraserDiagram, onClick]
    )

    if (!isVisible) {
      return null
    }

    const RenderIcon = isLoading ? LoadingIcon : (CustomIcon ?? Network)

    return (
      <div className="relative">
        <Button
          type="button"
          data-style="ghost"
          role="button"
          tabIndex={-1}
          disabled={!canInsert || isLoading}
          data-disabled={!canInsert || isLoading}
          aria-label={label}
          tooltip={error || label}
          onClick={handleClick}
          {...buttonProps}
          ref={ref}
        >
          {children ?? (
            <>
              <RenderIcon 
                className={`tiptap-button-icon ${isLoading ? 'animate-spin' : ''}`} 
              />
              {text && <span className="tiptap-button-text">{text}</span>}
            </>
          )}
        </Button>
        {error && (
          <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded shadow-lg z-50 whitespace-nowrap">
            {error}
          </div>
        )}
      </div>
    )
  }
)

EraserDiagramButton.displayName = "EraserDiagramButton"
