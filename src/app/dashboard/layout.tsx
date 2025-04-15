'use client'

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { Inter } from 'next/font/google'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Toaster, toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { animate, animateStaggered, dashboardAnimations } from '../../utils/animations'
import { HomeIcon, FolderIcon, CurrencyDollarIcon, ChartBarIcon, DocumentChartBarIcon, XMarkIcon, PaperAirplaneIcon, ShieldCheckIcon, ArrowLeftOnRectangleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
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

// --- NIEUW: Definieer de ChangelogItem interface ---
interface ChangelogItem {
  id: string;
  content: string;
  created_at: string; // Optioneel: Kan gebruikt worden voor sorteren/tonen
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
    name: 'Security Logs',
    path: '/dashboard/security', 
    icon: <ShieldCheckIcon className="h-5 w-5" />
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const { user, isLoading: isAuthLoading, signOut } = useAuth()
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const supabase = createClientComponentClient();
  const chatRef = useRef<DashboardChatHandle>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);

  // --- NEW: State and Logic for Comments ---
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // --- NIEUW: State for Changelog --- 
  const [changelogItems, setChangelogItems] = useState<ChangelogItem[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(true);
  const [changelogError, setChangelogError] = useState<string | null>(null);

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

  // --- NIEUW: Fetch changelog function ---
  const fetchChangelog = useCallback(async () => {
    console.log("Fetching changelog items...");
    setChangelogLoading(true);
    setChangelogError(null);
    try {
      const { data, error } = await supabase
        .from('dashboard_changelog')
        .select('id, content, created_at') // Selecteer benodigde velden
        .eq('is_published', true)          // Alleen gepubliceerde items
        .order('order_number', { ascending: false }) // Sorteer op order_number (hoogste eerst)
        .order('created_at', { ascending: false }) // Daarna op datum (nieuwste eerst)
        .limit(5); // Beperk tot de laatste 5 items

      if (error) {
        throw error;
      }
      console.log("Changelog items fetched successfully:", data.length);
      setChangelogItems(data || []);
    } catch (err) {
      console.error("Error fetching changelog:", err);
      setChangelogError(err instanceof Error ? err.message : "Failed to load changelog");
      setChangelogItems([]); // Leegmaken bij fout
    } finally {
      setChangelogLoading(false);
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

  // UseEffect for fetching initial data (comments AND changelog)
  useEffect(() => {
    if (user) {
      fetchComments();
      fetchChangelog(); // Roep fetchChangelog aan als user ingelogd is

      // Setup real-time subscription for comments
      const channel = supabase.channel('realtime comments')
        // ... bestaande subscription code ...
      
      return () => {
        console.log("Unsubscribing from comment updates");
        supabase.removeChannel(channel);
      };
    }
  }, [user, supabase, fetchComments, fetchChangelog]); // Voeg fetchChangelog toe aan dependencies

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
  
  // --- Add useEffect for Welcome Banner Animation --- 
  useEffect(() => {
    if (!isAuthLoading && welcomeRef.current) {
      dashboardAnimations.welcomeBanner(welcomeRef.current);
    }
  }, [isAuthLoading, welcomeRef]);
  // -------------------------------------------------
  
  const isActive = (path: string) => {
    return pathname === path || 
           (path !== '/dashboard' && pathname?.startsWith(path))
  }

  // Format timestamp function (moved here or keep in chat component and pass down? Moved here for now)
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInSeconds = (now.getTime() - date.getTime()) / 1000

      if (diffInSeconds < 60) return 'just now'
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

      return format(date, 'd MMM', { locale: nl })
    } catch (e) {
      return 'Invalid Date'
    }
  };

  // --- Handler for Open Chat button ---
  const handleOpenChat = () => {
     setShowWelcomeMessage(false); // Sluit de modal eerst
     chatRef.current?.openChat(); // Open dan de chat
  }

  // Render null or a loader while auth is loading
  if (isAuthLoading) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-900"><LoadingSpinner message="Loading dashboard..." /></div>;
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
      
      {/* --- Render de WelcomeModal component (nu met changelog props) --- */}
      <WelcomeModal
          isOpen={showWelcomeMessage}
          onClose={() => setShowWelcomeMessage(false)}
          onOpenChat={handleOpenChat}
          user={user}
          comments={comments}
          commentsLoading={commentsLoading}
          commentsError={commentsError}
          addComment={addComment}
          formatTimestamp={formatTimestamp}
          // --- NIEUW: Geef changelog data door ---
          changelogItems={changelogItems}
          changelogLoading={changelogLoading}
          changelogError={changelogError}
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
          {/* ------ WELCOME BANNER MOVED HERE ------ */}
          <div 
            ref={welcomeRef} 
            className="container-card p-0 mx-4 md:mx-6 lg:mx-8 mt-6 mb-6" // Added standard margins/padding
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 sm:p-6">
              <div className="px-6 py-4">
                <h1 className="text-xl sm:text-2xl font-semibold text-white mb-1">
                  Welcome back, {user?.email?.split('@')[0] ?? 'Admin'}!
                </h1>
                <p className="text-sm text-gray-500">{user?.email ?? 'Not logged in'}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 px-6 pb-4 sm:px-0 sm:pb-0">
                <a
                  href="https://www.whiskyforcharity.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-3 py-1.5 sm:px-4 sm:py-2 text-sm flex items-center justify-center gap-1.5 
                             transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  <span>Go to Website</span>
                </a>
                <button
                  onClick={() => signOut()} 
                  className="btn-danger px-3 py-1.5 sm:px-4 sm:py-2 text-sm flex items-center justify-center gap-1.5 
                             transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
          {/* ---------------------------------------- */}

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