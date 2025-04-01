'use client'

import React from 'react'
import { Inter } from 'next/font/google'
import { AuthProvider } from '../../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Toaster } from 'react-hot-toast'
import { animate, animateStaggered } from '../../utils/animations'

// Admin styles
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

const navItems = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  { 
    name: 'Orders', 
    path: '/dashboard/orders', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    )
  },
  { 
    name: 'Products', 
    path: '/dashboard/products', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  },
  { 
    name: 'Analytics', 
    path: '/dashboard/analytics', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    name: 'Looker Studio', 
    path: '/dashboard/looker-studio', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
    
    // Animate page entrance
    if (isMounted) {
      // Content fade in
      animate('.admin-content', 'fadeInUp', { 
        duration: 0.5, 
        ease: 'power2.out' 
      });
      
      // Header slide in
      animate('.admin-header', 'fadeInDown', { 
        duration: 0.4, 
        ease: 'power2.out' 
      });
      
      // Nav items staggered animation
      animateStaggered('.nav-item', { 
        childAnimation: 'fadeInLeft',
        duration: 0.3, 
        staggerAmount: 0.1, 
        delay: 0.2,
        ease: 'power2.out'
      });
    }
    
    // Close mobile menu when navigating
    setMobileMenuOpen(false)
  }, [isMounted, pathname])
  
  const isActive = (path: string) => {
    return pathname === path || 
           (path !== '/dashboard' && pathname?.startsWith(path))
  }

  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#374151',
            color: '#fff',
            border: '1px solid #4B5563',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <main className="bg-gray-900 text-white min-h-screen">
        {/* Fixed header with z-index to display above main content */}
        <header className="admin-header fixed top-0 left-0 right-0 bg-header border-standard py-3 z-20 shadow-standard">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">WFC</span>
              </div>
              {/* Titel met gradient */}
              <h1 className="font-bold text-lg sm:text-xl">
                <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Whisky For Charity
                </span>
                <span className="text-amber-500 font-normal"> Admin</span>
              </h1>
            </div>
            
            {/* Desktop navigation */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`nav-item px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-blue-600/80 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        
        {/* Bottom mobile navigation bar with icons */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-header border-t border-standard px-1 py-2 z-10 shadow-standard">
          <nav className="flex justify-around">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center justify-center rounded-md transition-all duration-150 ${
                  isActive(item.path)
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full mb-1 ${isActive(item.path) ? 'bg-blue-400' : 'bg-transparent'}`}></div>
                <div className="mb-1">
                  {item.icon}
                </div>
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Main content with padding to account for top navbar */}
        <div className="admin-content pt-[70px] pb-24 md:pb-10 px-3 sm:px-4 md:px-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </AuthProvider>
  )
} 