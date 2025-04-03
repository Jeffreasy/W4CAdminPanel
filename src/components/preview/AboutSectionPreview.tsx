'use client'

import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface AboutSection {
  id: string
  section_key: string
  content: string
  order_number: number
  style_type: string // 'title', 'paragraph', 'email'
}

interface AboutSectionPreviewProps {
  sections: AboutSection[]
}

const renderTextPreview = (content: string, isTitle: boolean = false) => {
  // Split into words
  return content.split(' ').map((word, index, array) => (
    <React.Fragment key={index}>
      <span 
        className={`
          inline-block
          animate-letter-preview
          ${isTitle ? 'text-4xl sm:text-5xl md:text-6xl font-bold' : 'text-lg sm:text-xl'}
        `}
      >
        {word}
      </span>
      {/* Add space between words */}
      {index < array.length - 1 && (
        <span className="inline-block w-2 sm:w-2.5">&nbsp;</span>
      )}
    </React.Fragment>
  ))
}

export function AboutSectionPreview({ sections }: AboutSectionPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleSections, setVisibleSections] = useState<AboutSection[]>([])

  // Update visible sections when props change
  useEffect(() => {
    setVisibleSections(sections)
  }, [sections])

  // GSAP animaties
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    
    const container = containerRef.current
    if (!container || visibleSections.length === 0) return

    // Simple fade-in for preview
    const animateTextInPreview = (elements: NodeListOf<Element>) => {
      gsap.fromTo(elements, 
        { opacity: 0, y: 5 }, 
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.5, 
          stagger: 0.01, // Faster stagger for preview
          ease: "power2.out",
          // No ScrollTrigger needed for admin preview, animate immediately
        }
      )
    }

    // Animate letters when sections change
    const letters = container.querySelectorAll('.animate-letter-preview')
    if (letters.length > 0) {
      animateTextInPreview(letters)
    }

    // Cleanup function (optional but good practice)
    return () => {
      gsap.killTweensOf(letters) // Kill only animations related to these letters
    }

  }, [visibleSections]) // Re-run animation when sections update

  return (
    <div ref={containerRef} className="bg-black text-white p-4 rounded-lg">
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        {/* Title */}
        {visibleSections
          .filter(section => section.style_type === 'title')
          .map(section => (
            <h1 
              key={section.id} 
              className="text-center mb-12 text-white" // Adjusted margin
            >
              {renderTextPreview(section.content, true)}
            </h1>
          ))}

        {/* Content */}
        <div className="max-w-3xl mx-auto space-y-6"> {/* Adjusted spacing */}
          {visibleSections
            .filter(section => section.style_type === 'paragraph')
            .map(section => (
              <p 
                key={section.id} 
                className="leading-relaxed text-white/90 text-center"
              >
                {renderTextPreview(section.content)}
              </p>
            ))}

          {/* Contact */}
          <div className="mt-12 text-center"> {/* Adjusted margin */}
            {visibleSections
              .filter(section => section.style_type === 'email')
              .map(section => (
                // Display as text, not a link in preview
                <p key={section.id} className="text-lg text-blue-400">
                  {section.content}
                </p>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
} 