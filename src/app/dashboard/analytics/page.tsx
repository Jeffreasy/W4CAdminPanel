'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext' // Adjusted path
import { format } from 'date-fns'
import { useDataFetching } from '../../../hooks/useDataFetching' // Adjusted path
import LoadingSpinner from '../../../components/ui/LoadingSpinner' // Adjusted path
import ErrorMessage from '../../../components/ui/ErrorMessage' // Adjusted path
import { dashboardAnimations } from '../../../utils/animations' // Adjusted path
import Link from 'next/link'
import { nl } from 'date-fns/locale'
import { createClient } from '@supabase/supabase-js'
import {
  ChartBarIcon, // Keep ChartBarIcon for potential use
  ArrowLeftOnRectangleIcon, // Needed for Sign Out
  ArrowTopRightOnSquareIcon, // Needed for Go to Website
  // Removed icons specific to stats if not directly used, add back if needed
} from '@heroicons/react/24/outline'

// Interfaces from original dashboard page
interface Order {
  id: string
  order_number: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  total_amount: number
  status: string
  created_at: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  is_active: boolean | string
  image: string // Keep image, might be useful for product list
  created_at: string
}

// Supabase client (can likely be removed if useDataFetching handles it)
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Renamed function
export default function AnalyticsPage() {
  const { user, isLoading, signOut } = useAuth()
  const router = useRouter()
  
  // Refs for animations (kept for stats and tables)
  const statsRef = useRef<HTMLDivElement>(null)
  const ordersTableRef = useRef<HTMLDivElement>(null)
  const productsTableRef = useRef<HTMLDivElement>(null)

  // Helper function for active products (kept)
  const isProductActive = (product: Product): boolean => {
    if (typeof product.is_active === 'boolean') {
      return product.is_active;
    }
    if (typeof product.is_active === 'string') {
      const value = product.is_active.toLowerCase();
      return value === 'true' || value === '1' || value === 'yes';
    }
    if (product.is_active === null || product.is_active === undefined) {
      console.warn('Null/undefined is_active value:', product.id, product.name);
      return false;
    }
    console.warn('Unknown is_active type:', product.id, product.name, product.is_active, typeof product.is_active);
    return false;
  };

  // Data fetching for orders (kept)
  const { 
    data: orders, 
    isLoading: ordersLoading, 
    error: ordersError,
    refetch: refetchOrders
  } = useDataFetching<Order>('orders', {
    fetchOnMount: !!user,
    dependencies: [user],
    transform: (data) => {
      return data
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    }
  });
  
  // Data fetching for products (kept)
  const { 
    data: products, 
    isLoading: productsLoading, 
    error: productsError,
    refetch: refetchProducts
  } = useDataFetching<Product>('products', {
    fetchOnMount: !!user,
    dependencies: [user]
    // No transform needed here, fetch all products for stats
  });
  
  // Combined loading state (kept)
  const dataLoading = ordersLoading || productsLoading;
  
  // Combined error state (kept)
  const combinedError = ordersError || productsError; // Renamed to avoid conflict

  // Animations useEffect (updated)
  useEffect(() => {
    // Check if data is loaded AND refs are available
    if (!dataLoading && statsRef.current && ordersTableRef.current && productsTableRef.current) {
      // Removed Welcome banner animation call
      // dashboardAnimations.welcomeBanner(welcomeRef.current);
      
      // Statistics animation
      dashboardAnimations.statsCards('.stat-card');
      
      // Tables animation
      dashboardAnimations.table(ordersTableRef.current, 0.4);
      dashboardAnimations.table(productsTableRef.current, 0.6);
      
      // Stat value counting animation
      const statValueElements = document.querySelectorAll('.stat-value');
      statValueElements.forEach(element => {
        const dataValue = element.getAttribute('data-value');
        if (!dataValue) return;
        let valueToAnimate: number;
        let totalValue: number | undefined;
        if (dataValue.includes('/')) {
          const parts = dataValue.split('/');
          valueToAnimate = Number(parts[0]);
          totalValue = Number(parts[1]);
        } else {
          valueToAnimate = Number(dataValue);
        }
        if (isNaN(valueToAnimate)) return; 
        const prefix = element.textContent?.includes('€') ? '€' : '';
        const suffix = totalValue !== undefined ? `/${totalValue}` : '';
        dashboardAnimations.statValue(element as HTMLElement, valueToAnimate, {
          prefix,
          suffix,
          isCurrency: prefix === '€'
        });
      });
    } 
    // Removed welcomeRef from dependency array
  }, [dataLoading, statsRef, ordersTableRef, productsTableRef]);

  // Loading state for auth or data (kept)
  if (isLoading || dataLoading) {
    return <LoadingSpinner size="large" message="Loading Overview..." centered />
  }

  // Redirect if not logged in (kept)
  if (!user) {
    router.push('/login')
    return null
  }
  
  // Handle error retry (kept)
  const handleRetry = () => {
    if (ordersError) refetchOrders();
    if (productsError) refetchProducts();
  };
  
  // Calculate dashboard stats (kept)
  // Ensure data is available before calculating
  const safeOrders = orders || [];
  const safeProducts = products || [];
  
  const totalOrdersCount = safeOrders.length // This is only the top 5, consider fetching all for accurate count or renaming
  const totalProductsCount = safeProducts.length
  const activeProductsCount = safeProducts.filter(isProductActive).length;
  const totalRevenueAmount = safeOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) // Use safeOrders and default to 0

  return (
    <div className="section-spacing"> {/* Kept original spacing */}
      {/* Error Message Display (kept) */}
      {combinedError && (
        <ErrorMessage 
          message={combinedError.message} 
          variant="error"
          action={{
            label: "Retry Fetching",
            onClick: handleRetry
          }}
        />
      )}
      
      {/* Statistics Section (kept) */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Orders Card */}
        <div className="stat-card container-card hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="p-6">
            <div className="flex justify-between items-start space-x-4">
              <div>
                <h2 className="text-subtitle mb-2">Recent Orders</h2>
                {/* Display the count of fetched recent orders */} 
                <p className="stat-value text-2xl sm:text-3xl font-bold text-white" data-value={totalOrdersCount}>{totalOrdersCount}</p>
                <p className="text-info mt-2">last 5 orders shown</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Total Revenue Card */}
        <div className="stat-card container-card hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="p-6">
            <div className="flex justify-between items-start space-x-4">
              <div>
                <h2 className="text-subtitle mb-2">Recent Revenue</h2>
                <p className="stat-value text-2xl sm:text-3xl font-bold text-amber-500" data-value={totalRevenueAmount}>€{totalRevenueAmount.toFixed(2)}</p>
                <p className="text-info mt-2">from last 5 orders</p>
              </div>
               <div className="p-3 bg-amber-500/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Active Products Card */}
        <div className="stat-card container-card hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="p-6">
            <div className="flex justify-between items-start space-x-4">
              <div>
                <h2 className="text-subtitle mb-2">Products</h2>
                {/* Display active/total products */}
                <p className="stat-value text-2xl sm:text-3xl font-bold text-white" data-value={`${activeProductsCount}/${totalProductsCount}`}>
                  {activeProductsCount}/{totalProductsCount}
                </p>
                <p className="text-info mt-2">active / total</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Card (kept as is) */}
        <div className="stat-card container-card hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="p-6">
            <div className="flex justify-between items-start space-x-4">
              <div>
                <h2 className="text-subtitle mb-2">Status</h2>
                <div className="flex gap-2 items-center mb-1 sm:mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-lg sm:text-xl font-bold">Online</p>
                </div>
                <div className="flex items-center text-muted text-xs sm:text-sm">
                  <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  <span>All systems operational</span>
                </div>
              </div>
               <div className="p-3 bg-purple-500/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Orders Table Section (kept) */}
      <div ref={ordersTableRef} className="container-card">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-white">Recent Orders</h2>
          <button 
            onClick={() => router.push('/dashboard/orders')} // Link to full orders page
            className="btn-secondary px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm self-start sm:self-center"
          >
            View All Orders
          </button>
        </div>
        
        {safeOrders.length === 0 && !ordersLoading ? (
          <div className="text-center py-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-gray-300 text-lg mb-1">No recent orders</p>
            <p className="text-info">Recent orders will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[640px] px-4 sm:px-0">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 border-b border-gray-700">Order Number</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-400 border-b border-gray-700">Amount</th>
                     <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 border-b border-gray-700 hidden md:table-cell">Customer</th>
                     <th className="px-6 py-4 text-center text-sm font-medium text-gray-400 border-b border-gray-700 hidden lg:table-cell">Date</th>
                     <th className="px-6 py-4 text-center text-sm font-medium text-gray-400 border-b border-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {safeOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)} // Link to order detail
                      className="h-16 hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 whitespace-nowrap text-sm font-medium text-white">#{order.order_number}</td>
                      <td className="px-6 text-right text-amber-500 font-medium text-sm">€{Number(order.total_amount).toFixed(2)}</td>
                      <td className="px-6 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">{order.customer_first_name} {order.customer_last_name}</td>
                      <td className="px-6 text-center whitespace-nowrap text-xs text-gray-400 hidden lg:table-cell">{format(new Date(order.created_at), 'PP', { locale: nl })}</td>
                      <td className="px-6 text-center whitespace-nowrap">
                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                            order.status === 'paid' ? 'bg-green-500/20 text-green-400' : 
                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' : 
                            order.status === 'completed' ? 'bg-purple-500/20 text-purple-400' : 
                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 
                            'bg-yellow-500/20 text-yellow-400' 
                         }`}> 
                           {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Products Table Section (kept) */}
      <div ref={productsTableRef} className="container-card">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-white">Recent Products</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 self-start sm:self-auto">
            <button 
              onClick={() => router.push('/dashboard/products/new')} // Link to add product
              className="btn-primary px-3 py-1.5 sm:px-4 sm:py-2 text-sm"
            >
              Add Product
            </button>
            <button 
              onClick={() => router.push('/dashboard/products')} // Link to manage products
              className="btn-secondary px-3 py-1.5 sm:px-4 sm:py-2 text-sm"
            >
              Manage Products
            </button>
          </div>
        </div>
        
        {safeProducts.length === 0 && !productsLoading ? (
          <div className="text-center py-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-gray-300 text-lg mb-1">No products yet</p>
            <p className="text-info">Add products to start selling.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[640px] px-4 sm:px-0">
              <table className="w-full">
                <thead>
                  <tr className="text-left bg-gray-700/40">
                    <th className="px-6 py-4 text-left font-semibold text-gray-300">Name</th>
                    <th className="px-6 py-4 text-right text-gray-300 hidden sm:table-cell">Price</th>
                    <th className="px-6 py-4 text-center text-gray-300 hidden md:table-cell">Stock</th>
                    <th className="px-6 py-4 text-center text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show maybe top 5 most recently added products? */} 
                  {safeProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map((product) => (
                    <tr 
                      key={product.id} 
                      onClick={() => router.push(`/dashboard/products/${product.id}`)} // Link to product detail
                      className="border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors cursor-pointer h-16"
                    >
                      <td className="px-6 py-4 text-xs sm:text-sm font-medium text-white">{product.name}</td>
                      <td className="px-6 py-4 text-xs sm:text-sm font-medium text-amber-500 text-right hidden sm:table-cell">€{Number(product.price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-xs sm:text-sm font-medium text-center hidden md:table-cell">{product.stock}</td>
                      <td className="px-6 py-4 text-center">
                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                            isProductActive(product) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                         }`}> 
                           {isProductActive(product) ? 'Active' : 'Inactive'}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Removed mobile scroll indicator as tables are more detailed now */}
      </div>
    </div>
  )
} 