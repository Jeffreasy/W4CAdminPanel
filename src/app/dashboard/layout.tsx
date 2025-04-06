'use client'

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { Inter } from 'next/font/google'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Toaster, toast } from 'react-hot-toast'
import { animate, animateStaggered } from '../../utils/animations'
import { HomeIcon, FolderIcon, CurrencyDollarIcon, ChartBarIcon, DocumentChartBarIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import DashboardChat, { DashboardChatHandle } from '../../components/dashboard/DashboardChat'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import WelcomeModal from '../../components/dashboard/WelcomeModal'

// Admin styles
import '../globals.css'

// Interface for comments (can be shared or redefined)
interface Comment {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  content: string;
  context?: string | null;
}

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
  const { user, isLoading: isAuthLoading } = useAuth()
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const supabase = createClientComponentClient();
  const chatRef = useRef<DashboardChatHandle>(null);

  // --- NEW: State and Logic for Comments ---
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // Fetch comments function (moved here)
  const fetchComments = useCallback(async () => {
    // Only fetch if needed (e.g., chat open or modal needs it), or always fetch?
    // Let's fetch always initially for the modal preview.
    console.log("Fetching comments...");
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const { data, error } = await supabase
        .from('dashboard_comments')
        .select('*')
        .order('created_at', { ascending: true }); // Fetch all initially

      if (error) throw error;
      setComments(data || []);
      console.log("Comments fetched successfully:", data?.length);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setCommentsError(err instanceof Error ? err.message : "Failed to fetch comments");
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [supabase]);

  // Initial fetch for comments
  useEffect(() => {
      fetchComments();
  }, [fetchComments]);

  // Real-time subscription (moved here)
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-comments-realtime')
      .on(
        'postgres_changes',
        // Listen to INSERT, UPDATE, DELETE for full sync
        { event: '*', schema: 'public', table: 'dashboard_comments' }, 
        (payload) => {
          console.log('Realtime comment change received:', payload);
          // More robust handling for different events
          if (payload.eventType === 'INSERT') {
             setComments((currentComments) => [
                 ...currentComments, 
                 payload.new as Comment
             ]);
          }
          // Add handling for UPDATE and DELETE if needed (e.g., update content, filter out deleted)
          // else if (payload.eventType === 'UPDATE') { ... }
          // else if (payload.eventType === 'DELETE') { ... }
          // Simple refetch on any change is also an option:
          // fetchComments(); 
        }
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to comment updates!');
          } 
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('Realtime subscription error:', err);
              setCommentsError("Realtime connection failed. Please refresh.");
          }
      });

    return () => {
      console.log('Unsubscribing from comment updates');
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchComments]); // Added fetchComments dependency if refetching is used

  // Add comment function (defined here)
  const addComment = async (content: string): Promise<void> => {
     if (!content.trim() || !user) {
         toast.error("Cannot send empty message or not logged in.");
         return Promise.reject("Empty message or not logged in");
     }

     try {
      const { error } = await supabase
        .from('dashboard_comments')
        .insert({
          user_id: user.id,
          user_email: user.email,
          content: content.trim(),
          // context: 'dashboard' // Add context if needed
        });

      if (error) throw error;
       // No need to manually add, real-time should handle it
       return Promise.resolve();
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send comment");
      return Promise.reject(err instanceof Error ? err.message : "Failed to send comment");
    } 
  }

  // --- Existing useEffects (Animations, Welcome Message) ---
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
  }, [isMounted, pathname])
  
  // --- UPDATED: Welcome Message Logic (using state, not toast) ---
  useEffect(() => {
     console.log("DashboardLayout useEffect running. Auth Loading:", isAuthLoading, "User:", user);
    if (!isAuthLoading && user) {
      const welcomeShown = sessionStorage.getItem('welcomeMessageShown');
      console.log(`Value retrieved from sessionStorage['welcomeMessageShown']:`, welcomeShown);
      if (!welcomeShown) {
        console.log("User logged in and message not shown this session. Setting showWelcomeMessage to true...");
        setShowWelcomeMessage(true);
        sessionStorage.setItem('welcomeMessageShown', 'true');
      } else {
         console.log("Auth loaded, user exists, but welcome message already shown this session.");
      }
    } else if (!isAuthLoading && !user) {
        console.log("Auth loaded but no user exists.");
    } else { 
        console.log("Auth is still loading...");
    }
  }, [user, isAuthLoading]);
  
  const isActive = (path: string) => {
    return pathname === path || 
           (path !== '/dashboard' && pathname?.startsWith(path))
  }

  // --- Changelog Data ---
  // Define the changelog content - Keep this updated!
  const changelogItems = [
    "Vercel Analytics added.",
    "Homepage content management refactored.",
    "Added 'Hero Circle' section management.",
    "Added welcome/changelog notification.",
    "Corrected dashboard layout implementation.",
    "Centered welcome message with blur background.",
    "Added dashboard chat feature.",
    "Integrated chat preview into welcome message.",
    "Added direct reply & open chat from welcome message."
  ];

  // Format timestamp function (moved here or keep in chat component and pass down? Moved here for now)
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('nl-NL', { 
          dateStyle: 'short', 
          timeStyle: 'short' 
      });
    } catch (e) {
        return "Invalid date";
    }
  };

  // --- Handler for Open Chat button ---
  const handleOpenChat = () => {
     setShowWelcomeMessage(false); // Sluit de modal eerst
     chatRef.current?.openChat(); // Open dan de chat
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
      
      {/* --- NIEUW: Render de WelcomeModal component --- */}
      <WelcomeModal
          isOpen={showWelcomeMessage}
          onClose={() => setShowWelcomeMessage(false)}
          onOpenChat={handleOpenChat} // Nieuwe handler doorgeven
          user={user}
          comments={comments}
          commentsLoading={commentsLoading}
          commentsError={commentsError}
          addComment={addComment} // Functie doorgeven
          formatTimestamp={formatTimestamp} // Functie doorgeven
          changelogItems={changelogItems} // Changelog doorgeven
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
      
      {/* Render Chat Component with Ref */}
      <DashboardChat 
          ref={chatRef}
          comments={comments}
          addComment={addComment}
          isLoading={commentsLoading}
          error={commentsError}
          formatTimestamp={formatTimestamp}
      />
    </AuthProvider>
  )
} 