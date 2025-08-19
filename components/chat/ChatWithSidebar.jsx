import React, { useState, useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { SimpleChatInterface } from './SimpleChatInterface';
import { useChat } from '../../hooks/useChat';
import { chatService } from '../../lib/chatService';

export const ChatWithSidebar = ({
  title = "CouplesDNA Live Chat",
  className,
  ...props
}) => {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  const {
    messages,
    isLoading,
    sessionId,
    error,
    sendMessage,
    switchSession
  } = useChat({
    welcomeMessage: true,
    autoLoad: false, // We'll load manually when session is selected
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  // Handle session selection from sidebar
  const handleSessionSelect = async (session) => {
    setCurrentSessionId(session.id);
    await switchSession(session.id);
  };

  // Handle new chat creation
  const handleNewChat = async (newSession) => {
    if (newSession) {
      setCurrentSessionId(newSession.id);
      await switchSession(newSession.id);
    }
  };

  // Handle all sessions deleted
  const handleAllDeleted = async () => {
    // Create a new session since all were deleted
    const newSessionResult = await chatService.createChatSession();
    if (newSessionResult.success) {
      setCurrentSessionId(newSessionResult.data.id);
      await switchSession(newSessionResult.data.id);
    }
  };

  // Initialize with first session or create new one
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Try to get existing sessions
        const result = await chatService.getChatSessions();
        if (result.success && result.data.length > 0) {
          // Load the most recent session
          const latestSession = result.data[0];
          setCurrentSessionId(latestSession.id);
          await switchSession(latestSession.id);
        } else {
          // Create a new session if none exist
          const newSessionResult = await chatService.createChatSession();
          if (newSessionResult.success) {
            setCurrentSessionId(newSessionResult.data.id);
            await switchSession(newSessionResult.data.id);
          }
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
  }, []);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <ChatSidebar
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
          onAllDeleted={handleAllDeleted}
          className="h-screen"
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentSessionId ? (
          <SimpleChatInterface
            title={title}
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
            className="h-screen"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="bg-white border border-black p-8 max-w-md mx-auto">
                <h3 className="text-xl font-medium text-black mb-2">Welcome to Live Chat</h3>
                <p className="text-black text-sm">
                  Select a chat session from the sidebar or create a new one to get started.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-white border-t border-black">
            <p className="text-red-600 text-sm">Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
};