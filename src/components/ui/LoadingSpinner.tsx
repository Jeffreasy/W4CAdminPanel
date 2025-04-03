import React from 'react'

interface LoadingSpinnerProps {
  /** Grootte van de spinner */
  size?: 'small' | 'medium' | 'large'
  
  /** Indicatie of de spinner gecentreerd moet worden in parent container */
  centered?: boolean
  
  /** Optioneel laadmessage onder de spinner */
  message?: string
  
  /** Extra CSS classes */
  className?: string
  
  /** Kleur van de spinner (standaard is blauw) */
  color?: 'blue' | 'amber' | 'green' | 'purple'
}

/**
 * Herbruikbare laadspinner voor consistent gebruik in de hele app
 */
export default function LoadingSpinner({
  size = 'medium',
  centered = false,
  message,
  className = '',
  color = 'blue'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  const containerClasses = centered 
    ? 'flex flex-col items-center justify-center min-h-[200px]' 
    : 'flex flex-col items-center justify-center'

  return (
    <div className={containerClasses}>
      <div className={`${sizeClasses[size]} animate-spin`}>
        <svg className="text-blue-500" viewBox="0 0 24 24">
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
            fill="none"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {message && (
        <p className="mt-4 text-gray-400">{message}</p>
      )}
    </div>
  )
} 