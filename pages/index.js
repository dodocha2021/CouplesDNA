import React, { useState, useRef, useEffect } from 'react';
import ChatInput from '../components/ChatInput';
import { MessageList } from '../components/ui/Message';
import TopBar from '../components/ui/TopBar';
import InfoDrawer from '../components/ui/InfoDrawer';
import axios from 'axios';

const N8N_WEBHOOK = 'https://couplesdna.app.n8n.cloud/webhook/f196bb14-f364-4a66-afea-079c2dd1cf1c';

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Welcome to CouplesDNA Chat Analysis Assistant!' },
  ]);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const chatEndRef = useRef(null);
  const sessionIdRef = useRef(
    typeof window !== 'undefined'
      ? localStorage.getItem('sessionId') || Math.random().toString(36).slice(2)
      : Math.random().toString(36).slice(2)
  );
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sessionId', sessionIdRef.current);
    }
  }, []);

  const handleSend = async (text) => {
    setMessages((msgs) => [...msgs, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await axios.post(N8N_WEBHOOK, [
        {
          sessionId: sessionIdRef.current,
          action: 'sendMessage',
          chatInput: text
        }
      ]);
      setMessages((msgs) => [
        ...msgs,
        { role: 'bot', text: res.data.output || res.data.message || res.data.reply || JSON.stringify(res.data) }
      ]);
    } catch (e) {
      console.log('Request failed details:', e);
      setMessages((msgs) => [
        ...msgs,
        { role: 'bot', text: 'Request failed, please try again later.' }
      ]);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    }}>
      <TopBar
        title="CouplesDNA Chat Analysis"
        showMenu={!showInfo}
        showBack={false}
        onMenu={() => setShowInfo(true)}
      />
      <MessageList messages={messages} loading={loading} />
      <div ref={chatEndRef} />
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
      <InfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />
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