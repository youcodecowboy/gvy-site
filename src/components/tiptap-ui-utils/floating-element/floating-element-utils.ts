import type { Editor } from "@tiptap/react"

export const isElementWithinEditor = (
  editor: Editor | null,
  element: Node | null
) => {
  if (!element || !editor || editor.isDestroyed) {
    return false
  }

  try {
    const editorWrapper = editor.view.dom.parentElement
    const editorDom = editor.view.dom

    if (!editorWrapper) {
      return false
    }

    return (
      editorWrapper === element ||
      editorDom === element ||
      editorWrapper.contains(element)
    )
  } catch {
    // Editor may have been destroyed
    return false
  }
}
