'use client'

import React, { useState, FormEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { CldImage, CldUploadWidget } from 'next-cloudinary'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'react-hot-toast'

interface UploadResult {
  public_id: string;
  secure_url: string;
}

export default function NewProduct() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('1')
  const [isActive, setIsActive] = useState(true)
  const [image, setImage] = useState('')
  const [additionalImages, setAdditionalImages] = useState<string[]>([])
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      // Validate inputs
      if (!name.trim()) throw new Error('Product name is required')
      if (!description.trim()) throw new Error('Description is required')
      if (!price || parseFloat(price) <= 0) throw new Error('Price must be greater than zero')
      if (!stock || parseInt(stock) < 0) throw new Error('Stock cannot be negative')
      if (!image.trim()) throw new Error('Main image is required')
      
      const newProduct = {
        id: uuidv4(),
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        is_active: isActive,
        image,
        cloudinary_id: image, // Using main image as cloudinary_id
        images: [image, ...additionalImages.filter(img => img)],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { error: insertError } = await supabase
        .from('products')
        .insert([newProduct])
      
      if (insertError) throw insertError
      
      toast.success('Product created successfully')
      
      // Redirect to the products page
      router.push('/dashboard/products')
    } catch (err: any) {
      console.error('Error creating product:', err)
      setError(err.message || 'Failed to create product')
      toast.error(err.message || 'Failed to create product')
      setIsSubmitting(false)
    }
  }
  
  const removeImage = (imageToRemove: string) => {
    setAdditionalImages(additionalImages.filter(img => img !== imageToRemove))
    toast.success('Image removed')
  }
  
  const handleImageUpload = useCallback((result: UploadResult) => {
    const publicId = result.public_id;
    setImage(publicId);
    toast.success('Main image uploaded successfully');
  }, []);
  
  const handleAdditionalImageUpload = useCallback((result: UploadResult) => {
    const publicId = result.public_id;
    setAdditionalImages(prev => [...prev, publicId]);
    toast.success('Additional image uploaded successfully');
  }, []);
  
  const setMainImage = (newMainImage: string) => {
    // If current main image exists, add it to additional images
    if (image && image !== newMainImage) {
      setAdditionalImages(prev => [...prev.filter(img => img !== newMainImage), image]);
    }
    
    // Set new main image
    setImage(newMainImage);
    
    // Remove from additional images
    setAdditionalImages(prev => prev.filter(img => img !== newMainImage));
    
    toast.success('Main image updated');
  };
  
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
        <p className="text-xl text-gray-300">Checking authentication...</p>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
          Add New Product
        </h1>
        <button
          onClick={() => router.push('/dashboard/products')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5 transform duration-200"
        >
          Back to Products
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 animate-pulse">
          {error}
        </div>
      )}
      
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Enter product name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[150px]"
                  placeholder="Describe your product"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (€)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 text-blue-600 focus:ring-offset-gray-800"
                  />
                  <span>Active (visible in shop)</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">Main Product Image</label>
                
                {image ? (
                  <div className="relative rounded-lg overflow-hidden border-2 border-gray-700 h-64 group bg-gray-900/50">
                    <CldImage
                      src={image}
                      alt="Main product image"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-contain transition-transform duration-300 group-hover:scale-105 p-2"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 flex items-center justify-center group-hover:bg-opacity-50 transition-all duration-300">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                        <CldUploadWidget
                          uploadPreset="product_images"
                          onSuccess={(result: any) => {
                            if (result.info) {
                              handleImageUpload(result.info);
                            }
                          }}
                        >
                          {({ open }) => (
                            <button 
                              type="button" 
                              onClick={() => open()}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                            >
                              Replace
                            </button>
                          )}
                        </CldUploadWidget>
                        <button
                          type="button"
                          onClick={() => setImage('')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <CldUploadWidget
                    uploadPreset="product_images"
                    onSuccess={(result: any) => {
                      if (result.info) {
                        handleImageUpload(result.info);
                      }
                    }}
                  >
                    {({ open }) => (
                      <button 
                        type="button" 
                        onClick={() => open()}
                        className="w-full h-64 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center bg-gray-700/30 hover:bg-gray-700/50 transition-colors duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-gray-400 text-sm mb-1">Upload main product image</p>
                        <p className="text-gray-500 text-xs">Click to browse</p>
                      </button>
                    )}
                  </CldUploadWidget>
                )}
                
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium">Additional Images</label>
                    
                    <CldUploadWidget
                      uploadPreset="product_images"
                      onSuccess={(result: any) => {
                        if (result.info) {
                          handleAdditionalImageUpload(result.info);
                        }
                      }}
                    >
                      {({ open }) => (
                        <button 
                          type="button" 
                          onClick={() => open()}
                          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
                        >
                          Add Image
                        </button>
                      )}
                    </CldUploadWidget>
                  </div>
                  
                  {additionalImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {additionalImages.map((img, index) => (
                        <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-700 h-24 bg-gray-900/50">
                          <CldImage
                            src={img}
                            alt={`Additional image ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 33vw, 100px"
                            className="object-contain transition-all duration-200 group-hover:opacity-80 p-1"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 flex items-center justify-center group-hover:bg-opacity-50 transition-all duration-300">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-1">
                              <button
                                type="button"
                                onClick={() => setMainImage(img)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-xs"
                              >
                                Set Main
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(img)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                      <p className="text-gray-500 text-sm">No additional images</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-700 mt-6">
            <button
              type="button"
              onClick={() => router.push('/dashboard/products')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors shadow-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Product...
                </span>
              ) : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 