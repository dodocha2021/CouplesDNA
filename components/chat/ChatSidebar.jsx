import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Plus, MessageSquare, Trash2, AlertTriangle } from 'lucide-react';
import { chatService } from '../../lib/chatService';

export const ChatSidebar = ({
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onAllDeleted,
  className
}) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const result = await chatService.getChatSessions();
      if (result.success) {
        setSessions(result.data);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    const result = await chatService.createChatSession();
    if (result.success) {
      await loadSessions(); // Refresh list
      onNewChat?.(result.data);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation(); // Prevent session selection
    
    if (!confirm('Delete this chat session? This cannot be undone.')) {
      return;
    }

    const result = await chatService.deleteChatSession(sessionId);
    if (result.success) {
      await loadSessions(); // Refresh list
      // If we deleted the current session, trigger new chat
      if (sessionId === currentSessionId) {
        handleNewChat();
      }
    }
  };

  const handleDeleteAllSessions = async () => {
    if (sessions.length === 0) return;
    
    const confirmDelete = confirm(
      `Are you sure you want to delete all ${sessions.length} chat sessions? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const result = await chatService.clearAllChatHistory();
      if (result.success) {
        setSessions([]);
        onAllDeleted?.();
      } else {
        alert('Failed to delete all chats. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting all sessions:', error);
      alert('Failed to delete all chats. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const formatSessionTitle = (session) => {
    // If user has set a custom title, use it
    if (session.title && session.title !== 'New Chat') {
      return session.title;
    }
    
    // Otherwise, use formatted date/time
    const date = new Date(session.created_at);
    const now = new Date();
    
    // Check if it's today
    const isToday = date.toDateString() === now.toDateString();
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    // Check if it's this week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const isThisWeek = date >= startOfWeek;
    
    const timeString = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (isToday) {
      return `Today at ${timeString}`;
    } else if (isYesterday) {
      return `Yesterday at ${timeString}`;
    } else if (isThisWeek) {
      const dayName = date.toLocaleDateString([], { weekday: 'short' });
      return `${dayName} at ${timeString}`;
    } else {
      // For older chats, show date and time
      const dateString = date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
      return `${dateString} at ${timeString}`;
    }
  };

  const formatSessionDate = (session) => {
    const date = new Date(session.updated_at);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-black", className)}>
      {/* Header */}
      <div className="p-4 border-b border-black">
        <Button
          onClick={handleNewChat}
          className="w-full bg-black text-white hover:bg-gray-800 border border-black"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No chat sessions yet</p>
            <p className="text-xs text-gray-400">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center justify-between p-3 mb-1 border border-transparent hover:border-black cursor-pointer transition-colors",
                  currentSessionId === session.id && "border-black bg-gray-50"
                )}
                onClick={() => onSessionSelect?.(session)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-gray-600 flex-shrink-0" />
                    <h4 className="text-sm font-medium text-black truncate">
                      {formatSessionTitle(session)}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatSessionDate(session)}
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto hover:bg-red-50 hover:text-red-600"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-black">
        {sessions.length > 0 && (
          <div className="mb-3">
            <Button
              onClick={handleDeleteAllSessions}
              disabled={deleting}
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete All Chats'}
            </Button>
          </div>
        )}
        <div className="text-xs text-gray-500 text-center">
          CouplesDNA Chat History
        </div>
      </div>
    </div>
  );
};