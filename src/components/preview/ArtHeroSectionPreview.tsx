'use client'

import React from 'react'

// Define ArtHeroSection interface based on frontend code and potential fields
interface ArtHeroSection {
  id: string
  section_key: string
  content: string
  order_number: number
  style_type: string // 'image', 'image_alt', 'title', 'subtitle', 'paragraph'
}

interface ArtHeroSectionPreviewProps {
  sections: ArtHeroSection[]
}

// Helper function to get content by type, similar to frontend
const getContentByType = (sections: ArtHeroSection[], type: string): string => {
  return sections.find(section => section.style_type === type)?.content || ''
}

export function ArtHeroSectionPreview({ sections }: ArtHeroSectionPreviewProps) {
  
  // Extract content using the helper
  const title = getContentByType(sections, 'title')
  const subtitle = getContentByType(sections, 'subtitle')
  const imageUrl = getContentByType(sections, 'image')
  const imageAlt = getContentByType(sections, 'image_alt')
  const paragraphs = sections.filter(section => section.style_type === 'paragraph')

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 border-b border-gray-600 pb-2">Art Hero Preview</h3>
      
      <div className="space-y-4">
        {/* Image Info */}
        <div>
          <p className="text-sm text-gray-400 font-medium">Background Image URL/ID:</p>
          <p className="text-base text-gray-200 font-mono break-all">{imageUrl || "(Not set)"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 font-medium">Image Alt Text:</p>
          <p className="text-base text-gray-200">{imageAlt || "(Not set)"}</p>
        </div>
        
        <hr className="border-gray-700 my-4" />

        {/* Text Content */}
        <div className="text-center bg-black/30 p-4 rounded">
          {title && (
            <h1 className="text-2xl font-bold mb-2">
              {title}
            </h1>
          )}
          {subtitle && (
            <h2 className="text-xl mb-4">
              {subtitle}
            </h2>
          )}
          <div className="space-y-2">
            {paragraphs.length > 0 ? (
              paragraphs.map(section => (
                <p key={section.id} className="text-base">
                  {section.content}
                </p>
              ))
            ) : (
              <p className="text-gray-500 italic">(No paragraph content set)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 