"use client"

interface KeyboardHintProps {
  keys: string[]
  action: string
  variant?: 'default' | 'compact'
}

export default function KeyboardHint({ keys, action, variant = 'default' }: KeyboardHintProps) {
  if (variant === 'compact') {
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1) !important',
          border: '1px solid rgba(110, 231, 183, 0.5) !important',
          backdropFilter: 'blur(4px) !important'
        }}
      >
        {keys.map((key, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && (
              <span 
                className="text-xs"
                style={{ color: 'rgb(110, 231, 183) !important' }}
              >
                +
              </span>
            )}
            <kbd 
              className="px-1.5 py-0.5 rounded text-xs font-mono font-semibold shadow-sm"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2) !important',
                border: '1px solid rgba(110, 231, 183, 0.3) !important',
                color: 'rgb(209, 250, 229) !important',
                fontWeight: '600 !important'
              }}
            >
              {key}
            </kbd>
          </span>
        ))}
        <span 
          className="text-xs font-medium ml-0.5"
          style={{ color: 'rgb(209, 250, 229) !important' }}
        >
          {action}
        </span>
      </div>
    )
  }

  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
        border: '1px solid rgba(255, 255, 255, 0.2) !important',
        backdropFilter: 'blur(12px) !important'
      }}
    >
      <span 
        className="text-xs font-medium"
        style={{ color: 'rgba(255, 255, 255, 0.9) !important' }}
      >
        {action}
      </span>
      <div className="flex items-center gap-1">
        {keys.map((key, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && (
              <span 
                className="text-xs"
                style={{ color: 'rgba(255, 255, 255, 0.5) !important' }}
              >
                +
              </span>
            )}
            <kbd 
              className="px-2 py-1 rounded text-xs font-mono font-semibold shadow-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2) !important',
                border: '1px solid rgba(255, 255, 255, 0.3) !important',
                color: 'rgb(255, 255, 255) !important',
                fontWeight: '600 !important'
              }}
            >
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  )
}

