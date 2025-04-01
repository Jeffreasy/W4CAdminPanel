'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { CldImage } from 'next-cloudinary'
import { toast } from 'react-hot-toast'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function ProductsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [products, setProducts] = useState<Product[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  
  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        setDataLoading(true)
        setError(null)
        
        let query = supabase
          .from('products')
          .select('*')
          .order('name')
        
        // Apply status filter
        if (statusFilter === 'active') {
          query = query.eq('is_active', true)
        } else if (statusFilter === 'inactive') {
          query = query.eq('is_active', false)
        }
        
        const { data, error: fetchError } = await query
        
        if (fetchError) throw fetchError
        setProducts(data || [])
      } catch (err: any) {
        console.error('Error fetching products:', err)
        setError(err.message || 'Failed to load products')
      } finally {
        setDataLoading(false)
      }
    }
    
    if (user) {
      fetchProducts()
    }
  }, [user, supabase, statusFilter])
  
  async function updateProductStatus(productId: string, isActive: boolean) {
    try {
      setIsUpdating(productId)
      
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', productId)
      
      if (error) throw error
      
      // Update local state
      setProducts(products.map(product => 
        product.id === productId ? { ...product, is_active: isActive, updated_at: new Date().toISOString() } : product
      ))
      
      toast.success(`Product ${isActive ? 'activated' : 'deactivated'} successfully`)
    } catch (err: any) {
      console.error('Error updating product status:', err)
      toast.error('Failed to update product status: ' + err.message)
    } finally {
      setIsUpdating(null)
    }
  }
  
  async function updateProductStock(productId: string, stock: number) {
    try {
      setIsUpdating(productId)
      
      const { error } = await supabase
        .from('products')
        .update({ stock, updated_at: new Date().toISOString() })
        .eq('id', productId)
      
      if (error) throw error
      
      // Update local state
      setProducts(products.map(product => 
        product.id === productId ? { ...product, stock, updated_at: new Date().toISOString() } : product
      ))
      
      toast.success('Stock updated successfully')
    } catch (err: any) {
      console.error('Error updating product stock:', err)
      toast.error('Failed to update product stock: ' + err.message)
    } finally {
      setIsUpdating(null)
    }
  }

  // Filtered products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    
    const searchLower = searchTerm.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(searchLower) || 
      product.description.toLowerCase().includes(searchLower)
    );
  }, [products, searchTerm]);
  
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-700 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-300 text-lg">Checking authentication...</p>
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
          Products Management
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/dashboard/products/new')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white text-sm transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5 transform duration-200"
          >
            Add New Product
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm transition-colors shadow-md hover:shadow-lg hover:-translate-y-0.5 transform duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400 animate-pulse">
          {error}
        </div>
      )}
      
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 shadow-md">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name or description..."
            className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Products</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>
      
      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-700 rounded-full animate-spin mb-4"></div>
          <p className="ml-3 text-xl text-gray-300">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-gray-800/80 p-8 rounded-xl shadow-lg text-center border border-gray-700/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-xl font-medium text-gray-300 mb-2">No products found</h3>
          <p className="text-gray-400">
            {searchTerm ? 'Try adjusting your search or filter criteria.' : 'Add some products to get started.'}
          </p>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg flex flex-col border border-gray-700/50 hover:border-gray-500/50 transition-all duration-300 group">
              <div className="relative mb-4 pt-[100%] bg-gray-900/50 rounded overflow-hidden group-hover:shadow-lg transition-all duration-300">
                {product.image ? (
                  <CldImage
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="absolute top-0 left-0 w-full h-full object-contain rounded p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute top-0 left-0 w-full h-full bg-gray-700 flex items-center justify-center rounded">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
                
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs ${
                  product.is_active 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              <h2 className="text-xl font-bold mb-2 text-gray-100 group-hover:text-white transition-colors duration-200">
                {product.name}
              </h2>
              
              <p className="text-gray-400 text-sm mb-3 line-clamp-2 flex-grow">{product.description}</p>
              
              <div className="border-t border-gray-700 pt-3 mt-auto">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
                    €{Number(product.price).toFixed(2)}
                  </p>
                  
                  <div className="flex items-center">
                    <span className="text-sm text-gray-400 mr-2">Stock:</span>
                    <input
                      type="number"
                      min="0"
                      value={product.stock}
                      onChange={(e) => updateProductStock(product.id, parseInt(e.target.value))}
                      className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      disabled={isUpdating === product.id}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                    className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors hover:shadow-md"
                    disabled={isUpdating === product.id}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => updateProductStatus(product.id, !product.is_active)}
                    className={`flex-1 px-3 py-2 rounded text-white text-sm transition-colors hover:shadow-md ${
                      product.is_active 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                    disabled={isUpdating === product.id}
                  >
                    {isUpdating === product.id ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </span>
                    ) : (
                      product.is_active ? 'Deactivate' : 'Activate'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 