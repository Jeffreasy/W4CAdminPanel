import React from 'react';

export interface PageWrapperProps {
  /** Titel van de pagina */
  title: string;
  
  /** Inhoud van de pagina */
  children: React.ReactNode;
  
  /** Optionele actieknoppen rechts van de titel */
  actions?: React.ReactNode;
  
  /** Optionele beschrijving onder de titel */
  description?: string;
  
  /** Extra CSS classes */
  className?: string;
  
  /** Of de inhoud in een card moet worden getoond */
  withCard?: boolean;
}

/**
 * Herbruikbare component voor consistente pagina layouts
 * Zorgt voor uniforme headers, beschrijvingen en actieknoppen in de admin interface
 */
export default function PageWrapper({
  title,
  children,
  actions,
  description,
  className = '',
  withCard = true
}: PageWrapperProps) {
  return (
    <div className={`w-full max-w-full ${className}`}>
      {/* Header sectie met titel en acties */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{title}</h1>
          
          {description && (
            <p className="mt-1 text-sm text-gray-400">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0 justify-start sm:justify-end">
            {actions}
          </div>
        )}
      </div>
      
      {/* Content sectie */}
      {withCard ? (
        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 p-4 sm:p-6">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
} 