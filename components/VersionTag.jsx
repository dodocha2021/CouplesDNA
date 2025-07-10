import { useEffect, useState } from 'react';

export default function VersionTag() {
  const [version, setVersion] = useState('');
  useEffect(() => {
    fetch('/app_version.txt')
      .then(res => res.text())
      .then(text => setVersion(text.trim()));
  }, []);
  if (!version) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 8,
      left: 8,
      fontSize: 12,
      color: '#888',
      background: '#fff8',
      borderRadius: 4,
      padding: '2px 8px',
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      {version}
    </div>
  );
} 