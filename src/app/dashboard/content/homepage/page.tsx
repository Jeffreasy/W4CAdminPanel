'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import LoadingSpinner from '../../../../components/ui/LoadingSpinner'
import ErrorMessage from '../../../../components/ui/ErrorMessage'
import { TextSectionPreview } from '../../../../components/preview/TextSectionPreview'
import toast from 'react-hot-toast'

interface HomeSection {
  id: string
  section_key: string
  content: string
  order_number: number
  style_type: string
  is_active: boolean
  version: number
  updated_at?: string
  last_edited_by?: string
}

interface SupabaseError {
  message: string
  details?: string
  hint?: string
}

export default function HomeContentManagement() {
  const [sections, setSections] = useState<HomeSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const { user } = useAuth()

  useEffect(() => {
    fetchSections()
  }, [])

  async function fetchSections() {
    try {
      const { data, error } = await supabase
        .from('text_sections')
        .select('*')
        .order('order_number')

      if (error) {
        const supabaseError = error as SupabaseError
        throw new Error(`Database error: ${supabaseError.message}${supabaseError.details ? ` - ${supabaseError.details}` : ''}`)
      }

      if (!data) {
        throw new Error('No data received from database')
      }

      setSections(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch home sections'
      setError(errorMessage)
      console.error('Error fetching home sections:', err)
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

      const { error } = await supabase
        .from('text_sections')
        .update({ 
          content: newContent,
          updated_at: new Date().toISOString(),
          version: currentSection.version + 1
        })
        .eq('id', id)

      if (error) {
        const supabaseError = error as SupabaseError
        throw new Error(`Database error: ${supabaseError.message}${supabaseError.details ? ` - ${supabaseError.details}` : ''}`)
      }

      toast.success('Home content updated successfully')
      await fetchSections()
      setEditingSection(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update home content'
      toast.error(errorMessage)
      console.error('Error updating home section:', err)
    }
  }

  if (loading) return <LoadingSpinner size="large" message="Loading home content..." centered />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Home Content Management</h1>
      </div>

      {/* Preview Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Live Voorbeeld Homepage</h2>
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 shadow-inner">
           <TextSectionPreview sections={sections} />
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
                <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                  v{section.version}
                </span>
              </div>

              {editingSection === section.id ? (
                <div className="space-y-4">
                  {section.style_type === 'image' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        defaultValue={section.content}
                        id={`edit-${section.id}`}
                        placeholder="Enter image URL or ID"
                      />
                      {section.content && (
                        <div className="mt-2">
                          <img 
                            src={section.content} 
                            alt="Preview" 
                            className="max-w-full h-auto rounded"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      className="w-full h-32 px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                  {section.style_type === 'image' ? (
                    <div>
                      <img 
                        src={section.content} 
                        alt={section.section_key} 
                        className="max-w-full h-auto rounded"
                      />
                      <p className="mt-2 text-sm text-gray-400">{section.content}</p>
                    </div>
                  ) : (
                    <p className="text-gray-300">{section.content}</p>
                  )}
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