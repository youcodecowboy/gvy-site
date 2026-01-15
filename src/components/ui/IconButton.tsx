import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type IconButtonSize = 'sm' | 'md'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize
  tooltip?: string
  children: ReactNode
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = '', size = 'md', tooltip, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        title={tooltip}
        className={`
          inline-flex items-center justify-center rounded-md
          text-muted-foreground hover:text-foreground
          hover:bg-accent transition-colors
          focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          disabled:pointer-events-none disabled:opacity-50
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
