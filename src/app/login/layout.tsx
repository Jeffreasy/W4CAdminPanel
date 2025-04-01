'use client'

import React from 'react'
import { AuthProvider } from '../../contexts/AuthContext'

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
} 