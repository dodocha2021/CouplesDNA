import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import { MarkdownMessage } from '../ui/MarkdownMessage';

// Simple Message Bubble - minimal black/white design
const MessageBubble = ({ message, isUser }) => (
  <div className={cn(
    "mb-6 max-w-4xl",
    isUser ? "ml-auto" : "mr-auto"
  )}>
    {/* Sender name */}
    <div className={cn(
      "text-sm font-medium mb-2",
      isUser ? "text-right" : "text-left"
    )}>
      {message.sender?.name || (isUser ? "You" : "AI")}
    </div>
    
    {/* Message content */}
    <div className={cn(
      "p-4 border border-black bg-white",
      isUser ? "text-right" : "text-left"
    )}>
      {isUser ? (
        <p className="text-black">{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</p>
      ) : (
        <div className="text-black">
          <MarkdownMessage content={typeof message.content === 'string' ? message.content : JSON.stringify(message.content)} />
        </div>
      )}
      <div className="text-xs text-gray-500 mt-2">
        {message.timestamp?.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
    </div>
  </div>
);

// Simple Typing Indicator
const TypingIndicator = () => (
  <div className="mb-6 max-w-4xl mr-auto">
    <div className="text-sm font-medium mb-2">AI</div>
    <div className="p-4 border border-black bg-white">
      <div className="flex items-center space-x-1">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-black rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-black rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <span className="text-black text-sm ml-2">Typing...</span>
      </div>
    </div>
  </div>
);

// Simple Messages Container
const MessagesContainer = ({ messages, isLoading, className }) => {
  const { scrollRef } = useAutoScroll({
    content: messages,
    smooth: false
  });

  return (
    <div 
      ref={scrollRef}
      className={cn("flex-1 overflow-y-auto p-6 bg-white", className)}
    >
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-white border border-black p-8 max-w-md mx-auto">
            <h3 className="text-xl font-medium text-black mb-2">Start a Conversation</h3>
            <p className="text-black text-sm">Send a message to begin chatting with CouplesDNA AI.</p>
          </div>
        </div>
      ) : (
        <div>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isUser={message.sender?.isCurrentUser}
            />
          ))}
          {isLoading && <TypingIndicator />}
        </div>
      )}
    </div>
  );
};

// Simple Input Area
const InputArea = ({
  value = "",
  onChange,
  onSubmit,
  onSaveChat,
  disabled = false,
  placeholder = "Type your message...",
  showSaveButton = false,
  className
}) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.(e);
    }
  };

  return (
    <div className={cn("border-t border-black bg-white p-6", className)}>      
      <div className="flex items-end gap-4">
        <textarea
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="flex-1 px-3 py-2 border border-black bg-white focus:outline-none resize-none"
        />
        <div className="flex flex-col gap-2">
          {/* Save Chat Button - only show when there are messages */}
          {showSaveButton && (
            <button
              onClick={onSaveChat}
              disabled={disabled}
              className="px-4 py-2 border border-black bg-white text-black hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Save Chat & Start New
            </button>
          )}
          <button
            onClick={onSubmit}
            disabled={!value?.trim() || disabled}
            className={cn(
              "px-6 py-2 border border-black font-medium transition-colors",
              value?.trim() && !disabled
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-500 cursor-not-allowed"
            )}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Simple Chat Interface
export const SimpleChatInterface = ({
  title = "CouplesDNA AI",
  messages = [],
  isLoading = false,
  onSendMessage,
  onSaveChat,
  disabled = false,
  className,
  ...props
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading || disabled) return;

    const message = inputValue;
    setInputValue("");
    onSendMessage?.(message);
  };

  return (
    <div className={cn(
      "flex flex-col h-full w-full bg-white border border-black",
      className
    )}>
      {/* Header */}
      <div className="border-b border-black bg-white p-6">
        <h2 className="text-2xl font-medium text-black">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">Relationship Assistant</p>
      </div>

      {/* Messages */}
      <MessagesContainer
        messages={messages}
        isLoading={isLoading}
      />

      {/* Input */}
      <InputArea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onSubmit={handleSendMessage}
        onSaveChat={onSaveChat}
        disabled={isLoading || disabled}
        placeholder="Ask me anything about your relationship..."
        showSaveButton={!!onSaveChat && messages.some(msg => msg.sender?.isCurrentUser)}
      />
    </div>
  );
};