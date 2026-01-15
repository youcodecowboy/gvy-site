interface DividerProps {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function Divider({
  className = '',
  orientation = 'horizontal',
}: DividerProps) {
  return (
    <div
      className={`
        bg-border shrink-0
        ${orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px'}
        ${className}
      `}
    />
  )
}
