import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Session limits configuration
const MAX_MESSAGES = 50; // Maximum number of messages per session
const MAX_SESSION_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds

export const useLiveChat = (options = {}) => {
  const {
    welcomeMessage = true,
    onMessageSent,
    onMessageReceived,
    onError,
    onSessionLimitReached
  } = options;

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionStartTime] = useState(Date.now());
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Initialize with welcome message
  useEffect(() => {
    if (welcomeMessage) {
      setMessages([{
        id: 'welcome-' + Date.now(),
        content: "Hi, I am CouplesDNA AI, how can I help you with your relationship?",
        sender: {
          name: "CouplesDNA AI",
          isCurrentUser: false,
        },
        timestamp: new Date(),
        isWelcome: true
      }]);
    }
  }, [welcomeMessage]);

  // Check session expiration
  useEffect(() => {
    const checkExpiration = setInterval(() => {
      const elapsed = Date.now() - sessionStartTime;
      if (elapsed >= MAX_SESSION_TIME) {
        setIsSessionExpired(true);
        clearInterval(checkExpiration);
        onSessionLimitReached?.({
          reason: 'time',
          elapsed: Math.floor(elapsed / 1000 / 60) + ' minutes'
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkExpiration);
  }, [sessionStartTime, onSessionLimitReached]);

  // Check if session limit is reached
  const checkSessionLimit = useCallback(() => {
    // Check message count (exclude welcome message)
    const userMessageCount = messages.filter(m => !m.isWelcome).length;
    if (userMessageCount >= MAX_MESSAGES) {
      setIsSessionExpired(true);
      onSessionLimitReached?.({
        reason: 'messages',
        count: userMessageCount
      });
      return true;
    }

    // Check time
    const elapsed = Date.now() - sessionStartTime;
    if (elapsed >= MAX_SESSION_TIME) {
      setIsSessionExpired(true);
      onSessionLimitReached?.({
        reason: 'time',
        elapsed: Math.floor(elapsed / 1000 / 60) + ' minutes'
      });
      return true;
    }

    return false;
  }, [messages, sessionStartTime, onSessionLimitReached]);

  // Send message
  const sendMessage = useCallback(async (content) => {
    if (!content?.trim() || isLoading) return;

    // Check session limits
    if (checkSessionLimit()) {
      setError('Session limit reached. Please refresh the page to start a new conversation.');
      return;
    }

    // Create user message
    const userMessage = {
      id: Date.now() + Math.random(),
      content,
      sender: {
        name: "You",
        isCurrentUser: true,
      },
      timestamp: new Date(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Prepare conversation history (exclude welcome message)
      const history = messages
        .filter(m => !m.isWelcome)
        .map(msg => ({
          content: msg.content,
          isUser: msg.sender?.isCurrentUser || false
        }));

      // Call new live-chat API
      const response = await fetch('/api/live-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: content,
          history: history
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();

      onMessageSent?.(userMessage, data);

      if (data.success && data.response) {
        // Create AI message
        const aiMessage = {
          id: Date.now() + Math.random(),
          content: data.response,
          sender: {
            name: "CouplesDNA AI",
            isCurrentUser: false,
          },
          timestamp: new Date(),
          metadata: data.metadata
        };

        setMessages(prev => [...prev, aiMessage]);
        onMessageReceived?.(aiMessage);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message);

      // Add error message
      const errorMessage = {
        id: Date.now() + Math.random(),
        content: `Sorry, something went wrong: ${error.message}. Please try again.`,
        sender: {
          name: "CouplesDNA AI",
          isCurrentUser: false,
        },
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, checkSessionLimit, onMessageSent, onMessageReceived, onError]);

  // Clear chat and restart session
  const clearChat = useCallback(() => {
    if (welcomeMessage) {
      setMessages([{
        id: 'welcome-' + Date.now(),
        content: "Hi, I am CouplesDNA AI, how can I help you with your relationship?",
        sender: {
          name: "CouplesDNA AI",
          isCurrentUser: false,
        },
        timestamp: new Date(),
        isWelcome: true
      }]);
    } else {
      setMessages([]);
    }
    setError(null);
    setIsSessionExpired(false);
    // Note: sessionStartTime is in useState, so it won't reset
    // User needs to refresh page for full reset
  }, [welcomeMessage]);

  // Get session info
  const getSessionInfo = useCallback(() => {
    const userMessageCount = messages.filter(m => !m.isWelcome).length;
    const elapsed = Date.now() - sessionStartTime;
    const elapsedMinutes = Math.floor(elapsed / 1000 / 60);
    const remainingMessages = Math.max(0, MAX_MESSAGES - userMessageCount);
    const remainingMinutes = Math.max(0, Math.floor((MAX_SESSION_TIME - elapsed) / 1000 / 60));

    return {
      messageCount: userMessageCount,
      maxMessages: MAX_MESSAGES,
      remainingMessages,
      elapsedMinutes,
      remainingMinutes,
      isExpired: isSessionExpired
    };
  }, [messages, sessionStartTime, isSessionExpired]);

  return {
    messages,
    isLoading,
    error,
    isSessionExpired,
    sendMessage,
    clearChat,
    getSessionInfo
  };
};
