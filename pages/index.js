import React, { useState, useRef, useEffect } from 'react';
import ChatInput from '../components/ChatInput';
import { MessageList } from '../components/ui/Message';
import TopBar from '../components/ui/TopBar';
import InfoDrawer from '../components/ui/InfoDrawer';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const N8N_WEBHOOK = 'https://couplesdna.app.n8n.cloud/webhook/f196bb14-f364-4a66-afea-079c2dd1cf1c';

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Welcome to CouplesDNA Chat Analysis Assistant!' },
  ]);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const chatEndRef = useRef(null);
  const [sessionId, setSessionId] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('sessionId') || null : null
  );

  function parseDbMessage(dbMessage) {
    if (dbMessage.type === 'human') {
      return { role: 'user', text: dbMessage.content };
    }
    if (dbMessage.type === 'ai') {
      return { role: 'bot', text: dbMessage.content };
    }
    return null;
  }

  // 页面首次加载时自动查历史，并恢复等待状态
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
        // 检查本地pendingMessage
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
          { role: 'system', text: 'Welcome to CouplesDNA Chat Analysis Assistant!' },
          ...history
        ];
        if (pending) {
          msgs = [...msgs, { role: 'user', text: pending }];
          setMessages(msgs);
          setLoading(true);
          // 新增：最大等待时间，超时自动清理
          setTimeout(() => {
            if (typeof window !== 'undefined' && localStorage.getItem('pendingMessage')) {
              setLoading(false);
              localStorage.removeItem('pendingMessage');
              setMessages((msgs) => [
                ...msgs,
                { role: 'bot', text: 'Request failed, please try again later.' }
              ]);
            }
          }, 60000); // 60秒
        }
      })();
    } else {
      setMessages([
        { role: 'system', text: 'Welcome to CouplesDNA Chat Analysis Assistant!' }
      ]);
    }
    // eslint-disable-next-line
  }, []); // 只在首次加载时执行

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async (text) => {
    let sid = sessionId;
    if (!sid) {
      sid = generateSessionId();
      setSessionId(sid);
      localStorage.setItem('sessionId', sid);
    }
    setMessages((msgs) => [...msgs, { role: 'user', text }]);
    setLoading(true);
    // 存储pendingMessage
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingMessage', JSON.stringify({ text, sessionId: sid }));
    }
    try {
      const res = await axios.post(
        N8N_WEBHOOK,
        [
          {
            sessionId: sid,
            action: 'sendMessage',
            chatInput: text
          }
        ],
        { headers: { 'Content-Type': 'application/json' } }
      );
      const aiText = res.data.reply || res.data.message || res.data.output || res.data.content || JSON.stringify(res.data);
      setMessages((msgs) => [...msgs, { role: 'bot', text: aiText }]);
      // 清除pendingMessage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pendingMessage');
      }
    } catch (e) {
      console.log('catch error', e);
      setMessages((msgs) => [...msgs, { role: 'bot', text: 'Request failed, please try again later.' }]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pendingMessage');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploaded = (fileName, msg) => {
    setMessages((msgs) => [
      ...msgs,
      { role: 'file', text: `${fileName}: ${msg}` },
    ]);
  };

  // 清空聊天
  const handleClearChat = () => {
    setMessages([
      { role: 'system', text: 'Welcome to CouplesDNA Chat Analysis Assistant!' }
    ]);
    setSessionId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sessionId');
    }
  };

  // 取消等待
  const cancelPendingMessage = () => {
    setLoading(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pendingMessage');
    }
    setMessages((msgs) => [
      ...msgs,
      { role: 'bot', text: 'Request cancelled by user.' }
    ]);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f8fa',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 600,
      margin: '0 auto',
      boxShadow: '0 0 8px #eee',
      position: 'relative',
      height: '100vh',
    }}>
      {/* 顶部标题栏固定 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff' }}>
        <TopBar
          title="CouplesDNA Chat Analysis"
          showMenu={!showInfo}
          showBack={false}
          onMenu={() => setShowInfo(true)}
        />
      </div>
      {/* 聊天内容区可滚动 */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <MessageList
          messages={messages}
          loading={loading}
          onCancelPendingMessage={cancelPendingMessage}
          pendingMessage={typeof window !== 'undefined' && localStorage.getItem('pendingMessage')}
        />
        <div ref={chatEndRef} />
      </div>
      {/* 底部输入框固定 */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#f7f8fa',
          zIndex: 10,
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}
      >
        <ChatInput onSend={handleSend} onFileUploaded={handleFileUploaded} loading={loading} />
      </div>
      <InfoDrawer open={showInfo} onClose={() => setShowInfo(false)} onClearChat={handleClearChat} />
      <style jsx global>{`
        body {
          margin: 0;
          background: #f7f8fa;
        }
        @media (max-width: 700px) {
          div[style*='max-width: 600px'] {
            max-width: 100vw !important;
            box-shadow: none !important;
          }
        }
        .message-list {
          padding-bottom: 72px;
        }
      `}</style>
    </div>
  );
} 