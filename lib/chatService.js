import axios from 'axios';
import { supabase } from './supabase';

// Chat service utility functions
export class ChatService {
  constructor(config = {}) {
    this.webhookUrl = config.webhookUrl || 'https://couplesdna.app.n8n.cloud/webhook/a46db80c-5a86-4d9a-b6ba-547fa403a9f7';
    this.timeout = config.timeout || 300000; // 5 minutes
  }

  // Generate unique session ID
  generateSessionId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // Parse database message format
  parseDbMessage(dbMessage) {
    const getContentString = (content) => {
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          return parsed.output || parsed.text || parsed.message || parsed.content || content;
        } catch (e) {
          return content;
        }
      }
      if (typeof content === 'object') {
        return content.output || content.text || content.message || content.content || JSON.stringify(content);
      }
      return String(content || '');
    };

    const aiConfig = {
      name: "CouplesDNA AI",
      avatar: "/couplesdna-ai.png",
      role: "Relationship Assistant"
    };

    if (dbMessage.type === 'human') {
      return { 
        id: Date.now() + Math.random(),
        content: getContentString(dbMessage.content),
        sender: {
          name: "You",
          isCurrentUser: true,
        },
        timestamp: new Date()
      };
    }
    if (dbMessage.type === 'ai') {
      return { 
        id: Date.now() + Math.random(),
        content: getContentString(dbMessage.content),
        sender: {
          name: aiConfig.name,
          isCurrentUser: false,
        },
        timestamp: new Date()
      };
    }
    return null;
  }

  // Load chat history from database
  async loadChatHistory(sessionId) {
    if (!sessionId) return [];

    try {
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('message')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      return data
        .map(item => this.parseDbMessage(item.message))
        .filter(Boolean);
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  // Send message to AI
  async sendMessage(sessionId, message) {
    try {
      const response = await axios.post('/api/team-chat', {
        sessionId,
        message
      }, { 
        headers: { 'Content-Type': 'application/json' },
        timeout: this.timeout
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Clear chat history
  async clearChatHistory(sessionId) {
    if (!sessionId) return { success: true };

    try {
      await supabase
        .from('n8n_chat_histories')
        .delete()
        .eq('session_id', sessionId);

      // Clear from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sessionId');
        localStorage.removeItem('pendingMessage');
      }

      return { success: true };
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Generate report
  async generateReport(sessionId) {
    try {
      const response = await axios.post('/api/generate-report', {
        sessionId
      }, { 
        headers: { 'Content-Type': 'application/json' } 
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error generating report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Poll for AI response in database
  async pollForResponse(sessionId, userMessage, options = {}) {
    const { maxPolls = 180, pollInterval = 1000, onProgress } = options;
    
    return new Promise((resolve, reject) => {
      let pollCount = 0;
      
      const poll = setInterval(async () => {
        pollCount++;
        onProgress?.(`Waiting for AI response... (${pollCount}/${maxPolls})`);
        
        try {
          const { data, error } = await supabase
            .from('n8n_chat_histories')
            .select('message')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && data && data.length > 0) {
            const latestMessage = data[0].message;
            
            if (latestMessage.type === 'ai' && 
                latestMessage.content && 
                latestMessage.content !== userMessage) {
              
              clearInterval(poll);
              
              let aiText = typeof latestMessage.content === 'string' 
                ? latestMessage.content 
                : JSON.stringify(latestMessage.content);
              
              // Remove "DIRECT: " prefix if present
              if (aiText.startsWith('DIRECT: ')) {
                aiText = aiText.substring(8);
              }
              
              // Try to parse JSON response
              try {
                const parsed = JSON.parse(aiText);
                aiText = parsed.output || parsed.text || parsed.message || parsed.content || aiText;
              } catch (e) {
                // Use as-is if not JSON
              }
              
              resolve({
                success: true,
                content: aiText,
                message: latestMessage
              });
              return;
            }
          }
          
          if (pollCount >= maxPolls) {
            clearInterval(poll);
            reject(new Error('Polling timeout'));
          }
          
        } catch (pollError) {
          console.error('Polling error:', pollError);
          if (pollCount >= maxPolls) {
            clearInterval(poll);
            reject(pollError);
          }
        }
      }, pollInterval);
    });
  }

  // Get default welcome message
  getWelcomeMessage() {
    return {
      id: 'welcome-' + Date.now(),
      content: "Hi, I am CouplesDNA AI, how can I help you with your relationship?",
      sender: {
        name: "CouplesDNA AI",
        isCurrentUser: false,
      },
      timestamp: new Date(),
    };
  }

  // Session management
  getSessionId() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sessionId');
  }

  setSessionId(sessionId) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sessionId', sessionId);
    }
  }

  // New chat sessions management
  async createChatSession(title = 'New Chat') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // During logout, gracefully fail instead of throwing error
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([
          {
            user_id: user.id,
            title: title,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating chat session:', error);
      return { success: false, error: error.message };
    }
  }

  async getChatSessions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // During logout, gracefully return empty array instead of throwing error
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  async deleteChatSession(sessionId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // During logout, gracefully fail instead of throwing error
        return { success: false, error: 'User not authenticated' };
      }

      // First verify the session belongs to the current user
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      if (session.user_id !== user.id) {
        throw new Error('Unauthorized: Cannot delete another user\'s session');
      }

      // Delete messages first (cascade should handle this, but being explicit)
      await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      // Delete session
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id); // Double security check

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting chat session:', error);
      return { success: false, error: error.message };
    }
  }

  async saveChatMessage(sessionId, content, senderType) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            session_id: sessionId,
            content: content,
            sender_type: senderType,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update session's updated_at timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      return { success: true, data };
    } catch (error) {
      console.error('Error saving chat message:', error);
      return { success: false, error: error.message };
    }
  }

  async loadChatMessages(sessionId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // During logout, gracefully return empty array instead of throwing error
        return [];
      }

      // First verify the session belongs to the current user
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.warn('Session not found:', sessionId);
        return [];
      }

      if (session.user_id !== user.id) {
        console.warn('Unauthorized access attempt to session:', sessionId);
        return [];
      }

      // Now load messages for the verified session
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Convert to chat format
      return data.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: {
          name: msg.sender_type === 'user' ? 'You' : 'CouplesDNA AI',
          isCurrentUser: msg.sender_type === 'user'
        },
        timestamp: new Date(msg.created_at)
      }));

    } catch (error) {
      console.error('Error loading chat messages:', error);
      return [];
    }
  }

  // Delete all chat sessions for current user
  async clearAllChatHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // During logout, gracefully fail instead of throwing error
        return { success: false, error: 'User not authenticated' };
      }

      // First delete all messages for user's sessions
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        
        // Delete all messages for these sessions
        await supabase
          .from('chat_messages')
          .delete()
          .in('session_id', sessionIds);

        // Delete all sessions
        await supabase
          .from('chat_sessions')
          .delete()
          .eq('user_id', user.id);
      }

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sessionId');
        localStorage.removeItem('pendingMessage');
      }

      return { success: true };
    } catch (error) {
      console.error('Error clearing all chat history:', error);
      return { success: false, error: error.message };
    }
  }

  // Start a new chat session (save current and create new)
  async startNewChat() {
    try {
      // Create a new session
      const result = await this.createChatSession();
      
      if (result.success) {
        // Update localStorage with new session
        this.setSessionId(result.data.id);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Failed to create new chat');
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
      return { success: false, error: error.message };
    }
  }

  // Pending message management
  setPendingMessage(message, sessionId) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingMessage', JSON.stringify({ 
        text: message, 
        sessionId 
      }));
    }
  }

  getPendingMessage() {
    if (typeof window === 'undefined') return null;
    
    const pendingStr = localStorage.getItem('pendingMessage');
    if (!pendingStr) return null;
    
    try {
      return JSON.parse(pendingStr);
    } catch {
      return null;
    }
  }

  clearPendingMessage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pendingMessage');
    }
  }
}

// Create default instance
export const chatService = new ChatService();