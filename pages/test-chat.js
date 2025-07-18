import React, { useRef, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { Dialog, DialogContent, DialogTrigger } from '../components/ui/dialog';
import { HeroGeometric } from '../components/ui/shape-landing-hero';
import { StarBorder } from '../components/ui/star-border';

// Utility function
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Message Loading Component
function MessageLoading() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-600"
    >
      <circle cx="4" cy="12" r="2" fill="currentColor">
        <animate
          id="spinner_qFRN"
          begin="0;spinner_OcgL.end+0.25s"
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
      <circle cx="12" cy="12" r="2" fill="currentColor">
        <animate
          begin="spinner_qFRN.begin+0.1s"
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
      <circle cx="20" cy="12" r="2" fill="currentColor">
        <animate
          id="spinner_OcgL"
          begin="spinner_qFRN.begin+0.2s"
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
    </svg>
  );
}

// Auto-scroll hook
function useAutoScroll(options = {}) {
  const { offset = 20, smooth = false, content } = options;
  const scrollRef = useRef(null);
  const lastContentHeight = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const checkIsAtBottom = useCallback(
    (element) => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceToBottom = Math.abs(scrollHeight - scrollTop - clientHeight);
      return distanceToBottom <= offset;
    },
    [offset]
  );

  const scrollToBottom = useCallback(
    (instant) => {
      if (!scrollRef.current) return;

      const targetScrollTop = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;

      if (instant) {
        scrollRef.current.scrollTop = targetScrollTop;
      } else {
        scrollRef.current.scrollTo({
          top: targetScrollTop,
          behavior: smooth ? "smooth" : "auto",
        });
      }

      setIsAtBottom(true);
      setAutoScrollEnabled(true);
    },
    [smooth]
  );

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const atBottom = checkIsAtBottom(scrollRef.current);
    setIsAtBottom(atBottom);
    if (atBottom) setAutoScrollEnabled(true);
  }, [checkIsAtBottom]);

  const disableAutoScroll = useCallback(() => {
    const atBottom = scrollRef.current ? checkIsAtBottom(scrollRef.current) : false;
    if (!atBottom) {
      setAutoScrollEnabled(false);
    }
  }, [checkIsAtBottom]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const currentHeight = scrollElement.scrollHeight;
    const hasNewContent = currentHeight !== lastContentHeight.current;

    if (hasNewContent && autoScrollEnabled) {
      requestAnimationFrame(() => {
        scrollToBottom(lastContentHeight.current === 0);
      });
      lastContentHeight.current = currentHeight;
    }
  }, [content, autoScrollEnabled, scrollToBottom]);

  return {
    scrollRef,
    isAtBottom,
    autoScrollEnabled,
    scrollToBottom: () => scrollToBottom(false),
    disableAutoScroll,
  };
}

// Button Component
const Button = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "default", 
  children,
  ...props 
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-gray-300 bg-white hover:bg-gray-50",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    ghost: "hover:bg-gray-100",
    link: "text-blue-600 underline-offset-4 hover:underline",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";

// Avatar Component
const Avatar = ({ className, src, fallback, ...props }) => (
  <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props}>
    {src ? (
      <img src={src} alt="" className="aspect-square h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-transparent">
        <span className="text-sm font-medium text-gray-700">{fallback}</span>
      </div>
    )}
  </div>
);

// Input Component
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

// Chat Bubble Components
const ChatBubble = ({ 
  className, 
  variant = "received", 
  children, 
  ...props 
}) => {
  return (
    <div
      className={cn(
        "flex items-start gap-3 max-w-[80%] mb-4",
        variant === "sent" ? "ml-auto flex-row-reverse" : "mr-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const ChatBubbleAvatar = ({ className, ...props }) => (
  <Avatar className={cn("h-8 w-8", className)} {...props} />
);

const ChatBubbleMessage = ({
  className,
  variant = "received",
  isLoading = false,
  children,
  ...props
}) => {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center space-x-1 px-4 py-3 rounded-2xl bg-gray-100",
          className
        )}
        {...props}
      >
        <MessageLoading />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-2xl text-sm",
        variant === "sent"
          ? "bg-blue-600 text-white ml-auto"
          : "bg-gray-100 text-gray-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Chat Message List Component
const ChatMessageList = React.forwardRef(({ 
  className, 
  children, 
  smooth = false, 
  ...props 
}, _ref) => {
  const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
    smooth,
    content: children,
  });

  return (
    <div className="relative w-full h-full">
      <div
        className={cn("flex flex-col w-full h-full p-4 overflow-y-auto", className)}
        ref={scrollRef}
        onWheel={disableAutoScroll}
        onTouchMove={disableAutoScroll}
        {...props}
      >
        <div className="flex flex-col gap-6">{children}</div>
      </div>

      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          variant="outline"
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 inline-flex rounded-full shadow-md"
          aria-label="Scroll to bottom"
        >
          ↓
        </Button>
      )}
    </div>
  );
});
ChatMessageList.displayName = "ChatMessageList";

