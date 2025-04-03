'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Link from 'next/link';
import { animate } from '../../../utils/animations';

export default function LookerStudio() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);
  
  useEffect(() => {
    // Simuleer laden van integratie
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (!loading && contentRef.current) {
      animate(contentRef.current, 'fadeInUp', {
        duration: 0.5
      });
    }
  }, [loading]);
  
  if (authLoading) {
    return <LoadingSpinner message="Authenticeren..." size="large" centered />;
  }
  
  if (loading) {
    return <LoadingSpinner message="Looker Studio dashboard laden..." size="large" centered />;
  }
  
  if (error) {
    return <ErrorMessage message={error} variant="error" />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Looker Studio Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/analytics"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm transition-colors shadow-md"
          >
            Terug naar Analytics
          </Link>
          <a
            href="https://lookerstudio.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm transition-colors shadow-md"
          >
            Looker Studio openen
          </a>
        </div>
      </div>
      
      <div ref={contentRef} className="space-y-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-xl font-semibold">
              Whisky For Charity - Verkoopdashboard
            </h2>
          </div>
          
          <div className="border border-gray-600 rounded-lg bg-gray-900 p-4 sm:p-6 relative overflow-hidden">
            <iframe 
              width="100%" 
              height="600" 
              src="https://lookerstudio.google.com/embed/reporting/a2b98320-db81-4585-8369-7eb86e0968f6/page/kIV1C"
              frameBorder="0" 
              style={{border: 0}}
              allowFullScreen
              className="z-10 relative"
            ></iframe>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
            <h3 className="font-semibold mb-4">Hoe te integreren</h3>
            <ol className="space-y-3 text-gray-300 list-decimal ml-5">
              <li>Log in op je Google-account en ga naar <a href="https://lookerstudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Looker Studio</a></li>
              <li>Klik op "Rapport maken" en kies een gegevensbron</li>
              <li>Maak verbinding met Supabase PostgreSQL database</li>
              <li>Maak je dashboard en grafieken</li>
              <li>Klik op "Delen" om een embed code te genereren</li>
              <li>Kopieer de embed code naar deze pagina</li>
            </ol>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
            <h3 className="font-semibold mb-4">Voorbeelden van rapporten</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="w-2 h-2 mr-2 bg-blue-500 rounded-full"></span>
                <span>Verkoop per productcategorie</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 mr-2 bg-green-500 rounded-full"></span>
                <span>Maandelijks omzetoverzicht</span>
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 mr-2 bg-amber-500 rounded-full"></span>
                <span>Winst per product</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 