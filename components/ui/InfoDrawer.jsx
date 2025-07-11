import React from 'react';
import TopBar from './TopBar';

const menuItems = [
  { label: 'Search chat history', key: 'search' },
  { label: 'Background', key: 'background' },
  { label: 'Clear chat history', key: 'clear' },
  { label: 'Report', key: 'report' },
];

export default function InfoDrawer({ open, onClose, onClearChat }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: open ? 'translateX(-50%)' : 'translateX(100vw)',
        width: '100vw',
        maxWidth: 600,
        height: '100vh',
        background: '#fff',
        zIndex: 100,
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: open ? '-2px 0 16px #0001' : 'none',
        display: 'flex',
        flexDirection: 'column',
        margin: '0 auto',
      }}
    >
      <TopBar title="CouplesDNA Chat Analysis" showBack={true} onBack={onClose} showMenu={false} />
      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {menuItems.map((item) => (
          <button
            key={item.key}
            style={{
              background: '#f7f8fa',
              border: 'none',
              borderRadius: 8,
              padding: '16px 12px',
              fontSize: 18,
              color: '#222',
              textAlign: 'left',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 1px 4px #eee',
              transition: 'background 0.2s',
            }}
            onClick={() => {
              if (item.key === 'clear' && onClearChat) {
                onClearChat();
                onClose();
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
} 