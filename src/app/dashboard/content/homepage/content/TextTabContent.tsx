'use client'

import React, { useState } from 'react'
// import toast from 'react-hot-toast' // Removed unused import
import { HomeSection } from '../page' // Corrected type import path if needed, assuming page.tsx exports it
import { TextSectionPreview } from '../../../../../components/preview/Home/TextSectionPreview' // Corrected path (one level up)

interface TextTabContentProps {
  textSections: HomeSection[];
  updateTextSection: (id: string, newContent: string) => Promise<void>;
}

export function TextTabContent({ textSections, updateTextSection }: TextTabContentProps) {
  const [editingTextSection, setEditingTextSection] = useState<string | null>(null)

  return (
    <div className="space-y-8"> 
      {/* Text Preview Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Live Voorbeeld Tekst</h2>
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 shadow-inner">
          <TextSectionPreview sections={textSections} />
        </div>
      </div>

      {/* Text Content Management */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Bewerk Tekst Secties</h2>
        <div className="grid gap-6">
          {textSections.map((section) => (
            <div key={section.id} className="container-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-200">
                    {section.section_key.replace(/_/g, ' ').toUpperCase()}
                  </h2>
                  <p className="text-sm text-gray-400">Type: {section.style_type}</p>
                </div>
                <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                  v{section.version} 
                </span>
              </div>
              {editingTextSection === section.id ? (
                <div className="space-y-4">
                  {section.style_type === 'image' ? (
                     <input 
                        type="text" 
                        className="form-input" 
                        defaultValue={section.content} 
                        id={`edit-text-${section.id}`} 
                        placeholder="Enter image URL or ID"
                      />
                   ) : (
                     <textarea 
                        className="form-input h-32" 
                        defaultValue={section.content} 
                        id={`edit-text-${section.id}`} 
                      />
                   )}
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => {
                        const element = document.getElementById(`edit-text-${section.id}`) as HTMLInputElement | HTMLTextAreaElement
                        updateTextSection(section.id, element?.value ?? '').then(() => {
                           setEditingTextSection(null); // Close edit mode on successful update
                        }).catch(err => {
                           // Error is already handled/toasted in parent update function
                           console.error("Update failed within tab:", err)
                        })
                      }}>Save</button>
                    <button className="btn-secondary" onClick={() => setEditingTextSection(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {section.style_type === 'image' ? (
                     <p className="text-gray-300 break-all">{section.content || "(No image URL set)"}</p>
                     /* Optionally add a small image preview here if desired */
                  ) : (
                    <p className="text-gray-300 whitespace-pre-wrap">{section.content}</p>
                  )}
                  <button className="btn-secondary" onClick={() => setEditingTextSection(section.id)}>Edit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 