"use client"

import React from 'react'
import Link from 'next/link'
import { SimpleChatInterface } from '../chat/SimpleChatInterface'
import { useChat } from '../../hooks/useChat'
import { Button } from '../ui/button'
import { History, Save } from 'lucide-react'

export function LiveChatContent() {
  const {
    messages,
    isLoading,
    sendMessage,
    startNewChat,
    error
  } = useChat({
    welcomeMessage: true,
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const handleSaveChat = async () => {
    // Check if there are any user messages to save
    const hasUserMessages = messages.some(msg => msg.sender?.isCurrentUser);
    if (!hasUserMessages) {
      return;
    }
    
    const result = await startNewChat();
    if (result.success) {
      // Show success message briefly
      console.log('Chat saved and new chat started');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Chat Analysis</h1>
          <p className="text-muted-foreground">
            Real-time conversation analysis and insights
          </p>
        </div>
        
        <Link href="/live-chat">
          <Button variant="outline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            View Chat History
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border shadow-sm h-[600px]">
        <SimpleChatInterface
          title="CouplesDNA AI"
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          onSaveChat={handleSaveChat}
        />
        
        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  )
}