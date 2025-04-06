'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import LoadingSpinner from '../../../../components/ui/LoadingSpinner'
import ErrorMessage from '../../../../components/ui/ErrorMessage'
import toast from 'react-hot-toast'
import { TextTabContent } from './content/TextTabContent'
import { CirclesTabContent } from './content/CirclesTabContent'
import { HeroCircleTabContent } from './content/HeroCircleTabContent'

export interface HomeSection {
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

export interface CircleSection {
  id: string
  href: string
  text: string
  circle_size_desktop: number
  circle_size_tablet?: number
  circle_size_mobile?: number
  border_width: number
  border_color: string
  border_style: string
  font_size_desktop: number
  font_size_tablet?: number
  font_size_mobile?: number
  font_weight: string
  text_color: string
  rotation_duration: number
  hover_scale: number
  animation_ease: string
  glow_background: string
  glow_shadow: string
  glow_intensity: number
  glow_duration: number
  gap_desktop?: number
  gap_tablet?: number
  gap_mobile?: number
  order_number?: number
  is_active?: boolean
  status?: string
  created_at?: string
  updated_at?: string
}

export interface CircleHeroItem {
  id: string;
  image_src: string;
  image_alt: string;
  url: string;
  word: string;
  is_active: boolean;
  order_number: number;
  created_at?: string;
  updated_at?: string;
}

interface SupabaseError {
  message: string
  details?: string
  hint?: string
}

export default function HomeContentManagement() {
  const [textSections, setTextSections] = useState<HomeSection[]>([])
  const [circleSections, setCircleSections] = useState<CircleSection[]>([])
  const [loadingText, setLoadingText] = useState(true)
  const [loadingCircles, setLoadingCircles] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'text' | 'circles' | 'hero'>('text')
  const [circleHeroItems, setCircleHeroItems] = useState<CircleHeroItem[]>([])
  const [loadingHeroItems, setLoadingHeroItems] = useState(true)
  const supabase = createClientComponentClient()
  const { user } = useAuth()

  const isLoading = loadingText || loadingCircles || loadingHeroItems

  useEffect(() => {
    fetchTextSections()
    fetchCircleSections()
    fetchCircleHeroItems()
  }, [])

  async function fetchTextSections() {
    setLoadingText(true)
    try {
      const { data, error } = await supabase
        .from('text_sections')
        .select('*')
        .order('order_number')
      if (error) throw error
      if (!data) throw new Error('No text data received')
      setTextSections(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? `Failed to fetch text sections: ${err.message}` : 'Failed to fetch text sections'
      setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage)
      console.error('Error fetching text sections:', err)
    } finally {
      setLoadingText(false)
    }
  }

  async function fetchCircleSections() {
    setLoadingCircles(true)
    try {
      const { data, error } = await supabase
        .from('circle_sections')
        .select('*')
        .order('order_number')
      if (error) throw error
      if (!data) throw new Error('No circle data received')
      setCircleSections(data as CircleSection[])
    } catch (err) {
      const errorMessage = err instanceof Error ? `Failed to fetch circle sections: ${err.message}` : 'Failed to fetch circle sections'
      setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage)
      console.error('Error fetching circle sections:', err)
    } finally {
      setLoadingCircles(false)
    }
  }

