import React from 'react';

// 等待动画组件
export function LoadingAnimation({ text = "AI is thinking..." }) {
  return (
    <div style={{
      alignSelf: 'flex-start',
      background: '#fff',
      borderRadius: 8,
      padding: '8px 12px',
      marginTop: 4,
      fontSize: 14,
      color: '#666',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      maxWidth: '80%',
    }}>
      <div className="pulse-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span>{text}</span>
    </div>
  );
}

// 脉冲动画组件
export function PulseAnimation({ children, duration = 1.4 }) {
  return (
    <div style={{ animation: `pulse ${duration}s infinite` }}>
      {children}
    </div>
  );
}

// 旋转动画组件
export function SpinnerAnimation({ size = 20, color = '#666' }) {
  return (
    <div 
      className="spinner"
      style={{ 
        width: size, 
        height: size, 
        borderColor: color 
      }}
    />
  );
}

// 淡入动画组件
export function FadeInAnimation({ children, delay = 0 }) {
  return (
    <div 
      className="fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

// 打字机效果组件
export function TypewriterAnimation({ text, speed = 50 }) {
  const [displayText, setDisplayText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  return <span>{displayText}</span>;
} 