import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { Inter } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";
import { Toaster } from 'react-hot-toast';
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Admin Dashboard - Whisky For Charity',
  description: 'Admin dashboard voor Whisky For Charity',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <AuthProvider>
          {children}
          <Toaster 
             position="bottom-right"
             toastOptions={{
                style: {
                  background: '#333',
                  color: '#fff',
                },
             }}
          />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
} 