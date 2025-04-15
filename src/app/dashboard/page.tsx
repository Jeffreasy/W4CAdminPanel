'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import Link from 'next/link'
import { animate } from '../../utils/animations'

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);
  
  useEffect(() => {
    // Animate the content (runs once after initial render if not authLoading)
    if (!authLoading && contentRef.current) {
      animate(contentRef.current, 'fadeInUp', {
        duration: 0.5
      });
    }
  }, [authLoading]); // Depends only on authLoading now
  
  // Show loading spinner during authentication check
  if (authLoading) {
    return <LoadingSpinner message="Authenticating..." size="large" centered />;
  }
  
  // Show error message if something went wrong
  if (error) {
    // Added a retry mechanism possibility, although error state is currently not set
    return <ErrorMessage message={error} variant="error" action={{ label: "Retry", onClick: () => { /* Implement retry logic if needed */ setError(null); } }} />;
  }
  
  // Render the Looker Studio integration
  return (
    <div className="space-y-6 section-spacing"> {/* Added section-spacing for consistency */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-2">
          {/* Kept the link to open Looker Studio externally */}
          <a
            href="https://lookerstudio.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary px-4 py-2 text-sm" // Used btn-secondary for consistency
          >
            Open Looker Studio
          </a>
        </div>
      </div>
      
      <div ref={contentRef} className="space-y-6">
        <div className="container-card p-4 sm:p-6"> {/* Used container-card for consistency */}
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-xl font-semibold">
              Whisky For Charity - Sales Dashboard
            </h2>
          </div>
          
          {/* Embed Looker Studio Report */}
          <div className="border border-gray-600 rounded-lg bg-gray-900/50 p-1 sm:p-2 overflow-hidden shadow-inner">
            <iframe
              key={user?.id || 'looker-studio-iframe'}
              width="100%"
              height="600" // Reverted to fixed height
              src="https://lookerstudio.google.com/embed/reporting/c1468cbe-9457-4e5c-883b-29f33ebfa79f/page/8qzGF"
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen
              className="z-10 relative rounded-md"
              title="Looker Studio Sales Dashboard"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
            ></iframe>
          </div>
        </div>
        
        {/* Informational sections (kept from Looker Studio page) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="container-card p-5">
            <h3 className="font-semibold mb-4">How to Integrate</h3>
            <ol className="space-y-3 text-gray-300 list-decimal ml-5 text-sm">
              <li>Log in to your Google account and go to <a href="https://lookerstudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Looker Studio</a></li>
              <li>Click "Create Report" and choose a data source</li>
              <li>Connect to your Supabase PostgreSQL database</li>
              <li>Build your dashboard and charts</li>
              <li>Click "Share" to generate an embed code</li>
              <li>Copy the embed code into this page (if needed for updates)</li>
            </ol>
          </div>
          <div className="container-card p-5">
            <h3 className="font-semibold mb-4">Example Reports</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="w-2 h-2 mr-2 bg-blue-500 rounded-full"></span>
                <span>Sales per product category</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 mr-2 bg-green-500 rounded-full"></span>
                <span>Monthly revenue overview</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 mr-2 bg-amber-500 rounded-full"></span>
                <span>Profit per product</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 