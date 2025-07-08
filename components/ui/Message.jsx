import React from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { LoadingAnimation } from './Animation';

// 消息气泡组件
export function MessageBubble({ message, isLast, loading }) {
  return (
    <React.Fragment>
      <div
        style={{
          alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
          background: message.role === 'user' ? '#e0eaff' : message.role === 'bot' ? '#fff' : '#e6ffe6',
          color: '#222',
          borderRadius: 8,
          padding: '8px 12px',
          maxWidth: '80%',
          fontSize: 16,
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {message.role === 'bot' ? (
          <MarkdownMessage content={message.text} />
        ) : (
          message.text
        )}
      </div>
      {/* 如果是最后一条消息且正在加载，显示等待动画 */}
      {isLast && loading && <LoadingAnimation />}
    </React.Fragment>
  );
}

// 消息列表组件
export function MessageList({ messages, loading }) {
  return (
    <div className="message-list" style={{ 
      flex: 1, 
      overflowY: 'auto', 
      padding: 16, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 12 
    }}>
      {messages.map((msg, i) => (
        <MessageBubble 
          key={i} 
          message={msg} 
          isLast={i === messages.length - 1}
          loading={loading}
        />
      ))}
    </div>
  );
} 