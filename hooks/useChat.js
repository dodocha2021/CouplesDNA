import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../lib/chatService';

export const useChat = (options = {}) => {
  const { 
    autoLoad = true,
    welcomeMessage = true,
    onMessageSent,
    onMessageReceived,
    onError 
  } = options;

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionIdState] = useState(null);
  const [error, setError] = useState(null);

  // Initialize session
  useEffect(() => {
    const existingSessionId = chatService.getSessionId();
    if (existingSessionId) {
      setSessionIdState(existingSessionId);
    }
  }, []);

  // Load chat history - now supports both old and new formats
  const loadHistory = useCallback(async (sid) => {
    if (!sid) return;

    try {
      // Try loading from new chat_messages table first
      let history = await chatService.loadChatMessages(sid);
      
      // If no messages in new table, try old table (backward compatibility)
      if (history.length === 0) {
        history = await chatService.loadChatHistory(sid);
      }
      
      const welcomeMsg = welcomeMessage ? chatService.getWelcomeMessage() : null;
      
      // Check for pending message
      const pending = chatService.getPendingMessage();
      
      let msgs = welcomeMsg ? [welcomeMsg, ...history] : history;
      
      if (pending && pending.sessionId === sid) {
        msgs = [...msgs, {
          id: Date.now(),
          content: pending.text,
          sender: {
            name: "You",
            isCurrentUser: true,
          },
          timestamp: new Date()
        }];
        setMessages(msgs);
        setIsLoading(true);
        
        // Auto cleanup after timeout
        setTimeout(() => {
          if (chatService.getPendingMessage()) {
            setIsLoading(false);
            chatService.clearPendingMessage();
            setMessages(prev => [
              ...prev,
              {
                id: Date.now() + 1,
                content: 'Request failed, please try again later.',
                sender: {
                  name: "CouplesDNA AI",
                  isCurrentUser: false,
                },
                timestamp: new Date()
              }
            ]);
          }
        }, 60000);
      } else {
        setMessages(msgs);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setError(error.message);
      onError?.(error);
    }
  }, [welcomeMessage, onError]);

  // Auto-load history when session ID is available
  useEffect(() => {
    if (autoLoad && sessionId) {
      loadHistory(sessionId);
    }
  }, [sessionId, autoLoad, loadHistory]);

  // Send message
  const sendMessage = useCallback(async (content) => {
    if (!content?.trim() || isLoading) return;

    let sid = sessionId;
    if (!sid) {
      sid = chatService.generateSessionId();
      setSessionIdState(sid);
      chatService.setSessionId(sid);
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
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Store pending message
    chatService.setPendingMessage(content, sid);

    // Save user message to new chat table
    await chatService.saveChatMessage(sid, content, 'user');

    try {
      // Send to API
      const result = await chatService.sendMessage(sid, content);
      
      onMessageSent?.(userMessage, result);

      if (result.success && result.data.aiResponse) {
        // Direct response received
        let aiText = result.data.aiResponse;
        
        // Parse response
        if (typeof aiText === 'object') {
          aiText = aiText.output || aiText.text || aiText.message || aiText.content || JSON.stringify(aiText);
        }
        
        if (typeof aiText === 'string') {
          try {
            const parsed = JSON.parse(aiText);
            aiText = parsed.output || parsed.text || parsed.message || parsed.content || aiText;
          } catch (e) {
            // Use as-is
          }
        }
        
        const aiMessage = {
          id: Date.now() + Math.random(),
          content: aiText,
          sender: {
            name: "CouplesDNA AI",
            isCurrentUser: false,
          },
          timestamp: new Date(),
        };
        
        // Save AI message to new chat table
        await chatService.saveChatMessage(sid, aiText, 'ai');
        
        setMessages(prev => [...prev, aiMessage]);
        onMessageReceived?.(aiMessage);
      } else {
        // Start polling for response
        try {
          const response = await chatService.pollForResponse(sid, content, {
            maxPolls: 180,
            pollInterval: 1000,
          });

          if (response.success) {
            const aiMessage = {
              id: Date.now() + Math.random(),
              content: response.content,
              sender: {
                name: "CouplesDNA AI",
                isCurrentUser: false,
              },
              timestamp: new Date(),
            };
            
            // Save AI message to new chat table
            await chatService.saveChatMessage(sid, response.content, 'ai');
            
            setMessages(prev => [...prev, aiMessage]);
            onMessageReceived?.(aiMessage);
          }
        } catch (pollError) {
          throw new Error('AI response timeout');
        }
      }

      // Update message status
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, status: 'delivered' } : msg
        ));
      }, 1000);

      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, status: 'read' } : msg
        ));
      }, 2000);

      // Clear pending message
      chatService.clearPendingMessage();

    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + Math.random(),
        content: 'Sorry, something went wrong. Please try again.',
        sender: {
          name: "CouplesDNA AI",
          isCurrentUser: false,
        },
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      chatService.clearPendingMessage();
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, onMessageSent, onMessageReceived, onError]);

  // Clear chat
  const clearChat = useCallback(async () => {
    try {
      await chatService.clearChatHistory(sessionId);
      setMessages(welcomeMessage ? [chatService.getWelcomeMessage()] : []);
      setSessionIdState(null);
      setError(null);
    } catch (error) {
      console.error('Error clearing chat:', error);
      setError(error.message);
      onError?.(error);
    }
  }, [sessionId, welcomeMessage, onError]);

  // Generate report
  const generateReport = useCallback(async () => {
    if (!sessionId) return { success: false, error: 'No session ID' };

    try {
      const result = await chatService.generateReport(sessionId);
      return result;
    } catch (error) {
      console.error('Error generating report:', error);
      setError(error.message);
      onError?.(error);
      return { success: false, error: error.message };
    }
  }, [sessionId, onError]);

  // Add message manually
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, { ...message, id: message.id || Date.now() + Math.random() }]);
  }, []);

  // Update message
  const updateMessage = useCallback((messageId, updates) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  // Switch to a different session
  const switchSession = useCallback(async (newSessionId) => {
    setSessionIdState(newSessionId);
    chatService.setSessionId(newSessionId);
    await loadHistory(newSessionId);
  }, [loadHistory]);

  // Start a new chat (save current and create new session)
  const startNewChat = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await chatService.startNewChat();
      
      if (result.success) {
        setSessionIdState(result.data.id);
        setMessages(welcomeMessage ? [chatService.getWelcomeMessage()] : []);
        return { success: true, sessionId: result.data.id };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [welcomeMessage]);

  return {
    messages,
    isLoading,
    sessionId,
    error,
    sendMessage,
    clearChat,
    generateReport,
    addMessage,
    updateMessage,
    loadHistory,
    setMessages,
    switchSession,
    startNewChat
  };
};