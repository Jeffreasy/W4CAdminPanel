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
  // Definieer de grootte-gerelateerde klassen
  const sizeClasses = {
    small: 'w-5 h-5 border-2',
    medium: 'w-8 h-8 border-2',
    large: 'w-12 h-12 border-3'
  }
  
  // Definieer de kleur-gerelateerde klassen
  const colorClasses = {
    blue: 'border-gray-700 border-t-blue-500',
    amber: 'border-gray-700 border-t-amber-500',
    green: 'border-gray-700 border-t-green-500',
    purple: 'border-gray-700 border-t-purple-500'
  }
  
  // Bereken de container klassen
  const containerClasses = [
    centered ? 'flex flex-col items-center justify-center min-h-[200px]' : 'flex flex-col items-center',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={containerClasses}>
      {/* Spinner zelf */}
      <div 
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      
      {/* Optioneel bericht */}
      {message && (
        <p className={`mt-4 text-gray-400 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
          {message}
        </p>
      )}
    </div>
  )
} 