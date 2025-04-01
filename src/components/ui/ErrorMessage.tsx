import React from 'react';
import { useRef, useEffect } from 'react';
import { FiAlertTriangle, FiInfo, FiAlertCircle, FiX } from 'react-icons/fi';
import { animate } from '../../utils/animations';

export interface ErrorMessageProps {
  /** De foutmelding om weer te geven */
  message: string | React.ReactNode;
  
  /** Variant van de foutmelding */
  variant?: 'error' | 'warning' | 'info';
  
  /** Optionele actie die weergegeven wordt naast het bericht */
  action?: {
    label: string;
    onClick: () => void;
  };
  
  /** Type animatie om toe te passen bij het tonen van het bericht */
  animation?: 'fadeIn' | 'slideInUp' | 'bounceIn';
  
  /** Extra CSS classes */
  className?: string;
  
  /** Callback die wordt aangeroepen wanneer het bericht wordt gesloten */
  onClose?: () => void;
}

/**
 * Herbruikbare component voor het weergeven van fout-, waarschuwings- en informatieberichten
 * met consistente styling en optionele acties.
 */
export default function ErrorMessage({
  message,
  variant = 'error',
  action,
  animation,
  className = '',
  onClose
}: ErrorMessageProps) {
  // Ref voor animatie
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Effect om animatie toe te passen
  useEffect(() => {
    if (animation && containerRef.current) {
      animate(containerRef.current, animation);
    }
  }, [animation]);
  
  // Definieer stijlen gebaseerd op variant
  const variantStyles = {
    error: {
      containerClass: 'bg-red-900/20 border-red-700 text-red-200',
      icon: <FiAlertCircle className="w-5 h-5 text-red-500" />
    },
    warning: {
      containerClass: 'bg-yellow-900/20 border-yellow-700 text-yellow-200',
      icon: <FiAlertTriangle className="w-5 h-5 text-yellow-500" />
    },
    info: {
      containerClass: 'bg-blue-900/20 border-blue-700 text-blue-200',
      icon: <FiInfo className="w-5 h-5 text-blue-500" />
    }
  };
  
  // Bereken de container klassen
  const containerClasses = `
    flex items-start p-3 border rounded-md
    ${variantStyles[variant].containerClass}
    ${className}
  `;

  return (
    <div ref={containerRef} className={containerClasses} role="alert">
      <div className="flex-shrink-0 mr-3">
        {variantStyles[variant].icon}
      </div>
      
      <div className="flex-grow">
        {typeof message === 'string' ? <p>{message}</p> : message}
      </div>
      
      <div className="flex items-center ml-4 space-x-2">
        {action && (
          <button
            onClick={action.onClick}
            className="px-2 py-1 text-xs font-medium rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          >
            {action.label}
          </button>
        )}
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Sluiten"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
} 