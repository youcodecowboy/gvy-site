/**
 * Utility for handling pasted content colors in dark mode.
 * Strips dark/black text colors while preserving intentional colors.
 */

interface RGB {
  r: number
  g: number
  b: number
}

/**
 * Parse a color string (hex, rgb, rgba) to RGB values.
 */
export function parseColorToRGB(color: string): RGB | null {
  // Handle hex colors (#rrggbb)
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    }
  }

  // Handle shorthand hex (#rgb)
  const shortHexMatch = color.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i)
  if (shortHexMatch) {
    return {
      r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
      g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
      b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
    }
  }

  // Handle rgb(r, g, b) and rgba(r, g, b, a)
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    }
  }

  return null
}

/**
 * Calculate relative luminance using WCAG 2.1 formula.
 * Returns a value between 0 (black) and 1 (white).
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate color saturation (0-1).
 * Low saturation = grayscale, high saturation = vivid color.
 */
export function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

/**
 * Determine if a color should be stripped (dark and not intentionally colored).
 * Strips colors that are both dark (low luminance) AND unsaturated (gray/black).
 * Preserves intentional colors like red, blue, green even if dark.
 */
export function shouldStripColor(
  color: string,
  luminanceThreshold = 0.15,
  saturationThreshold = 0.3
): boolean {
  // Never strip CSS variables (they're theme-aware)
  if (color.includes("var(")) return false

  // Never strip inherit, currentColor, etc.
  if (
    ["inherit", "currentcolor", "initial", "unset"].includes(
      color.toLowerCase().trim()
    )
  ) {
    return false
  }

  const rgb = parseColorToRGB(color)
  if (!rgb) return false // Can't parse, leave it alone

  const luminance = getRelativeLuminance(rgb.r, rgb.g, rgb.b)
  const saturation = getSaturation(rgb.r, rgb.g, rgb.b)

  // Strip if dark (low luminance) AND not intentionally colored (low saturation)
  return luminance < luminanceThreshold && saturation < saturationThreshold
}

/**
 * Transform pasted HTML to strip dark/black text colors.
 * Preserves intentional colors (red, blue, etc.) while removing
 * colors that would be invisible in dark mode.
 */
export function transformPastedHTMLColors(html: string): string {
  // Handle SSR - return unchanged if no DOM available
  if (typeof DOMParser === "undefined") {
    return html
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Process all elements with inline style attribute
  const elementsWithStyle = doc.querySelectorAll("[style]")

  elementsWithStyle.forEach((el) => {
    const element = el as HTMLElement
    const color = element.style.color

    // Strip empty colors OR dark colors that would be invisible in dark mode
    if (color === "" || (color && shouldStripColor(color))) {
      element.style.removeProperty("color")
    }
  })

  // Also handle legacy <font color="..."> tags from old HTML (like Google Docs)
  const fontTags = doc.querySelectorAll("font[color]")
  fontTags.forEach((el) => {
    const fontEl = el as HTMLElement
    const color = fontEl.getAttribute("color")
    if (color && shouldStripColor(color)) {
      fontEl.removeAttribute("color")
    }
  })

  // Handle span with data-color or class-based colors (Google Docs style)
  const spansWithColor = doc.querySelectorAll("span")
  spansWithColor.forEach((span) => {
    const style = span.getAttribute("style") || ""
    // Match color declarations in various formats
    const colorMatch = style.match(/color\s*:\s*([^;]+)/i)
    if (colorMatch) {
      const colorValue = colorMatch[1].trim()
      if (colorValue === "" || shouldStripColor(colorValue)) {
        // Remove just the color from the style, keep other properties
        const newStyle = style.replace(/color\s*:\s*[^;]+;?/gi, "").trim()
        if (newStyle) {
          span.setAttribute("style", newStyle)
        } else {
          span.removeAttribute("style")
        }
      }
    }
  })

  return doc.body.innerHTML
}

/**
 * Strip empty or dark color marks from TipTap JSON content.
 * This handles cases where the textStyle mark is created with empty color.
 */
export function stripEmptyColorMarks(content: any): any {
  if (!content) return content
  if (typeof content !== "object") return content

  // Handle arrays (like content arrays)
  if (Array.isArray(content)) {
    return content.map((item) => stripEmptyColorMarks(item))
  }

  // Clone to avoid mutation
  const result = { ...content }

  // Process marks if present
  if (result.marks && Array.isArray(result.marks)) {
    result.marks = result.marks.filter((mark: any) => {
      // Remove textStyle marks with empty color
      if (mark.type === "textStyle") {
        const color = mark.attrs?.color
        // Keep the mark only if it has a non-empty color that we shouldn't strip
        if (!color || color === "" || shouldStripColor(color)) {
          return false
        }
      }
      return true
    })

    // Remove empty marks array
    if (result.marks.length === 0) {
      delete result.marks
    }
  }

  // Recursively process content
  if (result.content && Array.isArray(result.content)) {
    result.content = result.content.map((item: any) => stripEmptyColorMarks(item))
  }

  return result
}
