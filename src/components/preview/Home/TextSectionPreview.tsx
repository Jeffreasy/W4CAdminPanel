'use client'

import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface TextSectionPreviewProps {
  sections: {
    id: string
    section_key: string
    content: string
    style_type: string
  }[]
}

export function TextSectionPreview({ sections }: TextSectionPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    
    // Reset animaties
    gsap.set(['.main-word', '.impact-word', '.purpose-word', '.sip-word'], {
      opacity: 0,
      y: 15,
      rotateX: 10
    })

    const container = containerRef.current
    if (!container) return

    const animateTextIn = (elements: NodeListOf<Element>, delay: number = 0) => {
      return gsap.to(elements, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.8,
        stagger: 0.03,
        ease: "power3.out",
        delay,
        scrollTrigger: {
          trigger: container,
          start: "top 60%",
          end: "bottom 80%",
        }
      })
    }

    const words = {
      main: container.querySelectorAll('.main-word'),
      impact: container.querySelectorAll('.impact-word'),
      purpose: container.querySelectorAll('.purpose-word'),
      sip: container.querySelectorAll('.sip-word')
    }

    const animations = [
      animateTextIn(words.main, 0),
      animateTextIn(words.impact, 0.2),
      animateTextIn(words.purpose, 0.4),
      animateTextIn(words.sip, 0.6)
    ]

    return () => {
      animations.forEach(anim => anim.kill())
    }
  }, [sections])

  const processContent = (content: string, styleType: string) => {
    const lines = content.split('\n')
    
    const textClasses = styleType === 'main' || styleType === 'purpose'
      ? 'text-white text-xl sm:text-2xl md:text-[2.75rem] font-bold'
      : 'text-white/80 text-base sm:text-lg md:text-xl font-serif'
    
    return lines.map((line, lineIndex) => {
      if (!line.trim()) {
        return (
          <div 
            key={`line-${lineIndex}`} 
            className={`w-full ${
              styleType === 'main' || styleType === 'purpose'
                ? 'h-8 sm:h-10 md:h-14'
                : 'h-5 sm:h-7 md:h-9'
            }`}
          />
        )
      }
      
      return (
        <p 
          key={`line-${lineIndex}`} 
          className={`
            mb-2 sm:mb-3 md:mb-4
            ${textClasses}
            ${styleType === 'impact' || styleType === 'sip' ? 'text-right' : ''}
            tracking-wide
          `}
          style={{
            lineHeight: styleType === 'main' || styleType === 'purpose' ? 1.2 : 1.4,
            wordSpacing: styleType === 'main' || styleType === 'purpose' ? '0.05em' : '0.03em',
          }}
        >
          {line === '-' ? (
            <span 
              className={`
                block w-full 
                ${styleType === 'main' || styleType === 'purpose'
                  ? 'my-5 sm:my-6 md:my-8'
                  : 'my-3 sm:my-4 md:my-6'
                }
              `}
            >
              <hr className="border-gray-500 opacity-30" />
            </span>
          ) : (
            line.split(' ').map((word, wordIndex, arr) => (
              <span 
                key={`word-${lineIndex}-${wordIndex}`}
                className={`
                  ${styleType}-word 
                  word-span
                  inline-block
                  cursor-default
                  whitespace-normal
                `}
              >
                {word}
                {wordIndex < arr.length - 1 && (
                  <span 
                    className="inline-block" 
                    aria-hidden="true"
                    style={{ width: '0.25em' }}
                  >&nbsp;</span>
                )}
              </span>
            ))
          )}
        </p>
      )
    })
  }

  return (
    <section ref={containerRef} className="min-h-[400px] bg-black relative py-8 sm:py-12 md:py-16 rounded-lg overflow-hidden">
      <div className="container mx-auto relative px-4 sm:px-6 md:px-8">
        {sections?.map((section) => (
          <div 
            key={section.id}
            className={`mb-12 sm:mb-16 md:mb-20 ${
              section.style_type === 'impact' || section.style_type === 'sip' 
                ? 'flex justify-end' 
                : ''
            }`}
          >
            <div 
              ref={(el: HTMLDivElement | null) => {
                textRefs.current[section.section_key] = el
              }}
              className={`
                overflow-hidden whitespace-normal
                ${section.style_type === 'main' || section.style_type === 'purpose'
                  ? 'w-full max-w-[300px] sm:max-w-[420px] md:max-w-[600px] mx-4 sm:ml-12 md:ml-24'
                  : 'w-full max-w-[260px] sm:max-w-[340px] md:max-w-[480px] mx-4 sm:mr-12 md:mr-24'
                }
              `}
            >
              {processContent(section.content, section.style_type)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
} 