// API Configuration
const N8N_WEBHOOK = 'https://couplesdna.app.n8n.cloud/webhook/f196bb14-f364-4a66-afea-079c2dd1cf1c';

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseDbMessage(dbMessage) {
  if (dbMessage.type === 'human') {
    return { 
      id: Date.now(),
      content: dbMessage.content,
      sender: 'user',
      timestamp: new Date()
    };
  }
  if (dbMessage.type === 'ai') {
    return { 
      id: Date.now() + 1,
      content: dbMessage.content,
      sender: 'ai',
      timestamp: new Date()
    };
  }
  return null;
}

// Team Chat Interface Component
export default function TestChat() {
  // Team members based on uploaded images
  const teamMembers = [
    {
      id: "1",
      name: "Matthew Hussey",
      avatar: "/Matthew Hussey.png",
      isOnline: true,
      role: "Relationship Coach",
      lastMessage: "Welcome to CouplesDNA Team Chat! 👋"
    },
    {
      id: "2", 
      name: "Jordan Peterson",
      avatar: "/Jordan Peterson.png",
      isOnline: true,
      role: "Clinical Psychologist",
      lastMessage: "Ready to help with relationship insights"
    },
    {
      id: "3",
      name: "John Gottman", 
      avatar: "/John Gottman.png",
      isOnline: true,
      role: "Relationship Research Expert",
      lastMessage: "Let's analyze your relationship patterns"
    }
  ];

  const [messages, setMessages] = useState([
    {
      id: 1,
      content: "Welcome to CouplesDNA Team Chat! 👋 We're here to help you understand your relationship dynamics.",
      sender: {
        name: "Matthew Hussey",
        avatar: "/Matthew Hussey.png",
        isOnline: true,
        isCurrentUser: false,
      },
      timestamp: new Date(),
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('sessionId') || null : null
  );
  const [selectedMember, setSelectedMember] = useState(teamMembers[0]);
  const fileInputRef = useRef(null);

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
            } catch {}
          }
        }
        
        let msgs = [
          {
            id: 1,
            content: "Welcome to CouplesDNA Team Chat! 👋 We're here to help you understand your relationship dynamics.",
            sender: {
              name: "Matthew Hussey",
              avatar: "/Matthew Hussey.png",
              isOnline: true,
              isCurrentUser: false,
            },
            timestamp: new Date(),
          },
          ...history
        ];
        
        if (pending) {
          msgs = [...msgs, { 
            id: Date.now(),
            content: pending,
            sender: {
              name: "You",
              avatar: "",
              isOnline: true,
              isCurrentUser: true,
            },
            timestamp: new Date()
          }];
          setMessages(msgs);
          setIsLoading(true);
          
          // Maximum wait time, auto cleanup on timeout
          setTimeout(() => {
            if (typeof window !== 'undefined' && localStorage.getItem('pendingMessage')) {
              setIsLoading(false);
              localStorage.removeItem('pendingMessage');
              setMessages((msgs) => [
                ...msgs,
                { 
                  id: Date.now() + 1,
                  content: 'Request failed, please try again later.',
                  sender: {
                    name: selectedMember.name,
                    avatar: selectedMember.avatar,
                    isOnline: true,
                    isCurrentUser: false,
                  },
                  timestamp: new Date()
                }
              ]);
            }
          }, 60000); // 60 seconds
        } else {
          setMessages(msgs);
        }
      })();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let sid = sessionId;
    if (!sid) {
      sid = generateSessionId();
      setSessionId(sid);
      localStorage.setItem('sessionId', sid);
    }

    const userMessage = {
      id: Date.now(),
      content: input,
      sender: {
        name: "You",
        avatar: "",
        isOnline: true,
        isCurrentUser: true,
      },
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Store pendingMessage
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingMessage', JSON.stringify({ text: input, sessionId: sid }));
    }

    try {
      const res = await axios.post(
        N8N_WEBHOOK,
        [
          {
            sessionId: sid,
            action: 'sendMessage',
            chatInput: input
          }
        ],
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      const aiText = res.data.reply || res.data.message || res.data.output || res.data.content || JSON.stringify(res.data);
      
      const aiMessage = {
        id: Date.now() + 1,
        content: aiText,
        sender: {
          name: selectedMember.name,
          avatar: selectedMember.avatar,
          isOnline: true,
          isCurrentUser: false,
        },
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Clear pendingMessage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pendingMessage');
      }
    } catch (e) {
      console.log('catch error', e);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1,
        content: 'Request failed, please try again later.',
        sender: {
          name: selectedMember.name,
          avatar: selectedMember.avatar,
          isOnline: true,
          isCurrentUser: false,
        },
        timestamp: new Date()
      }]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pendingMessage');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // File upload handling
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('File selected:', file.name, file.type, file.size);
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log('Uploading file to /api/upload...');
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      
      console.log('Upload response:', res.data);
      
      // Add file upload success message
      const fileMessage = {
        id: Date.now(),
        content: `${res.data.fileName}: ${res.data.message}`,
        sender: {
          name: "You",
          avatar: "",
          isOnline: true,
          isCurrentUser: true,
        },
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fileMessage]);
      
    } catch (err) {
      console.error('File upload error:', err);
      
      let errorMessage = 'Upload failed';
      if (err.response?.status === 500) {
        errorMessage = 'Server error, possible Google Drive configuration issue';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout, please try again';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      const fileMessage = {
        id: Date.now(),
        content: `${file.name}: ${errorMessage}`,
        sender: {
          name: "You",
          avatar: "",
          isOnline: true,
          isCurrentUser: true,
        },
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fileMessage]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAttachFile = () => {
    console.log('Attach file clicked');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 1,
        content: "Welcome to CouplesDNA Team Chat! 👋 We're here to help you understand your relationship dynamics.",
        sender: {
          name: "Matthew Hussey",
          avatar: "/Matthew Hussey.png",
          isOnline: true,
          isCurrentUser: false,
        },
        timestamp: new Date(),
      }
    ]);
    setSessionId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sessionId');
    }
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    // Clear messages when switching members
    setMessages([
      {
        id: 1,
        content: `Hello! I'm ${member.name}, ${member.role}. How can I help you with your relationship today?`,
        sender: {
          name: member.name,
          avatar: member.avatar,
          isOnline: true,
          isCurrentUser: false,
        },
        timestamp: new Date(),
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">CouplesDNA</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Trusted by 10,000+ couples worldwide</span>
            </div>
          </div>
        </div>
      </header>

      {/* Global hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ 
          display: 'none',
          position: 'absolute',
          left: '-9999px'
        }}
        onChange={handleFileChange}
        disabled={uploading || isLoading}
        accept="*/*"
      />

      {/* Hero Section with Geometric Animation */}
      <HeroGeometric 
        badge="CouplesDNA"
        title1="Decode Your"
        title2="Relationship Patterns"
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Dialog>
            <DialogTrigger asChild>
              <StarBorder 
                color="white" 
                speed="4s"
                className="text-white"
              >
                Start Team Chat
              </StarBorder>
            </DialogTrigger>
            <DialogContent className="p-0 h-[700px] flex flex-col bg-white max-w-6xl">
              {/* Team Chat Interface with Sidebar */}
              <div className="flex h-full">
                {/* Contacts Sidebar */}
                <div className="w-80 border-r border-gray-200 bg-gray-50">
                  {/* Sidebar Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-lg">💬</span>
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">Expert Team</h2>
                        <p className="text-sm text-gray-600">{teamMembers.length} experts online</p>
                      </div>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="p-4">
                    <Input placeholder="Search experts..." className="w-full" />
                  </div>

                  {/* Team Members List */}
                  <div className="overflow-y-auto">
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleMemberSelect(member)}
                        className={cn(
                          "w-full p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left",
                          selectedMember.id === member.id && "bg-blue-50 border-r-2 border-blue-600"
                        )}
                      >
                        <div className="relative">
                          <Avatar src={member.avatar} fallback={member.name[0]} className="h-12 w-12" />
                          <div
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white",
                              member.isOnline ? "bg-green-500" : "bg-gray-400"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{member.name}</p>
                          <p className="text-sm text-gray-600 truncate">{member.role}</p>
                          <p className="text-xs text-gray-500 truncate">{member.lastMessage}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          src={selectedMember.avatar} 
                          fallback={selectedMember.name[0]} 
                          className="h-10 w-10" 
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {selectedMember.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {selectedMember.role} • Online
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={handleClearChat}
                          title="Clear Chat"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-hidden min-h-0">
                    <ChatMessageList>
                      {messages.map((message) => (
                        <ChatBubble
                          key={message.id}
                          variant={message.sender.isCurrentUser ? "sent" : "received"}
                        >
                          {!message.sender.isCurrentUser && (
                            <ChatBubbleAvatar
                              src={message.sender.avatar}
                              fallback={message.sender.name[0]}
                            />
                          )}
                          <div className="flex flex-col gap-1">
                            {!message.sender.isCurrentUser && (
                              <span className="text-xs font-medium text-gray-600 px-1">
                                {message.sender.name}
                              </span>
                            )}
                            <ChatBubbleMessage
                              variant={message.sender.isCurrentUser ? "sent" : "received"}
                            >
                              {message.content}
                            </ChatBubbleMessage>
                            <span className={cn(
                              "text-xs text-gray-500 px-1",
                              message.sender.isCurrentUser ? "text-right" : "text-left"
                            )}>
                              {message.timestamp?.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          {message.sender.isCurrentUser && (
                            <ChatBubbleAvatar
                              src={message.sender.avatar}
                              fallback={message.sender.name[0]}
                              className="bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                            />
                          )}
                        </ChatBubble>
                      ))}

                      {isLoading && (
                        <ChatBubble variant="received">
                          <ChatBubbleAvatar
                            src={selectedMember.avatar}
                            fallback={selectedMember.name[0]}
                          />
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-gray-600 px-1">
                              {selectedMember.name}
                            </span>
                            <ChatBubbleMessage isLoading />
                          </div>
                        </ChatBubble>
                      )}
                    </ChatMessageList>
                  </div>

                  {/* Hidden file input for chat */}
                  <input
                    type="file"
                    style={{ 
                      display: 'none',
                      position: 'absolute',
                      left: '-9999px'
                    }}
                    onChange={handleFileChange}
                    disabled={uploading || isLoading}
                    accept="*/*"
                  />

                  {/* Input */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <form
                      onSubmit={handleSubmit}
                      className="relative rounded-lg border border-gray-300 bg-white focus-within:ring-1 focus-within:ring-blue-500 p-1 w-full"
                    >
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="min-h-12 resize-none rounded-lg bg-white border-0 p-3 shadow-none focus-visible:ring-0"
                        disabled={isLoading}
                      />
                      <div className="flex items-center p-3 pt-0 justify-between w-full">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={handleAttachFile}
                            disabled={isLoading || uploading}
                            title="Upload File"
                          >
                            📎
                          </Button>
                        </div>
                        <Button 
                          type="submit" 
                          size="sm" 
                          className="ml-auto gap-1.5"
                          disabled={!input.trim() || isLoading}
                        >
                          Send Message
                          ➤
                        </Button>
                      </div>
                    </form>

                    {/* File Upload Status */}
                    {uploading && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-600">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-medium">Uploading file...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </HeroGeometric>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What You Miss</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Most couples never see these deeper currents that flow through their daily interactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💕</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Subtle ways love is expressed and received</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recurring patterns that create distance</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💪</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Hidden strengths in your communication</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Emotional triggers and repair opportunities</h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Decode Your Relationship?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of couples who've discovered deeper connection, better communication, and lasting love through CouplesDNA.
          </p>
          <button 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-blue-600 hover:bg-gray-100 h-12 px-8"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Your Conversation'}
          </button>
          <div className="flex justify-center items-center gap-6 mt-6 text-blue-100">
            <span>✓ Secure upload</span>
            <span>✓ Privacy guaranteed</span>
            <span>✓ Results in 24 hours</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">CouplesDNA</h3>
            <p className="text-gray-400 mb-6">
              Helping couples build stronger, more connected relationships through the power of conversation analysis.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 