'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import ErrorMessage from '../../../components/ui/ErrorMessage'
import { AboutSectionPreview } from '../../../components/preview/AboutSectionPreview'
import toast from 'react-hot-toast'

// Interface matching the about_sections table structure
interface AboutSection {
  id: string
  section_key: string
  content: string
  order_number: number
  style_type: string // 'title', 'paragraph', 'email'
  // Assuming version and updated_at might exist based on homepage
  version?: number 
  updated_at?: string
  // Add other fields if they exist in your table
}

interface SupabaseError {
  message: string
  details?: string
  hint?: string
}

export default function AboutContentManagement() {
  const [sections, setSections] = useState<AboutSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const { user } = useAuth()

  useEffect(() => {
    fetchSections()
  }, [])

  async function fetchSections() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('about_sections') // Target the about_sections table
        .select('*')
        .order('order_number')

      if (fetchError) {
        const supabaseError = fetchError as SupabaseError
        throw new Error(`Database error: ${supabaseError.message}${supabaseError.details ? ` - ${supabaseError.details}` : ''}`)
      }

      if (!data) {
        throw new Error('No data received from about_sections table')
      }
      
      // Explicitly cast data to AboutSection[]
      setSections(data as AboutSection[])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch about sections'
      setError(errorMessage)
      console.error('Error fetching about sections:', err)
    } finally {
      setLoading(false)
    }
  }

  async function updateSection(id: string, newContent: string) {
    if (!user?.email) {
      toast.error('You must be logged in to make changes')
      return
    }

    try {
      const currentSection = sections.find(s => s.id === id)
      if (!currentSection) {
        throw new Error('Section not found')
      }

      const updateData: Partial<AboutSection> = {
        content: newContent,
        updated_at: new Date().toISOString(),
      }
      
      // Conditionally add version increment if the field exists
      if (typeof currentSection.version === 'number') {
          updateData.version = currentSection.version + 1
      }

      const { error: updateError } = await supabase
        .from('about_sections') // Target the about_sections table
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        const supabaseError = updateError as SupabaseError
        throw new Error(`Database error: ${supabaseError.message}${supabaseError.details ? ` - ${supabaseError.details}` : ''}`)
      }

      toast.success('About Us content updated successfully')
      await fetchSections() // Re-fetch to update preview and data
      setEditingSection(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update about content'
      toast.error(errorMessage)
      console.error('Error updating about section:', err)
    }
  }

  if (loading) return <LoadingSpinner size="large" message="Loading About Us content..." centered />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">About Us Content Management</h1>
      </div>

      {/* Preview Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Live Voorbeeld About Us</h2>
        <div className="border border-gray-700 rounded-lg p-0 bg-gray-800/50 shadow-inner overflow-hidden">
          {/* Use AboutSectionPreview and ensure sections has data */}
          {sections.length > 0 ? 
            <AboutSectionPreview sections={sections} /> : 
            <div className="p-4 text-center text-gray-500">Preview not available.</div>
          }
        </div>
      </div>

      {/* Content Management Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Bewerk Secties</h2>
        <div className="grid gap-6">
          {sections.map((section) => (
            <div key={section.id} className="container-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-200">
                    {section.section_key.replace(/_/g, ' ').toUpperCase()}
                  </h2>
                  <p className="text-sm text-gray-400">Type: {section.style_type}</p>
                </div>
                {/* Display version if it exists */}
                {typeof section.version === 'number' && (
                    <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                      v{section.version}
                    </span>
                )}
              </div>

              {editingSection === section.id ? (
                <div className="space-y-4">
                  {/* Use textarea for title and paragraph, input for email */}
                  {section.style_type === 'email' ? (
                    <input
                      type="email" // Use email type for validation
                      className="form-input" // Use consistent form styling
                      defaultValue={section.content}
                      id={`edit-${section.id}`}
                      placeholder="Enter email address"
                    />
                  ) : (
                    <textarea
                      className="form-input h-32" // Use consistent form styling
                      defaultValue={section.content}
                      id={`edit-${section.id}`}
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => {
                        const element = document.getElementById(`edit-${section.id}`) as HTMLInputElement | HTMLTextAreaElement
                        if (!element) return
                        const newContent = element.value
                        updateSection(section.id, newContent)
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setEditingSection(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-300 whitespace-pre-wrap">{section.content}</p>
                  <button
                    className="btn-secondary"
                    onClick={() => setEditingSection(section.id)}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}