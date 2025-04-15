'use client'

import React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/auth-js'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error getting user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signIn = async (email: string, password: string) => {
    let isSuccess = false;
    let failureReason: string | null = null;
    let userId: string | null = null;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        failureReason = error.message;
        throw error; // Gooi error door om de catch te triggeren
      }

      // Inloggen succesvol
      isSuccess = true;
      userId = data.user?.id || null;

      // Update user state immediately
      setUser(data.user);

      // Wacht even om zeker te zijn dat de state is bijgewerkt voordat we navigeren
      // Hoewel onAuthStateChange ook triggert, kan dit een race condition voorkomen
      // await new Promise(resolve => setTimeout(resolve, 100)); 

      router.push('/dashboard'); // Aangepast pad voor ons admin panel
      router.refresh(); // Zorg voor een refresh om server components bij te werken

    } catch (error: any) {
      console.error('Sign in error:', error);
      isSuccess = false; // Redundant maar duidelijk
      if (!failureReason) { // Vang andere errors op
        failureReason = error.message || 'Unknown sign-in error';
      }
      // Gooi de originele error opnieuw zodat de LoginForm het kan tonen
      throw error;
    } finally {
      console.log('[AuthContext] Attempting to log login attempt:', { email, isSuccess, failureReason, userId }); // LOG 1: Wordt dit punt bereikt?
      // Log de poging, ongeacht succes of falen
      try {
        const response = await fetch('/api/log-login-attempt', { // Sla response op
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_attempted: email,
            is_successful: isSuccess,
            failure_reason: failureReason,
            user_id: userId,
          }),
        });

        console.log('[AuthContext] Log attempt API response status:', response.status); // LOG 2: Wat is de HTTP status?

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Probeer JSON te parsen, anders lege object
          console.error('[AuthContext] Log attempt API error response:', errorData); // LOG 3: Wat zegt de API error?
          // Gooi geen error hier, loggen mag niet het inloggen blokkeren
        } else {
          console.log('[AuthContext] Login attempt logged successfully via API.'); // LOG 4: Succes log
        }
      } catch (logError) {
        // Loggen mislukt, log dit lokaal maar blokkeer de gebruiker niet
        console.error('[AuthContext] Failed to fetch log API:', logError); // LOG 5: Fout bij het fetchen zelf
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/') // Aangepast pad voor ons admin panel
    router.refresh()
  }

  const value = {
    user,
    isLoading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 