import React from 'react';

export default function TopBar({ title, onMenu, onBack, showBack, showMenu }) {
  return (
    <header style={{
      padding: 16,
      fontWeight: 'bold',
      fontSize: 20,
      textAlign: 'center',
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      minHeight: 56,
    }}>
      {/* Back arrow */}
      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        {showBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 24,
              padding: 0,
              color: '#222',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Back"
          >
            {/* Left arrow SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
      </div>
      {/* Title */}
      <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: 20 }}>{title}</div>
      {/* Right menu button */}
      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {showMenu && (
          <button
            onClick={onMenu}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 24,
              padding: 0,
              color: '#222',
              display: 'flex',
              alignItems: 'center',
              transition: 'transform 0.2s',
            }}
            aria-label="Menu"
            className="menu-ellipsis"
          >
            {/* Horizontal three dots SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="6" cy="12" r="2" fill="#222" /><circle cx="12" cy="12" r="2" fill="#222" /><circle cx="18" cy="12" r="2" fill="#222" /></svg>
          </button>
        )}
      </div>
    </header>
  );
} 