  async function fetchCircleHeroItems() {
    setLoadingHeroItems(true)
    try {
      const { data, error } = await supabase
        .from('circle_hero_items')
        .select('*')
        .order('order_number')
      if (error) throw error
      if (!data) throw new Error('No circle hero data received')
      setCircleHeroItems(data as CircleHeroItem[])
    } catch (err) {
      const errorMessage = err instanceof Error ? `Failed to fetch hero items: ${err.message}` : 'Failed to fetch hero items'
      setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage)
      console.error('Error fetching hero items:', err)
    } finally {
      setLoadingHeroItems(false)
    }
  }

  async function updateTextSection(id: string, newContent: string): Promise<void> {
    if (!user?.email) {
       toast.error('Login required')
       return Promise.reject('Login required')
    }
    try {
      const currentSection = textSections.find(s => s.id === id)
      if (!currentSection) throw new Error('Text section not found')
      const { error } = await supabase
        .from('text_sections')
        .update({ content: newContent, updated_at: new Date().toISOString(), version: currentSection.version + 1 })
        .eq('id', id)
      if (error) throw error
      toast.success('Text content updated')
      await fetchTextSections()
      return Promise.resolve()
    } catch (err) {
      const errorMsg = err instanceof Error ? `Update failed: ${err.message}` : 'Update failed'
      toast.error(errorMsg)
      console.error('Error updating text section:', err)
      return Promise.reject(errorMsg)
    }
  }

  async function updateCircleSection(id: string, updatedFields: Partial<CircleSection>): Promise<void> {
    if (!user?.email) { 
      toast.error('Login required')
      return Promise.reject('Login required')
    }
    try {
      updatedFields.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('circle_sections')
        .update(updatedFields)
        .eq('id', id)
      if (error) throw error
      toast.success('Circle section updated')
      await fetchCircleSections()
      return Promise.resolve()
    } catch (err) {
       const errorMsg = err instanceof Error ? `Update failed: ${err.message}` : 'Update failed'
       toast.error(errorMsg)
       console.error('Error updating circle section:', err)
       return Promise.reject(errorMsg)
    }
  }

  async function addCircleHeroItem(newItem: Omit<CircleHeroItem, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    if (!user?.email) {
      toast.error('Login required');
      return Promise.reject('Login required');
    }
    try {
      const { error } = await supabase
        .from('circle_hero_items')
        .insert([{ ...newItem }])
      if (error) throw error;
      toast.success('Hero item added');
      await fetchCircleHeroItems();
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err instanceof Error ? `Add failed: ${err.message}` : 'Add failed';
      toast.error(errorMsg);
      console.error('Error adding hero item:', err);
      return Promise.reject(errorMsg);
    }
  }

  async function updateCircleHeroItem(id: string, updatedFields: Partial<Omit<CircleHeroItem, 'id' | 'created_at'>>): Promise<void> {
    if (!user?.email) {
      toast.error('Login required');
      return Promise.reject('Login required');
    }
    try {
      updatedFields.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from('circle_hero_items')
        .update(updatedFields)
        .eq('id', id);
      if (error) throw error;
      toast.success('Hero item updated');
      await fetchCircleHeroItems();
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err instanceof Error ? `Update failed: ${err.message}` : 'Update failed';
      toast.error(errorMsg);
      console.error('Error updating hero item:', err);
      return Promise.reject(errorMsg);
    }
  }

  async function deleteCircleHeroItem(id: string): Promise<void> {
    if (!user?.email) {
      toast.error('Login required');
      return Promise.reject('Login required');
    }
    try {
      const { error } = await supabase
        .from('circle_hero_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Hero item deleted');
      await fetchCircleHeroItems();
      return Promise.resolve();
    } catch (err) {
      const errorMsg = err instanceof Error ? `Delete failed: ${err.message}` : 'Delete failed';
      toast.error(errorMsg);
      console.error('Error deleting hero item:', err);
      return Promise.reject(errorMsg);
    }
  }

  if (isLoading) return <LoadingSpinner size="large" message="Loading home content..." centered />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Home Content Management</h1>
      </div>

      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('text')}
          className={`py-2 px-4 font-medium text-sm 
            ${activeTab === 'text' 
              ? 'border-b-2 border-blue-500 text-white' 
              : 'text-gray-400 hover:text-gray-200'}`}
        >
          Text Sections
        </button>
        <button
          onClick={() => setActiveTab('circles')}
          className={`py-2 px-4 font-medium text-sm 
            ${activeTab === 'circles' 
              ? 'border-b-2 border-blue-500 text-white' 
              : 'text-gray-400 hover:text-gray-200'}`}
        >
          Circle Sections
        </button>
        <button
          onClick={() => setActiveTab('hero')}
          className={`py-2 px-4 font-medium text-sm ${activeTab === 'hero' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Hero Circle
        </button>
      </div>

      {activeTab === 'text' && (
        <TextTabContent 
          textSections={textSections} 
          updateTextSection={updateTextSection} 
        />
      )}

      {activeTab === 'circles' && (
        <CirclesTabContent 
          circleSections={circleSections} 
          updateCircleSection={updateCircleSection} 
        />
      )}

      {activeTab === 'hero' && (
        <HeroCircleTabContent 
          heroItems={circleHeroItems} 
          addHeroItem={addCircleHeroItem}
          updateHeroItem={updateCircleHeroItem}
          deleteHeroItem={deleteCircleHeroItem}
        />
      )}
    </div>
  )
} 