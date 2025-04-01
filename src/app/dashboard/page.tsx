'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { useDataFetching } from '../../hooks/useDataFetching'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import { dashboardAnimations } from '../../utils/animations'
import Link from 'next/link'
import Image from 'next/image'
import { nl } from 'date-fns/locale'
import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
  image: string
  created_at: string
}

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DashboardPage() {
  const { user, isLoading, signOut } = useAuth()
  const router = useRouter()
  
  // Refs voor animaties
  const statsRef = useRef<HTMLDivElement>(null)
  const welcomeRef = useRef<HTMLDivElement>(null)
  const ordersTableRef = useRef<HTMLDivElement>(null)
  const productsTableRef = useRef<HTMLDivElement>(null)

  // Verbeterde functie voor het bepalen van actieve producten
  const isProductActive = (product: Product): boolean => {
    // Controleer verschillende mogelijke representaties
    if (typeof product.is_active === 'boolean') {
      return product.is_active;
    }
    if (typeof product.is_active === 'string') {
      const value = product.is_active.toLowerCase();
      return value === 'true' || value === '1' || value === 'yes';
    }
    if (product.is_active === null || product.is_active === undefined) {
      console.log('Null/undefined is_active value:', product.id, product.name);
      return false;
    }
    // Als het een andere waarde is, log deze voor debugging
    console.log('Onbekend is_active type:', product.id, product.name, product.is_active, typeof product.is_active);
    return false;
  };

  // Data fetching voor orders met de nieuwe hook
  const { 
    data: orders, 
    isLoading: ordersLoading, 
    error: ordersError,
    refetch: refetchOrders
  } = useDataFetching<Order>('orders', {
    fetchOnMount: !!user,
    dependencies: [user],
    transform: (data) => {
      // Sorteer orders op datum (nieuwste eerst) en limiteer tot 5
      return data
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    }
  });
  
  // Data fetching voor products met de nieuwe hook
  const { 
    data: products, 
    isLoading: productsLoading, 
    error: productsError,
    refetch: refetchProducts
  } = useDataFetching<Product>('products', {
    fetchOnMount: !!user,
    dependencies: [user]
  });
  
  // Bepaal of er data aan het laden is
  const dataLoading = ordersLoading || productsLoading;
  
  // Combineer eventuele fouten
  const error = ordersError || productsError;

  // Animaties
  useEffect(() => {
    if (!dataLoading && statsRef.current) {
      // Welcome banner animatie
      dashboardAnimations.welcomeBanner(welcomeRef.current);
      
      // Statistieken animatie
      dashboardAnimations.statsCards('.stat-card');
      
      // Tabellen animatie
      dashboardAnimations.table(ordersTableRef.current, 0.4);
      dashboardAnimations.table(productsTableRef.current, 0.6);
      
      // Statistiek nummers tellen animatie
      const statValueElements = document.querySelectorAll('.stat-value');
      statValueElements.forEach(element => {
        const dataValue = element.getAttribute('data-value');
        if (!dataValue) return;

        const [active, total] = dataValue.split('/').map(Number);
        const prefix = element.textContent?.includes('€') ? '€' : '';
        const suffix = element.textContent?.includes('/') ? `/${total}` : '';
        
        // Gebruik de animateCountUp functie uit onze utility
        dashboardAnimations.statValue(element, active, {
          prefix,
          suffix,
          isCurrency: prefix === '€'
        });
      });
    }
  }, [dataLoading]);

  if (isLoading || dataLoading) {
    return <LoadingSpinner size="large" message="Loading dashboard..." centered />
  }

  if (!user) {
    router.push('/login')
    return null
  }
  
  // Handle error retry
  const handleRetry = () => {
    refetchOrders();
    refetchProducts();
  };
  
  // Calculate dashboard stats
  const totalOrders = orders.length
  const totalProducts = products.length
  const activeProducts = products.filter(isProductActive).length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0)

  return (
    <div className="section-spacing">
      {/* Welkom Banner */}
      <div 
        ref={welcomeRef} 
        className="container-card"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-title mb-2 flex items-center">
              <span>
                Welcome back
              </span>
              <div className="ml-2 inline-block w-1.5 h-6 bg-blue-500 animate-pulse rounded"></div>
            </h1>
            <p className="text-muted text-wrap-all">{user.email}</p>
          </div>
          <div className="flex gap-2 sm:gap-3 self-start sm:self-auto">
            <button
              onClick={() => router.push('/dashboard/analytics')}
              className="btn-primary"
            >
              Analytics
            </button>
            <button
              onClick={() => signOut()}
              className="btn-danger"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
      
      {error && (
        <ErrorMessage 
          message={error.message} 
          variant="error"
          action={{ 
            label: "Opnieuw proberen", 
            onClick: handleRetry
          }}
        />
      )}
      
      {/* Statistieken - 2x2 grid op mobiel, 4x1 op desktop */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card container-card hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <h2 className="text-subtitle text-gray-300">Orders</h2>
            <span className="p-1.5 sm:p-2 bg-blue-500/10 text-blue-400 rounded-standard">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </span>
          </div>
          <p className="stat-value text-2xl sm:text-3xl font-bold text-white" data-value={totalOrders}>{totalOrders}</p>
          <p className="text-info mt-1">total orders</p>
        </div>
        
        <div className="stat-card container-card hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <h2 className="text-subtitle text-gray-300">Revenue</h2>
            <span className="p-1.5 sm:p-2 bg-amber-500/10 text-amber-400 rounded-standard">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="stat-value text-2xl sm:text-3xl font-bold text-amber-500" data-value={totalRevenue}>€{totalRevenue.toFixed(2)}</p>
          <p className="text-info mt-1">total revenue</p>
        </div>
        
        <div className="stat-card container-card hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <h2 className="text-subtitle text-gray-300">Products</h2>
            <span className="p-1.5 sm:p-2 bg-green-500/10 text-green-400 rounded-standard">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </span>
          </div>
          <p className="stat-value text-2xl sm:text-3xl font-bold text-white" data-value={`${activeProducts}/${totalProducts}`}>
            {activeProducts}/{totalProducts}
          </p>
          <p className="text-info mt-1">active/total products</p>
        </div>
        
        <div className="stat-card container-card hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <h2 className="text-subtitle text-gray-300">Status</h2>
            <span className="p-1.5 sm:p-2 bg-purple-500/10 text-purple-400 rounded-standard">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="flex gap-2 items-center mb-1 sm:mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-lg sm:text-xl font-bold">Online</p>
          </div>
          <div className="flex items-center text-muted text-xs sm:text-sm">
            <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            <span>All systems operational</span>
          </div>
        </div>
      </div>
      
      {/* Orders Table */}
      <div ref={ordersTableRef} className="container-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
          <h2 className="text-subtitle text-gray-200 mb-2 sm:mb-0">Recent Orders</h2>
          <button onClick={() => router.push('/dashboard/orders')} className="btn-secondary">View All Orders</button>
        </div>
        
        {orders.length === 0 ? (
          <div className="text-center py-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-gray-300 text-lg mb-1">No orders yet</p>
            <p className="text-info">Orders will appear here when customers make purchases.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[640px] px-4 sm:px-0">
              <table className="w-full">
                <thead>
                  <tr className="text-left bg-gray-700/40">
                    <th className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-300">Order Number</th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-300">Customer</th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-300">Date</th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-300">Amount</th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr 
                      key={order.id} 
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                      className="border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-xs sm:text-sm font-medium text-white">#{order.order_number}</td>
                      <td className="px-4 py-3 text-xs sm:text-sm text-gray-300">
                        {order.customer_first_name} {order.customer_last_name}
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm text-gray-400">{format(new Date(order.created_at), 'MMM dd, yyyy')}</td>
                      <td className="px-4 py-3 text-xs sm:text-sm font-medium text-amber-500">€{Number(order.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs sm:text-sm">
                        <span className={`
                          ${order.status === 'pending' && 'tag-warning'}
                          ${order.status === 'paid' && 'tag-success'}
                          ${order.status === 'shipped' && 'tag-info'}
                          ${order.status === 'completed' && 'tag-success'}
                          ${order.status === 'cancelled' && 'tag-error'}
                        `}>
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
      
      {/* Products Table */}
      <div ref={productsTableRef} className="container-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
          <h2 className="text-subtitle text-gray-200 mb-2 sm:mb-0">Products</h2>
          <div className="flex gap-2">
            <button onClick={() => router.push('/dashboard/products/new')} className="btn-primary">
              Add Product
            </button>
            <button onClick={() => router.push('/dashboard/products')} className="btn-secondary">
              Manage Products
            </button>
          </div>
        </div>
        
        {products.length === 0 ? (
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
                    <th className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-300">Name</th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-300">Price</th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-300">Stock</th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 5).map((product) => (
                    <tr 
                      key={product.id} 
                      onClick={() => router.push(`/dashboard/products/${product.id}`)}
                      className="border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-xs sm:text-sm font-medium text-white">{product.name}</td>
                      <td className="px-4 py-3 text-xs sm:text-sm font-medium text-amber-500">€{Number(product.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs sm:text-sm">
                        {Number(product.stock) > 0 ? (
                          <span className="text-white">{product.stock}</span>
                        ) : (
                          <span className="text-red-400">Out of stock</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm">
                        <span className={isProductActive(product) ? 'tag-success' : 'tag-error'}>
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
        
        {/* Scroll indicator voor mobiel */}
        <div className="mt-3 flex justify-center mobile-only">
          <div className="w-16 h-1 bg-gray-700 rounded-full relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/50 animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
} 