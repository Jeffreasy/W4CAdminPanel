'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import LoadingSpinner from '../../../../components/ui/LoadingSpinner'
import ErrorMessage from '../../../../components/ui/ErrorMessage'
import { CharitySectionPreview } from '../../../../components/preview/CharitySectionPreview'
import toast from 'react-hot-toast'

interface CharitySection {
  id: string
  section_key: string
  content: string
  order_number: number
  style_type: string
  version?: number
  updated_at?: string
}

interface SupabaseError {
  message: string
  details?: string
  hint?: string
}

export default function CharityContentManagement() {
  const [sections, setSections] = useState<CharitySection[]>([])
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
        .from('charity_sections')
        .select('*')
        .order('order_number')

      if (fetchError) {
        const supabaseError = fetchError as SupabaseError
        throw new Error(`Database error: ${supabaseError.message}${supabaseError.details ? ` - ${supabaseError.details}` : ''}`)
      }

      if (!data) {
        throw new Error('No data received from charity_sections table')
      }
      
      setSections(data as CharitySection[])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch charity sections'
      setError(errorMessage)
      console.error('Error fetching charity sections:', err)
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

      const updateData: Partial<CharitySection> = {
        content: newContent,
        updated_at: new Date().toISOString(),
      }
      
      if (typeof currentSection.version === 'number') {
          updateData.version = currentSection.version + 1
      }

      const { error: updateError } = await supabase
        .from('charity_sections')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        const supabaseError = updateError as SupabaseError
        throw new Error(`Database error: ${supabaseError.message}${supabaseError.details ? ` - ${supabaseError.details}` : ''}`)
      }

      toast.success('Charity content updated successfully')
      await fetchSections()
      setEditingSection(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update charity content'
      toast.error(errorMessage)
      console.error('Error updating charity section:', err)
    }
  }

  if (loading) return <LoadingSpinner size="large" message="Loading Charity content..." centered />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Charity Content Management</h1>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Live Voorbeeld Charity</h2>
        <div className="border border-gray-700 rounded-lg p-0 bg-gray-800/50 shadow-inner overflow-hidden">
          {sections.length > 0 ? 
            <CharitySectionPreview sections={sections} /> : 
            <div className="p-4 text-center text-gray-500">Preview not available.</div>
          }
        </div>
      </div>

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
                {typeof section.version === 'number' && (
                    <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                      v{section.version}
                    </span>
                )}
              </div>

              {editingSection === section.id ? (
                <div className="space-y-4">
                  {section.style_type === 'link' ? (
                    <input
                      type="text"
                      className="form-input"
                      defaultValue={section.content}
                      id={`edit-${section.id}`}
                      placeholder="Enter URL (e.g., example.com)"
                    />
                  ) : (
                    <textarea
                      className="form-input h-32"
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
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {section.content}
                  </p>
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