'use client'

import React from 'react'
import { Inter } from 'next/font/google'
import { AuthProvider } from '../../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Toaster } from 'react-hot-toast'
import { animate, animateStaggered } from '../../utils/animations'
import { HomeIcon, FolderIcon, CurrencyDollarIcon, ChartBarIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline'

// Admin styles
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

const navItems = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: <HomeIcon className="h-5 w-5" />
  },
  { 
    name: 'Content', 
    path: '/dashboard/content', 
    icon: <FolderIcon className="h-5 w-5" />
  },
  { 
    name: 'Orders', 
    path: '/dashboard/orders', 
    icon: <CurrencyDollarIcon className="h-5 w-5" />
  },
  { 
    name: 'Analytics', 
    path: '/dashboard/analytics', 
    icon: <ChartBarIcon className="h-5 w-5" />
  },
  { 
    name: 'Looker Studio', 
    path: '/dashboard/looker-studio', 
    icon: <DocumentChartBarIcon className="h-5 w-5" />
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