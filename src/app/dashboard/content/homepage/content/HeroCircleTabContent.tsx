'use client'

import React, { useState } from 'react'
import { CircleHeroItem } from '../page' // Import type from parent
import { CircleHeroPreview } from '../../../../../components/preview/Home/CircleHeroPreview' // Import the preview component
import LoadingSpinner from '../../../../../components/ui/LoadingSpinner' // Verified import path

interface HeroCircleTabContentProps {
  heroItems: CircleHeroItem[];
  addHeroItem: (newItem: Omit<CircleHeroItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateHeroItem: (id: string, updatedFields: Partial<Omit<CircleHeroItem, 'id' | 'created_at'>>) => Promise<void>;
  deleteHeroItem: (id: string) => Promise<void>;
}

// No longer need initial state for controlled form
// const initialNewItemState: Omit<CircleHeroItem, 'id' | 'created_at' | 'updated_at'> = { ... };

export function HeroCircleTabContent({ 
  heroItems, 
  addHeroItem, 
  updateHeroItem, 
  deleteHeroItem 
}: HeroCircleTabContentProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  // Remove newItem state
  // const [newItem, setNewItem] = useState(initialNewItemState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const keysToManage: (keyof Omit<CircleHeroItem, 'id' | 'created_at' | 'updated_at'>)[] = ['word', 'image_src', 'image_alt', 'url', 'order_number', 'is_active'];

  // --- Helper Function to Render Form Inputs ---
  const renderFormInputs = (itemData: Partial<CircleHeroItem>, isNew: boolean = false) => {
    const idPrefix = isNew ? 'new-hero' : `edit-hero-${itemData.id}`;
    const fields = [
      { key: 'word', label: 'Word', type: 'text', required: true },
      { key: 'image_src', label: 'Image Source (URL)', type: 'text', required: true },
      { key: 'image_alt', label: 'Image Alt Text', type: 'text', required: true },
      { key: 'url', label: 'Link URL', type: 'text', required: true },
      { key: 'order_number', label: 'Order Number', type: 'number', required: true, defaultValue: 0 },
      { key: 'is_active', label: 'Is Active?', type: 'checkbox', defaultChecked: true },
    ];

    return fields.map(field => {
      let defaultValue: string | number | undefined;
      let defaultChecked: boolean | undefined;
      if (!isNew) {
        const editValue = itemData[field.key as keyof CircleHeroItem];
        defaultValue = (field.type !== 'checkbox') ? (editValue as string | number) : undefined;
        defaultChecked = (field.type === 'checkbox') ? (editValue as boolean) : undefined;
      } else {
        defaultValue = (field.type !== 'checkbox') ? (field.defaultValue as string | number) : undefined;
        defaultChecked = (field.type === 'checkbox') ? field.defaultChecked : undefined;
      }

      if (field.type === 'checkbox') {
        return (
          <div key={field.key} className="mb-3 flex items-center gap-2 col-span-1 sm:col-span-2">
            <input
              type="checkbox"
              id={`${idPrefix}-${field.key}`}
              className="form-checkbox h-5 w-5 text-blue-600 border-gray-600 rounded focus:ring-blue-500/50 bg-gray-700"
              defaultChecked={defaultChecked}
              disabled={isSubmitting}
            />
            <label htmlFor={`${idPrefix}-${field.key}`} className="form-label mb-0">
              {field.label}
            </label>
          </div>
        );
      }

      return (
        <div key={field.key} className="mb-3">
          <label htmlFor={`${idPrefix}-${field.key}`} className="form-label">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <input
            type={field.type}
            id={`${idPrefix}-${field.key}`}
            className="form-input"
            defaultValue={defaultValue}
            required={field.required}
            disabled={isSubmitting}
          />
        </div>
      );
    });
  };

  // --- Event Handlers ---
  const getValuesFromDOM = (idPrefix: string): Partial<Omit<CircleHeroItem, 'id' | 'created_at' | 'updated_at'>> => {
    const values: Partial<Omit<CircleHeroItem, 'id' | 'created_at' | 'updated_at'>> = {};
    keysToManage.forEach(key => {
      const element = document.getElementById(`${idPrefix}-${key}`) as HTMLInputElement;
      if (element) {
        let value: string | number | boolean = element.value;
        if (element.type === 'number') value = parseFloat(element.value) || 0;
        if (element.type === 'checkbox') value = element.checked;
        (values as any)[key] = value;
      }
    });
    return values;
  }

  const handleAddNewItem = async () => {
    const newValues = getValuesFromDOM('new-hero');
    if (!newValues.word || !newValues.image_src || !newValues.image_alt || !newValues.url) {
      alert('Please fill in all required fields for the new item.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addHeroItem(newValues as Omit<CircleHeroItem, 'id' | 'created_at' | 'updated_at'>);
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async (id: string) => {
    const updatedFields = getValuesFromDOM(`edit-hero-${id}`);
    if (!updatedFields.word || !updatedFields.image_src || !updatedFields.image_alt || !updatedFields.url) {
      alert('Please ensure all required fields are filled when updating.');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateHeroItem(id, updatedFields);
      setEditingItemId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, word: string) => {
    if (window.confirm(`Are you sure you want to delete the hero item "${word}"?`)) {
      setIsSubmitting(true);
      try {
        await deleteHeroItem(id);
        if (editingItemId === id) {
          setEditingItemId(null);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // --- Render --- 
  return (
    <div className="space-y-8">
      {/* Hero Circle Preview */}
      <div className="mb-8">
        <CircleHeroPreview heroItems={heroItems} /> 
      </div>

      {/* Add New Hero Item Section */}
      <div className="container-card p-6">
        {isAdding ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">Add New Hero Item</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4"> 
              {renderFormInputs({}, true)} 
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary" onClick={handleAddNewItem} disabled={isSubmitting}>
                {isSubmitting ? <LoadingSpinner size="small" /> : 'Save New Item'}
              </button>
              <button className="btn-secondary" onClick={() => setIsAdding(false)} disabled={isSubmitting}>
                Cancel
              </button>
            </div>
          </div> 
        ) : (
          <button className="btn-primary" onClick={() => setIsAdding(true)} disabled={isSubmitting}>Add New Hero Item</button>
        )}
      </div> 

      {/* Manage Existing Hero Items Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Manage Hero Items</h2>
        <div className="grid gap-6">
          {/* Temporarily comment out the map loop to isolate the error */}
          {/*
          {heroItems.map((item) => (
            <div key={item.id} className="container-card p-6">
              {editingItemId === item.id ? (
                // --- Edit Form ---
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-200">Editing: {item.word}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    {renderFormInputs(item)} 
                  </div> 
                  <div className="flex gap-2 mt-4">
                    <button 
                      className="btn-primary" 
                      onClick={() => handleUpdateItem(item.id)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <LoadingSpinner size="small" /> : 'Save Changes'}
                    </button>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setEditingItemId(null)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-danger ml-auto" 
                      onClick={() => handleDeleteItem(item.id, item.word)}
                      disabled={isSubmitting}
                    >
                      Delete
                    </button>
                  </div> 
                </div> 
              ) : (
                // --- Display View ---
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-200">{item.word}</h3>
                    <p className="text-sm text-gray-400 truncate max-w-xs" title={item.image_src}>Img: {item.image_src}</p>
                    <p className="text-sm text-gray-400 truncate max-w-xs" title={item.url}>URL: {item.url}</p>
                    <p className="text-sm text-gray-400">Order: {item.order_number}</p>
                    <p className={`text-sm font-medium ${item.is_active ? 'text-green-400' : 'text-red-400'}">
                      {item.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div> 
                  <div className="flex flex-col items-end gap-2">
                    <button 
                      className="btn-secondary btn-sm" 
                      onClick={() => setEditingItemId(item.id)}
                      disabled={isSubmitting}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-danger btn-sm" 
                      onClick={() => handleDeleteItem(item.id, item.word)}
                      disabled={isSubmitting}
                    >
                      Delete
                    </button>
                  </div> 
                </div> 
              )}
            </div> 
          ))}
          */}
           {heroItems.length === 0 && (
            <p className="text-center text-gray-500 italic py-4">No hero items found.</p>
           )}
        </div> 
      </div> 
    </div> 
  );
} 