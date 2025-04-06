'use client'

import React from 'react'
import Image from 'next/image'
import { CircleHeroItem } from '../../../app/dashboard/content/homepage/page' // Corrected import path

interface CircleHeroPreviewProps {
  heroItems: CircleHeroItem[];
}

export function CircleHeroPreview({ heroItems }: CircleHeroPreviewProps) {
  if (!heroItems || heroItems.length === 0) {
    return <p className="text-center text-gray-500 italic py-4">No hero items available for preview.</p>;
  }

  return (
    <div className="p-4 bg-gray-800/30">
      <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">Hero Circle Items Preview</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {heroItems.map((item, index) => (
          <div 
            key={item.id || index} 
            className={`border rounded-lg overflow-hidden shadow-md flex flex-col items-center p-3 ${item.is_active ? 'border-green-500/50 bg-green-900/20' : 'border-gray-600 bg-gray-700/30 opacity-60'}`}
          >
            <div className="relative w-24 h-24 mb-3 rounded-full overflow-hidden border-2 border-gray-500">
              {item.image_src ? (
                <Image
                  src={item.image_src}
                  alt={item.image_alt || 'Hero item image'}
                  fill
                  className="object-cover"
                  sizes="96px" // Provide sizes attribute
                />
              ) : (
                <div className="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-gray-400">No Image</div>
              )}
            </div>
            <p className="font-bold text-center text-sm text-white mb-1 truncate w-full" title={item.word}>{item.word}</p>
            <p className="text-xs text-center text-gray-400 truncate w-full" title={item.url}>{item.url || "(No URL)"}</p>
            <p className="text-xs text-gray-500 mt-1">Order: {item.order_number}</p>
            <p className={`text-xs font-medium mt-1 ${item.is_active ? 'text-green-400' : 'text-red-400'}`}>
              {item.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} 