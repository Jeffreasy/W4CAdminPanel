'use client'

import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext' // Needed for enabling/disabling input
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../ui/LoadingSpinner'
import type { User } from '@supabase/auth-js'

// Re-define or import Comment type if not globally available
interface Comment {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  content: string;
  context?: string | null;
}

// --- AANGEPAST: Import/Define ChangelogItem type ---
interface ChangelogItem {
  id: string;
  content: string;
  created_at: string;
}

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
  user: User | null;
  comments: Comment[];
  commentsLoading: boolean;
  commentsError: string | null;
  addComment: (content: string) => Promise<void>;
  formatTimestamp: (timestamp: string) => string;
  // --- AANGEPAST: Changelog props ---
  changelogItems: ChangelogItem[];
  changelogLoading: boolean;
  changelogError: string | null;
}

export default function WelcomeModal({
  isOpen,
  onClose,
  onOpenChat,
  user, 
  comments,
  commentsLoading,
  commentsError,
  addComment,
  formatTimestamp,
  // --- AANGEPAST: Destructure new props ---
  changelogItems,
  changelogLoading,
  changelogError
}: WelcomeModalProps) {
  const [modalComment, setModalComment] = useState('');
  const [isSendingModalComment, setIsSendingModalComment] = useState(false);

  // Handler for sending comment from modal
  const handleSendFromModal = async () => {
    if (!modalComment.trim() || !user) return;
    setIsSendingModalComment(true);
    try {
      await addComment(modalComment);
      setModalComment(''); // Clear modal input on success
    } catch (error) {
      // Error should be handled by the passed addComment function (e.g., via toast)
      console.error("Error sending comment from modal:", error);
    } finally {
      setIsSendingModalComment(false);
    }
  };

  // Handler for Open Chat button in modal footer
  const handleTriggerOpenChat = () => {
    onOpenChat(); // Call the function passed via props
    // onClose(); // onClose is now handled by the parent in handleOpenChat
  };

  if (!isOpen) {
    return null; // Don't render anything if not open
  }

  return (
    <> 
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose} // Allow closing by clicking overlay
      />
      
      {/* Centered Message Box */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative max-w-2xl w-full bg-gray-800 shadow-xl rounded-lg border border-gray-700 flex flex-col overflow-hidden">
          {/* Content */}
          <div className="p-6 flex-1 space-y-4">
             <h2 className="text-lg font-semibold text-white">Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : '!'}</h2>
             
             {/* --- AANGEPAST: Changelog Section met Loading/Error --- */}
             <div>
               <p className="text-sm font-semibold text-gray-300 mb-2">Recent Updates:</p>
               <div className="text-sm text-gray-400 space-y-1 max-h-36 overflow-y-auto pr-2 border-b border-gray-700 pb-3 mb-3">
                 {changelogLoading && <p className="italic text-gray-500">Loading updates...</p>}
                 {changelogError && <p className="text-red-400">Error: {changelogError}</p>}
                 {!changelogLoading && !changelogError && changelogItems.length === 0 && (
                    <p className="italic text-gray-500">No recent updates found.</p>
                 )}
                 {!changelogLoading && !changelogError && changelogItems.length > 0 && (
                    <div className="space-y-2">
                      {changelogItems.map((item) => (
                         <div key={item.id} className="pb-2 border-b border-gray-700/50 last:border-b-0">
                           <p className="text-gray-300">{item.content}</p> 
                           <p className="text-xs text-gray-500 mt-1 text-right">
                             {formatTimestamp(item.created_at)}
                           </p>
                         </div>
                      ))}
                    </div>
                 )}
               </div>
             </div>

             {/* Chat Preview Section */}
             <div>
               <p className="text-sm font-semibold text-gray-300 mb-2">Latest Chat Messages:</p>
               <div className="text-sm text-gray-400 space-y-2 max-h-28 overflow-y-auto pr-2 border-b border-gray-700 pb-3 mb-3">
                 {commentsLoading && <p className="italic text-gray-500">Loading messages...</p>}
                 {commentsError && <p className="text-red-400">Error: {commentsError}</p>}
                 {!commentsLoading && !commentsError && comments.length === 0 && (
                    <p className="italic text-gray-500">No messages yet.</p>
                 )}
                 {!commentsLoading && !commentsError && comments.length > 0 && (
                    comments.slice(-4).map(comment => (
                       <div key={comment.id} className="text-xs border-b border-gray-700/50 pb-1 last:border-b-0">
                         <span className="font-medium text-blue-400 mr-1">{comment.user_email?.split('@')[0] || 'User'}:</span>
                         <span className="text-gray-300">{comment.content}</span>
                         <span className="text-gray-500 text-[10px] ml-1">({formatTimestamp(comment.created_at)})</span>
                       </div>
                    ))
                 )}
               </div>
             </div>
             {/* Chat Input Section in Modal */}
             <div className="pt-2">
                <label htmlFor="modal-comment-input" className="text-sm font-semibold text-gray-300 mb-1 block">Reply directly:</label>
                <div className="flex items-center gap-2">
                     <input
                        id="modal-comment-input"
                        type="text"
                        value={modalComment}
                        onChange={(e) => setModalComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendFromModal(); } }} // Send on Enter
                        placeholder="Type your message..."
                        className="form-input flex-1 text-sm py-1.5"
                        disabled={!user || isSendingModalComment}
                     />
                     <button 
                        type="button" 
                        onClick={handleSendFromModal}
                        className="btn-primary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!user || !modalComment.trim() || isSendingModalComment}
                        aria-label="Send Message"
                    >
                        {isSendingModalComment ? <LoadingSpinner size="small"/> : <PaperAirplaneIcon className="h-5 w-5"/>}
                    </button>
                </div>
             </div>
          </div>
          {/* Footer with buttons */}
          <div className="px-4 py-3 bg-gray-700/50 border-t border-gray-700 flex justify-between items-center">
             {/* Open Chat Button */}
             <button onClick={handleTriggerOpenChat} className="btn-primary btn-sm">
                Open Full Chat
             </button>
             {/* Close Button */}
             <button onClick={onClose} className="btn-secondary btn-sm">
                Close
             </button>
          </div>
        </div>
      </div>
    </>
  )
} 