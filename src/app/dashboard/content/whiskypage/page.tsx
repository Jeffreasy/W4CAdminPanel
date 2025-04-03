'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import LoadingSpinner from '../../../../components/ui/LoadingSpinner'
import ErrorMessage from '../../../../components/ui/ErrorMessage'
import toast from 'react-hot-toast'

interface WhiskySection {
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

export default function WhiskyContentManagement() {
  const [sections, setSections] = useState<WhiskySection[]>([])
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
        .from('whisky_sections')
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch whisky sections'
      setError(errorMessage)
      console.error('Error fetching whisky sections:', err)
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
        .from('whisky_sections')
        .update({ 
          content: newContent,
          updated_at: new Date().toISOString(),
          last_edited_by: user.email,
          version: currentSection.version + 1
        })
        .eq('id', id)

      if (error) {
        const supabaseError = error as SupabaseError
        throw new Error(`Database error: ${supabaseError.message}${supabaseError.details ? ` - ${supabaseError.details}` : ''}`)
      }

      toast.success('Whisky content updated successfully')
      await fetchSections()
      setEditingSection(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update whisky content'
      toast.error(errorMessage)
      console.error('Error updating whisky section:', err)
    }
  }

  if (loading) return <LoadingSpinner size="large" message="Loading whisky content..." centered />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Whisky Content Management</h1>
      </div>

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
                {section.style_type === 'link' ? (
                  <input
                    type="url"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    defaultValue={section.content}
                    id={`edit-${section.id}`}
                    placeholder="Enter URL"
                  />
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
                {section.style_type === 'link' ? (
                  <a 
                    href={section.content.startsWith('http') ? section.content : `https://${section.content}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {section.content}
                  </a>
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
  )
} 