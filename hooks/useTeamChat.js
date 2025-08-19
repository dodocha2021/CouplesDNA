import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { generateSessionId, parseDbMessage } from '../lib/utils';
import { defaultMembers, defaultWelcome, createInitialMessages, N8N_WEBHOOK } from '../config/chatDefaults';
import axios from 'axios';

export const useTeamChat = () => {
  // State management
  const [teamMembers] = useState(defaultMembers);
  const [selectedMember, setSelectedMember] = useState(defaultMembers[0]);
  const [messagesByExpert, setMessagesByExpert] = useState(createInitialMessages());
  const [messages, setMessages] = useState(messagesByExpert[defaultMembers[0].id]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('sessionId') || null : null
  );
  const [deleting, setDeleting] = useState(false);

  // Load chat history on page load
  useEffect(() => {
    if (sessionId) {
      (async () => {
        const { data, error } = await supabase
          .from('n8n_chat_histories')
          .select('message')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        
        let history = [];
        if (!error && data) {
          history = data.map(item => parseDbMessage(item.message)).filter(Boolean);
        }
        
        // Check local pendingMessage
        let pending = null;
        if (typeof window !== 'undefined') {
          const pendingStr = localStorage.getItem('pendingMessage');
          if (pendingStr) {
            try {
              const obj = JSON.parse(pendingStr);
              if (obj && obj.text && obj.sessionId === sessionId) {
                pending = obj.text;
              }
            } catch (e) {
              // ignore
            }
          }
        }

        if (pending) {
          setIsLoading(true);
          const pendingMsg = {
            id: Date.now() + Math.random(),
            content: pending,
            sender: {
              name: "You",
              avatar: "",
              isOnline: true,
              isCurrentUser: true,
            },
            timestamp: new Date(),
          };
          setMessages([...history, pendingMsg]);
        } else {
          setMessages(history);
        }
      })();
    }
  }, [sessionId]);

  // Handle submit message
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");

    // Generate sessionId if none exists
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
      setSessionId(currentSessionId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sessionId', currentSessionId);
      }
    }

    // Create user message
    const userMessage = {
      id: Date.now() + Math.random(),
      content: message,
      sender: {
        name: "You",
        avatar: "",
        isOnline: true,
        isCurrentUser: true,
      },
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Store pending message
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingMessage', JSON.stringify({
        text: message,
        sessionId: currentSessionId,
        timestamp: Date.now()
      }));
    }

    try {
      console.log('🚀 Sending message to n8n webhook:', message);
      
      const response = await axios.post(N8N_WEBHOOK, {
        sessionId: currentSessionId,
        message: message,
        timestamp: new Date().toISOString(),
        sender: 'user'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('✅ n8n response:', response.data);

      if (response.data && response.data.output) {
        // Direct response from n8n
        const aiMessage = {
          id: Date.now() + Math.random(),
          content: response.data.output,
          sender: {
            name: selectedMember.name,
            avatar: selectedMember.avatar,
            role: selectedMember.role,
            isOnline: true,
            isCurrentUser: false,
          },
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Wait for database response
        await pollForResponse(currentSessionId, message);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + Math.random(),
        content: 'Sorry, something went wrong. Please try again.',
        sender: {
          name: selectedMember.name,
          avatar: selectedMember.avatar,
          role: selectedMember.role,
          isOnline: true,
          isCurrentUser: false,
        },
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Clear pending message
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pendingMessage');
      }
    }
  };

  // Poll for response from database
  const pollForResponse = async (sessionId, userMessage) => {
    const maxPolls = 60; // 3 minutes max
    let polls = 0;
    
    const poll = async () => {
      polls++;
      console.log(`🔍 Polling for response... (${polls}/${maxPolls})`);
      
      try {
        const { data, error } = await supabase
          .from('n8n_chat_histories')
          .select('message')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!error && data && data.length > 0) {
          // Look for AI response that came after our message
          for (const record of data) {
            const msg = parseDbMessage(record.message);
            if (msg && !msg.sender.isCurrentUser && 
                msg.content !== defaultWelcome.ai.content &&
                msg.content.toLowerCase().includes(userMessage.toLowerCase().split(' ')[0])) {
              
              console.log('✅ Found AI response:', msg);
              
              const aiMessage = {
                ...msg,
                id: Date.now() + Math.random(),
                sender: {
                  name: selectedMember.name,
                  avatar: selectedMember.avatar,
                  role: selectedMember.role,
                  isOnline: true,
                  isCurrentUser: false,
                }
              };
              
              setMessages(prev => [...prev, aiMessage]);
              return true; // Found response
            }
          }
        }
        
        if (polls >= maxPolls) {
          throw new Error('Polling timeout');
        }
        
        // Continue polling
        setTimeout(() => poll(), 3000);
        return false;
        
      } catch (error) {
        console.error('❌ Polling error:', error);
        throw error;
      }
    };
    
    return poll();
  };

  // Handle member select
  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setMessages(messagesByExpert[member.id] || [defaultWelcome[member.id]]);
  };

  // Handle delete chat
  const handleDeleteChat = async () => {
    setDeleting(true);
    try {
      if (sessionId) {
        // Clear from database
        await supabase
          .from('n8n_chat_histories')
          .delete()
          .eq('session_id', sessionId);
      }
      
      // Reset local state
      setMessages([defaultWelcome[selectedMember.id]]);
      setMessagesByExpert(createInitialMessages());
      setSessionId(null);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sessionId');
        localStorage.removeItem('pendingMessage');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setDeleting(false);
    }
  };

  return {
    // State
    teamMembers,
    selectedMember,
    messages,
    input,
    isLoading,
    sessionId,
    deleting,
    
    // Actions
    setInput,
    handleSubmit,
    handleMemberSelect,
    handleDeleteChat,
  };
};