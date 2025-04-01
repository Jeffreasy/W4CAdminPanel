'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { user, signIn } = useAuth()
  const router = useRouter()
  
  const formRef = useRef<HTMLFormElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Set hydrated state
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  
  useEffect(() => {
    if (!isHydrated) return // Skip animations until hydrated
    
    if (user) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isHydrated, user, router])

  // Separate useEffect for animations
  useEffect(() => {
    if (!isHydrated || user) return // Skip animations if hydrated and user exists
    
    // Animations for login page
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
    
    if (logoRef.current && titleRef.current) {
      timeline
        .fromTo(
          logoRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8 }
        )
        .fromTo(
          titleRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          '-=0.4'
        )
        .fromTo(
          '.form-field',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.15, duration: 0.6 },
          '-=0.3'
        )
        .fromTo(
          '.login-btn',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          '-=0.2'
        )
    }
  }, [isHydrated, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please enter both email and password')
      shakeForm()
      return
    }
    
    try {
      setError(null)
      setIsLoading(true)
      
      // GSAP animation for login attempt
      if (isHydrated) {
        gsap.to('.login-btn', {
          scale: 0.95,
          duration: 0.2,
          yoyo: true,
          repeat: 1
        })
      }
      
      await signIn(email, password)
      
      // If we get here, login was successful
      // Redirect is handled by useEffect
      
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid email or password')
      shakeForm()
    } finally {
      setIsLoading(false)
    }
  }
  
  // Shake form on error
  const shakeForm = () => {
    if (isHydrated && formRef.current) {
      gsap.fromTo(
        formRef.current,
        { x: -10 },
        { x: 0, duration: 0.1, repeat: 3, yoyo: true }
      )
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div ref={logoRef} className={`mb-6 w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg ${!isHydrated ? 'opacity-0' : ''}`}>
        <span className="text-white font-bold text-xl">W4C</span>
      </div>
      
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700/50">
          <h1 ref={titleRef} className={`text-2xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 ${!isHydrated ? 'opacity-0' : ''}`}>
            Admin Login
          </h1>
          
          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-6 border border-red-500/30 animate-pulse">
              {error}
            </div>
          )}
          
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div className={`form-field ${!isHydrated ? 'opacity-0' : ''}`}>
              <label className="block text-gray-400 mb-2 text-sm font-medium" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            
            <div className={`form-field ${!isHydrated ? 'opacity-0' : ''}`}>
              <label className="block text-gray-400 mb-2 text-sm font-medium" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`login-btn w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-blue-700/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed ${!isHydrated ? 'opacity-0' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </div>
              ) : 'Sign In'}
            </button>
          </form>
        </div>
        
        <div className="text-center mt-6 text-gray-500 text-sm">
          <Link href="/" className="hover:text-white transition-colors">
            Return to Website
          </Link>
          <p className="mt-2">Whisky For Charity Admin Portal</p>
        </div>
      </div>
    </div>
  )
} 