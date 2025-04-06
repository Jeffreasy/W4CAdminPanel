'use client'

import React from 'react'
// import { gsap } from 'gsap' // Removed GSAP import
// import { cn } from '@/lib/utils' // Removed problematic import

// Updated interface to match the exact DB schema
interface CircleSection {
  id: string
  href: string
  text: string
  circle_size_desktop: number
  circle_size_tablet?: number // Added
  circle_size_mobile?: number // Added
  border_width: number
  border_color: string
  border_style: string
  font_size_desktop: number
  font_size_tablet?: number // Added
  font_size_mobile?: number // Added
  font_weight: string
  text_color: string
  rotation_duration: number
  hover_scale: number
  animation_ease: string
  glow_background: string // Changed from nested
  glow_shadow: string // Changed from nested
  glow_intensity: number
  glow_duration: number
  gap_desktop?: number // Added
  gap_tablet?: number // Added
  gap_mobile?: number // Added
  order_number?: number
  is_active?: boolean // Assuming based on other tables
  status?: string // Added
  created_at?: string // Assuming based on other tables
  updated_at?: string // Assuming based on other tables
}

interface ThreeCirclesPreviewProps {
  sections: CircleSection[]
}

export function ThreeCirclesPreview({ sections }: ThreeCirclesPreviewProps) {
  // Removed useEffect hook for animations

  if (!sections || sections.length === 0) {
    return <p className="text-gray-500 italic text-center p-4">No circle sections defined.</p>
  }

  const sortedSections = [...sections].sort((a, b) => (a.order_number ?? 0) - (b.order_number ?? 0))

  return (
    // Removed ref from container
    <div className="bg-gray-900 text-white p-6 rounded-lg border border-gray-700">
      {/* Add basic CSS animations directly here for simplicity */}
      <style>{`
        @keyframes pulseOpacity {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .animate-pulse-opacity {
          animation: pulseOpacity var(--glow-duration, 2.5s) ease-in-out infinite;
        }
        .circle-wrapper-preview {
           transition: transform 0.3s ease-out; /* CSS Hover Transition */
        }
        .circle-wrapper-preview:hover {
           transform: scale(var(--hover-scale, 1.05)); /* CSS Hover Scale */
        }
      `}</style>
      
      <h3 className="text-lg font-semibold mb-6 border-b border-gray-600 pb-2">Three Circles Preview</h3>
      
      <div className="flex flex-col sm:flex-row items-center justify-around gap-8">
        {sortedSections.slice(0, 3).map((section) => {
          const glowDuration = section.glow_duration || 2.5;
          const hoverScale = section.hover_scale || 1.05;
          const isRainbow = section.glow_background === 'rainbow';
          const animationClass = !isRainbow ? 'animate-pulse-opacity' : ''; // Apply pulse only if not rainbow

          return (
            // Apply hover effect to this wrapper
            <div 
              key={section.id} 
              className="circle-wrapper-preview flex flex-col items-center text-center" 
              style={{ 
                '--hover-scale': hoverScale 
              } as React.CSSProperties}
            >
              {/* Inner circle with animation class and style */}
              <div 
                className={`rounded-full flex items-center justify-center mb-4 border ${animationClass}`}
                style={{
                  width: `${section.circle_size_desktop * 0.6}px`,
                  height: `${section.circle_size_desktop * 0.6}px`,
                  borderWidth: `${Math.max(1, section.border_width * 0.5)}px`,
                  borderColor: section.border_color,
                  borderStyle: section.border_style,
                  color: section.text_color,
                  fontWeight: section.font_weight,
                  fontSize: `${section.font_size_desktop * 0.6}px`,
                  backgroundColor: isRainbow ? 'rgba(128,128,128,0.1)' : section.glow_background?.replace(/,[^,]+?\)$/, ',0.1)'), 
                  boxShadow: isRainbow ? '0 0 10px 1px gray' : section.glow_shadow?.replace(/,[^,]+?\)$/, ',0.2)').replace(/\d+px/g, '5px'), 
                  '--glow-duration': `${glowDuration}s` // Pass duration to CSS variable
                } as React.CSSProperties}
              >
                <span className="select-none p-1 break-words">{section.text}</span>
              </div>
              
              <div className="text-xs text-gray-400 space-y-1">
                <p><span className="font-medium text-gray-300">Link:</span> {section.href}</p>
                <p><span className="font-medium text-gray-300">Glow BG:</span> {section.glow_background}</p>
                <p><span className="font-medium text-gray-300">Status:</span> {section.status}</p>
                {/* Optionally add more text info about animations */}
                <p><span className="font-medium text-gray-300">Hover Scale:</span> {hoverScale}</p>
                <p><span className="font-medium text-gray-300">Glow Dur:</span> {glowDuration}s</p>
                {/* Added more animation details */}
                <p><span className="font-medium text-gray-300">Glow Shadow:</span> <span className="font-mono text-gray-500 break-all">{section.glow_shadow || 'N/A'}</span></p>
                <p><span className="font-medium text-gray-300">Glow Intensity:</span> {section.glow_intensity ?? 'N/A'}</p>
                <p><span className="font-medium text-gray-300">Rotation Dur:</span> {section.rotation_duration ?? 'N/A'}s</p>
                <p><span className="font-medium text-gray-300">Ease:</span> {section.animation_ease || 'N/A'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 