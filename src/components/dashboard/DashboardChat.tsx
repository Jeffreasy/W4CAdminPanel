'use client'

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { ChatBubbleOvalLeftEllipsisIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../ui/LoadingSpinner'
import { useAuth } from '../../contexts/AuthContext'

interface Comment {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  content: string;
  context?: string | null;
}

interface DashboardChatProps {
  comments: Comment[];
  addComment: (content: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  formatTimestamp: (timestamp: string) => string;
}

export interface DashboardChatHandle {
  openChat: () => void;
}

const DashboardChat = forwardRef<DashboardChatHandle, DashboardChatProps>((
  {
    comments,
    addComment,
    isLoading,
    error,
    formatTimestamp
  },
  ref
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    openChat: () => {
      setIsOpen(true);
    }
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    if (isOpen) {
       setTimeout(scrollToBottom, 100);
    }
  }, [comments, isOpen]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSending(true);
    try {
      await addComment(newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error("Error sending comment (via prop):", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-30 p-3 rounded-full shadow-lg transition-colors duration-200 
                   ${isOpen ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        aria-label={isOpen ? "Close Chat" : "Open Chat"}
      >
        {isOpen ? <XMarkIcon className="h-6 w-6" /> : <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 md:inset-auto md:bottom-20 md:right-6 z-40 
                     w-full h-full md:w-96 md:h-[70vh] md:max-h-[600px] 
                     bg-gray-800 border border-gray-700 rounded-lg shadow-xl 
                     flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-700/50">
            <h3 className="font-semibold text-white">Dashboard Chat</h3>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-gray-400 hover:text-white"
              aria-label="Close Chat"
             >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading && <div className="text-center text-gray-400"><LoadingSpinner message="Loading comments..." /></div>}
            {error && <div className="text-center text-red-400 bg-red-900/50 p-2 rounded border border-red-500/50">Error: {error}</div>}
            {!isLoading && comments.length === 0 && !error && (
              <p className="text-center text-gray-500 italic">No comments yet.</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex flex-col items-start">
                 <div className="flex items-center text-xs mb-1 space-x-2">
                    <span className="font-medium text-blue-400" title={comment.user_id || undefined}>{comment.user_email || 'Unknown User'}</span>
                    <span className="text-gray-500">{formatTimestamp(comment.created_at)}</span>
                 </div>
                 <div className="bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200">
                    {comment.content}
                 </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-700 bg-gray-700/50">
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <input
                id="chat-input"
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type your message..."
                className="form-input flex-1 text-sm py-1.5"
                disabled={!user || isSending}
                required
              />
              <button 
                type="submit" 
                className="btn-primary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!user || !newComment.trim() || isSending}
                aria-label="Send Message"
              >
                 {isSending ? <LoadingSpinner size="small"/> : <PaperAirplaneIcon className="h-5 w-5"/>}
              </button>
            </form>
            {!user && <p className="text-xs text-red-400 mt-1">You must be logged in to comment.</p>} 
          </div>
        </div>
      )}
    </>
  )
});

DashboardChat.displayName = 'DashboardChat';

export default DashboardChat; 