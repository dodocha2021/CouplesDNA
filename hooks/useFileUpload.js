import { useState, useRef } from 'react';
import axios from 'axios';

export const useFileUpload = ({ onFileUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('File selected:', file.name, file.type, file.size);
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log('Uploading file to /api/upload...');
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      
      console.log('Upload response:', res.data);
      
      // Create success message
      const fileMessage = {
        id: Date.now(),
        content: `${res.data.fileName}: ${res.data.message}`,
        sender: {
          name: "You",
          avatar: "",
          isOnline: true,
          isCurrentUser: true,
        },
        timestamp: new Date()
      };
      
      // Call callback to add message
      onFileUploaded?.(fileMessage, true);
      
    } catch (err) {
      console.error('File upload error:', err);
      
      let errorMessage = 'Upload failed';
      if (err.response?.status === 500) {
        errorMessage = 'Server error, possible Google Drive configuration issue';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout, please try again';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      // Create error message
      const fileMessage = {
        id: Date.now(),
        content: `${file.name}: ${errorMessage}`,
        sender: {
          name: "You",
          avatar: "",
          isOnline: true,
          isCurrentUser: true,
        },
        timestamp: new Date()
      };
      
      // Call callback to add message
      onFileUploaded?.(fileMessage, false);
      
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAttachFile = () => {
    console.log('Attach file clicked');
    if (fileInputRef.current && !uploading) {
      fileInputRef.current.click();
    }
  };

  return {
    uploading,
    fileInputRef,
    handleFileChange,
    handleAttachFile,
  };
};