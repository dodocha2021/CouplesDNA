import React, { useState, useRef, useEffect } from 'react';

// 简化的工具函数
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// 简化的头像组件
const Avatar = ({ fallback, isOnline = false, isUser = false }) => (
  <div className="relative">
    <div className={cn(
      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden",
      "ring-2 ring-offset-2 ring-offset-white",
      isUser 
        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white" 
        : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
    )}>
      <span className="text-white font-semibold">{fallback}</span>
    </div>
    {isOnline && (
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
    )}
  </div>
);

// 简化的消息气泡组件
const MessageBubble = ({ message, isUser }) => (
  <div className={cn(
    "flex gap-3 max-w-[85%] transition-all duration-300",
    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
  )}>
    <Avatar 
      fallback={isUser ? "U" : "AI"} 
      isOnline={!isUser}
      isUser={isUser}
    />
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      <div className={cn(
        "px-4 py-3 rounded-2xl max-w-sm break-words relative",
        "shadow-lg border backdrop-blur-sm",
        "transition-all duration-200 hover:shadow-xl",
        isUser
          ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-md"
          : "bg-white text-gray-800 rounded-bl-md border-gray-200"
      )}>
        <p className="text-sm leading-relaxed font-medium">{message.content}</p>
        {isUser && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white rounded-full opacity-80" />
        )}
      </div>
      <div className="flex items-center gap-2 px-2">
        <span className="text-xs text-gray-500 font-medium">{message.timestamp}</span>
        {isUser && message.status && (
          <div className="flex items-center">
            {message.status === 'read' && <span className="text-blue-500">✓✓</span>}
            {message.status === 'delivered' && <span className="text-gray-400">✓✓</span>}
            {message.status === 'sent' && <span className="text-gray-400">✓</span>}
          </div>
        )}
      </div>
    </div>
  </div>
);

// 简化的打字指示器
const TypingIndicator = () => (
  <div className="flex gap-3 max-w-[85%] mr-auto">
    <Avatar fallback="AI" isOnline />
    <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200 shadow-lg">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1.2s'
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

// 简化的文件上传按钮
const FileUploadButton = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
  >
    <span className="text-lg">{icon}</span>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default function ModernChat() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      content: "Hello! 👋 How can I help you today?",
      sender: "bot",
      timestamp: "10:30 AM"
    },
    {
      id: "2", 
      content: "I need help with creating a modern chat interface",
      sender: "user",
      timestamp: "10:31 AM",
      status: "read"
    },
    {
      id: "3",
      content: "I'd be happy to help you with that! A modern chat interface should have clean message bubbles, smooth animations, and excellent user experience. What specific features are you looking for?",
      sender: "bot", 
      timestamp: "10:31 AM"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showFileOptions, setShowFileOptions] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue("");

    // 模拟AI响应
    setIsTyping(true);
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        content: "Thank you for your message! I'm here to help you with any questions you might have. How can I assist you today?",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);

    // 更新消息状态
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'read' } : msg
      ));
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (type) => {
    console.log(`Uploading ${type}`);
    setShowFileOptions(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className={cn(
        "flex flex-col h-[700px] w-full max-w-lg mx-auto",
        "bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-3xl overflow-hidden",
        "shadow-2xl backdrop-blur-sm"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🤖</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">CouplesDNA Assistant</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-sm text-gray-600 font-medium">Online • Responds instantly</p>
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <span className="text-gray-600">⋯</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
                <span className="text-white text-3xl">✨</span>
              </div>
              <h3 className="font-bold text-gray-900 text-xl mb-3">Start a conversation</h3>
              <p className="text-gray-600 max-w-xs leading-relaxed">
                Send a message to begin chatting with your AI assistant. I'm here to help!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isUser={message.sender === 'user'}
              />
            ))
          )}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* File Upload Options */}
        {showFileOptions && (
          <div className="px-6 py-3 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <FileUploadButton icon="📷" label="Photo" onClick={() => handleFileUpload('image')} />
              <FileUploadButton icon="📄" label="Document" onClick={() => handleFileUpload('document')} />
              <FileUploadButton icon="🎤" label="Voice" onClick={() => handleFileUpload('voice')} />
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-end gap-3">
            <button
              onClick={() => setShowFileOptions(!showFileOptions)}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-200"
            >
              📎
            </button>
            <button className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-200">
              😊
            </button>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                rows={1}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium shadow-sm"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className={cn(
                "p-3 rounded-2xl transition-all duration-200 shadow-sm",
                inputValue.trim()
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:from-blue-600 hover:to-purple-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 