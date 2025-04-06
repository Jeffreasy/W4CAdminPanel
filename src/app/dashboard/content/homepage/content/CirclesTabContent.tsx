'use client'

import React, { useState } from 'react'
// import toast from 'react-hot-toast' // Removed unused import
import { CircleSection } from '../page' // Import type from parent
import { ThreeCirclesPreview } from '../../../../../components/preview/Home/ThreeCirclesPreview'

interface CirclesTabContentProps {
  circleSections: CircleSection[];
  updateCircleSection: (id: string, updatedFields: Partial<CircleSection>) => Promise<void>;
}

export function CirclesTabContent({ circleSections, updateCircleSection }: CirclesTabContentProps) {
  const [editingCircleSection, setEditingCircleSection] = useState<string | null>(null)

  // Helper function to render inputs for a circle section
  const renderCircleInputs = (section: CircleSection) => {
    const fields = [
      { key: 'text', label: 'Text', type: 'text' },
      { key: 'href', label: 'Link (URL)', type: 'text' },
      { key: 'circle_size_desktop', label: 'Circle Size (Desktop, px)', type: 'number' },
      { key: 'circle_size_tablet', label: 'Circle Size (Tablet, px)', type: 'number' },
      { key: 'circle_size_mobile', label: 'Circle Size (Mobile, px)', type: 'number' },
      { key: 'border_width', label: 'Border Width (px)', type: 'number' },
      { key: 'border_color', label: 'Border Color', type: 'text' },
      { key: 'border_style', label: 'Border Style (solid, dashed)', type: 'text' },
      { key: 'font_size_desktop', label: 'Font Size (Desktop, px)', type: 'number' },
      { key: 'font_size_tablet', label: 'Font Size (Tablet, px)', type: 'number' },
      { key: 'font_size_mobile', label: 'Font Size (Mobile, px)', type: 'number' },
      { key: 'font_weight', label: 'Font Weight (400, 700, etc)', type: 'text' },
      { key: 'text_color', label: 'Text Color', type: 'text' },
      { key: 'rotation_duration', label: 'Rotation Duration (s)', type: 'number' },
      { key: 'hover_scale', label: 'Hover Scale (e.g., 1.1)', type: 'number', step: '0.05' },
      { key: 'animation_ease', label: 'Animation Ease (e.g., power2.out)', type: 'text' },
      { key: 'glow_background', label: 'Glow Background (rgba or rainbow)', type: 'text' },
      { key: 'glow_shadow', label: 'Glow Shadow (box-shadow value)', type: 'text' },
      { key: 'glow_intensity', label: 'Glow Intensity (0-1)', type: 'number', step: '0.1', min: '0', max: '1' },
      { key: 'glow_duration', label: 'Glow Duration (s)', type: 'number' },
      { key: 'gap_desktop', label: 'Gap (Desktop, px)', type: 'number' },
      { key: 'gap_tablet', label: 'Gap (Tablet, px)', type: 'number' },
      { key: 'gap_mobile', label: 'Gap (Mobile, px)', type: 'number' },
      { key: 'order_number', label: 'Order Number', type: 'number' },
      { key: 'status', label: 'Status (e.g., published)', type: 'text' },
      { key: 'is_active', label: 'Is Active?', type: 'checkbox' },
    ];

    const fieldKeys = fields.map(f => f.key);

    return {
      inputs: fields.map(field => {
        let value: string | number | boolean | undefined = section[field.key as keyof CircleSection];

        if (field.type === 'checkbox') {
          return (
            <div key={field.key} className="mb-3 flex items-center gap-2">
              <input
                type="checkbox"
                id={`edit-circle-${section.id}-${field.key}`}
                className="form-checkbox h-5 w-5 text-blue-600 border-gray-600 rounded focus:ring-blue-500/50 bg-gray-700"
                defaultChecked={value === true}
              />
              <label htmlFor={`edit-circle-${section.id}-${field.key}`} className="form-label mb-0">
                {field.label}
              </label>
            </div>
          )
        }
        
        return (
          <div key={field.key} className="mb-3">
            <label htmlFor={`edit-circle-${section.id}-${field.key}`} className="form-label">
              {field.label}
            </label>
            <input
              type={field.type}
              id={`edit-circle-${section.id}-${field.key}`}
              className="form-input"
              defaultValue={value as string | number}
              step={field.step}
              min={field.min}
              max={field.max}
            />
          </div>
        )
      }),
      keys: fieldKeys
    };
  }

  // Handler to save circle section changes
  const handleSaveCircle = (sectionId: string) => {
    const updatedFields: Partial<CircleSection> = {};
    // Use the helper function to get the keys we need to read
    const renderedInfo = renderCircleInputs({} as CircleSection);
    const fieldsToUpdate = renderedInfo.keys;
    
    fieldsToUpdate.forEach(key => {
      const element = document.getElementById(`edit-circle-${sectionId}-${key}`) as HTMLInputElement;
      if (element) {
        let value: string | number | boolean = element.value;
        const inputType = element.type;

        if (inputType === 'number') value = parseFloat(value as string) || 0; // Handle potential NaN
        if (inputType === 'checkbox') value = element.checked;
        
        // Only assign if the key is valid for CircleSection
        if (key in ({} as CircleSection)) { // Basic check if key exists in the type
           (updatedFields as any)[key] = value;
        }
      }
    });

    updateCircleSection(sectionId, updatedFields).then(() => {
        setEditingCircleSection(null); // Close edit mode on success
    }).catch(err => {
        console.error("Update failed within tab:", err)
    })
  };

  return (
    <div className="space-y-8">
      {/* Circle Preview Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Live Voorbeeld Cirkels</h2>
        <div className="border border-gray-700 rounded-lg p-0 bg-gray-800/50 shadow-inner overflow-hidden">
          <ThreeCirclesPreview sections={circleSections} />
        </div>
      </div>

      {/* Circle Content Management */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Bewerk Cirkel Secties</h2>
        <div className="grid gap-6">
          {circleSections.map((section) => (
            <div key={section.id} className="container-card p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-200">
                  Cirkel: {section.text || `(ID: ${section.id})`}
                </h2>
                <div className="flex items-center gap-2">
                  {section.status && (
                     <span className={`tag-${section.status === 'published' ? 'success' : 'neutral'} tag-sm`}>
                        {section.status}
                     </span>
                   )}
                  {typeof section.order_number === 'number' && (
                     <span className="text-xs text-gray-500">Order: {section.order_number}</span>
                  )}
                </div>
              </div>

              {editingCircleSection === section.id ? (
                <div className="space-y-4">
                   {renderCircleInputs(section).inputs}
                   <div className="flex gap-2 mt-4">
                      <button 
                         className="btn-primary" 
                         onClick={() => handleSaveCircle(section.id)}
                      >Save Circle</button>
                      <button 
                         className="btn-secondary" 
                         onClick={() => setEditingCircleSection(null)}
                       >Cancel</button>
                   </div>
                </div>
              ) : (
                <div className="space-y-4">
                   <p className="text-sm text-gray-400">Text: <span className="text-gray-300">{section.text}</span></p>
                   <p className="text-sm text-gray-400">Link: <span className="text-gray-300">{section.href}</span></p>
                   <p className="text-sm text-gray-400">Order: <span className="text-gray-300">{section.order_number ?? 'N/A'}</span></p>
                   <p className="text-sm text-gray-400">Status: <span className={`font-medium ${section.status === 'published' ? 'text-green-400' : 'text-gray-300'}`}>{section.status ?? 'N/A'}</span></p>
                   <p className="text-sm text-gray-400">Active: <span className={`font-medium ${section.is_active ? 'text-green-400' : 'text-red-400'}`}>{section.is_active ? 'Yes' : 'No'}</span></p>
                   <button 
                     className="btn-secondary mt-2" 
                     onClick={() => setEditingCircleSection(section.id)}
                   >Edit Circle</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 