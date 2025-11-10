"use client"

import React, { useState, useEffect } from 'react'
import { SimpleChatInterface } from '../chat/SimpleChatInterface'
import { useLiveChat } from '../../hooks/useLiveChat'
import { Button } from '../ui/button'
import { RefreshCw, AlertCircle, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

export function LiveChatContent() {
  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    error,
    isSessionExpired,
    getSessionInfo
  } = useLiveChat({
    welcomeMessage: true,
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onSessionLimitReached: (info) => {
      console.log('Session limit reached:', info);
    }
  });

  const [sessionInfo, setSessionInfo] = useState(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Update session info periodically
  useEffect(() => {
    const updateInfo = () => {
      const info = getSessionInfo();
      setSessionInfo(info);

      // Show warning when approaching limits
      const shouldWarn = info.remainingMessages <= 10 || info.remainingMinutes <= 5;
      setShowSessionWarning(shouldWarn && !info.isExpired);
    };

    updateInfo();
    const interval = setInterval(updateInfo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [getSessionInfo]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Chat Analysis</h1>
          <p className="text-muted-foreground">
            Real-time conversation with AI-powered relationship insights
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sessionInfo && !isSessionExpired && (
            <div className="text-sm text-muted-foreground mr-4">
              <span className="font-medium">{sessionInfo.messageCount}</span>/{sessionInfo.maxMessages} messages
              <span className="mx-2">•</span>
              <span className="font-medium">{sessionInfo.elapsedMinutes}</span> min
            </div>
          )}

          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            New Session
          </Button>
        </div>
      </div>

      {/* Session Expired Alert */}
      {isSessionExpired && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Limit Reached</AlertTitle>
          <AlertDescription>
            You've reached the session limit. Please refresh the page to start a new conversation.
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Session Warning */}
      {showSessionWarning && !isSessionExpired && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Session Limit Approaching</AlertTitle>
          <AlertDescription>
            You have {sessionInfo?.remainingMessages} messages or {sessionInfo?.remainingMinutes} minutes remaining in this session.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && !isSessionExpired && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg border shadow-sm h-[600px]">
        <SimpleChatInterface
          title="CouplesDNA AI"
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          disabled={isSessionExpired}
        />
      </div>

      {/* Info Section */}
      <div className="mt-4 text-sm text-muted-foreground text-center">
        <p>
          💡 Each session allows up to 50 messages or 30 minutes.
          Refresh the page to start a new conversation.
        </p>
      </div>
    </div>
  )
}