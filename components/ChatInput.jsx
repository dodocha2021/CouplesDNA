import React, { useRef, useState } from 'react';
import axios from 'axios';

export default function ChatInput({ onSend, onFileUploaded, loading }) {
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSend(input);
      setInput('');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (onFileUploaded) {
        onFileUploaded(res.data.fileName, res.data.message);
      }
    } catch (err) {
      if (onFileUploaded) {
        onFileUploaded(file.name, 'Upload failed');
      }
    } finally {
      setUploading(false);
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8 }}>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
        placeholder="Type your message..."
        style={{ flex: 1, padding: 8 }}
        disabled={loading}
      />
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={uploading || loading}
      />
      <button
        onClick={() => fileInputRef.current.click()}
        disabled={uploading || loading}
        style={{ padding: '8px 12px' }}
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>
      <button
        onClick={handleSend}
        disabled={loading || !input.trim()}
        style={{ padding: '8px 12px' }}
      >Send</button>
    </div>
  );
} 