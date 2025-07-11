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

  // 页面首次加载时自动查历史
  useEffect(() => {
    if (sessionId) {
      (async () => {
        const { data, error } = await supabase
          .from('n8n_chat_histories')
          .select('message')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (!error && data) {
          const history = data.map(item => parseDbMessage(item.message)).filter(Boolean);
          setMessages([
            { role: 'system', text: 'Welcome to CouplesDNA Chat Analysis Assistant!' },
            ...history
          ]);
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
      // 假设 n8n 返回 { reply: 'xxx' } 或 { message: 'xxx' } 或 { output: 'xxx' }
      const aiText = res.data.reply || res.data.message || res.data.output || res.data.content || JSON.stringify(res.data);
      setMessages((msgs) => [...msgs, { role: 'bot', text: aiText }]);
    } catch (e) {
      setMessages((msgs) => [...msgs, { role: 'bot', text: 'Request failed, please try again later.' }]);
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
        <MessageList messages={messages} loading={loading} />
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