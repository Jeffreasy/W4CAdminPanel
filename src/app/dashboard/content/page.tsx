'use client'

import React from 'react'
import Link from 'next/link'
import { 
  HomeIcon, 
  DocumentTextIcon, 
  HeartIcon, 
  PaintBrushIcon, 
  BeakerIcon 
} from '@heroicons/react/24/outline'

const contentPages = [
  {
    name: 'Home Page',
    description: 'Manage the main landing page content',
    href: '/dashboard/content/homepage',
    icon: HomeIcon
  },
  {
    name: 'About Page',
    description: 'Manage the about page content',
    href: '/dashboard/content/aboutpage',
    icon: DocumentTextIcon
  },
  {
    name: 'Charity Page',
    description: 'Manage the charity page content',
    href: '/dashboard/content/charitypage',
    icon: HeartIcon
  },
  {
    name: 'Art Page',
    description: 'Manage the art page content',
    href: '/dashboard/content/artpage',
    icon: PaintBrushIcon
  },
  {
    name: 'Whisky Page',
    description: 'Manage the whisky page content',
    href: '/dashboard/content/whiskypage',
    icon: BeakerIcon
  }
]

export default function ContentManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Content Management</h1>
        <p className="text-gray-400">Manage your website content</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {contentPages.map((page) => (
          <Link
            key={page.name}
            href={page.href}
            className="container-card p-6 hover:bg-gray-800/50 transition-colors duration-200"
          >
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <page.icon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-200">{page.name}</h2>
                <p className="text-sm text-gray-400 mt-1">{page.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 