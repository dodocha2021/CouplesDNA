// Utility functions for the CouplesDNA application

// Class name utility function
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Generate unique session ID
export function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Parse database message format
export function parseDbMessage(dbMessage) {
  // Ensure content is a string and try to parse JSON
  const getContentString = (content) => {
    if (typeof content === 'string') {
      // Try to parse JSON format
      try {
        const parsed = JSON.parse(content);
        return parsed.output || parsed.text || parsed.message || parsed.content || content;
      } catch (e) {
        // If it is not in JSON format, return the original text directly
        return content;
      }
    }
    if (typeof content === 'object') {
      // If it is an object, prioritize extracting the output field
      return content.output || content.text || content.message || content.content || JSON.stringify(content);
    }
    return String(content || '');
  };

  // AI configuration
  const aiConfig = {
    name: "CouplesDNA AI",
    avatar: "/couplesdna-ai.png",
    role: "Relationship Assistant"
  };

  if (dbMessage.type === 'human') {
    return { 
      id: Date.now() + Math.random(),
      content: getContentString(dbMessage.content),
      sender: {
        name: "You",
        isCurrentUser: true,
      },
      timestamp: new Date()
    };
  }
  if (dbMessage.type === 'ai') {
    return { 
      id: Date.now() + Math.random(),
      content: getContentString(dbMessage.content),
      sender: {
        name: aiConfig.name,
        isCurrentUser: false,
      },
      timestamp: new Date()
    };
  }
  return null;
}

// File upload utility functions
export const fileUtils = {
  // Get file extension
  getFileExtension: (filename) => {
    return filename.split('.').pop().toLowerCase();
  },

  // Check if file is image
  isImage: (filename) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(fileUtils.getFileExtension(filename));
  },

  // Check if file is document
  isDocument: (filename) => {
    const docExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    return docExtensions.includes(fileUtils.getFileExtension(filename));
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

// Date and time utilities
export const dateUtils = {
  // Format timestamp for messages
  formatMessageTime: (timestamp) => {
    return timestamp?.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },

  // Format date for display
  formatDate: (date) => {
    return date?.toLocaleDateString();
  },

  // Check if date is today
  isToday: (date) => {
    const today = new Date();
    return date?.toDateString() === today.toDateString();
  },

  // Get relative time (e.g., "2 minutes ago")
  getRelativeTime: (date) => {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
};

// Storage utilities
export const storageUtils = {
  // Get item from localStorage safely
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  // Set item in localStorage safely
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Handle storage quota exceeded
    }
  },

  // Remove item from localStorage safely
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Handle errors silently
    }
  },

  // Get parsed JSON from localStorage
  getJSON: (key) => {
    const item = storageUtils.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return null;
    }
  },

  // Set JSON in localStorage
  setJSON: (key, value) => {
    try {
      storageUtils.setItem(key, JSON.stringify(value));
    } catch {
      // Handle errors silently
    }
  }
};

// API utilities
export const apiUtils = {
  // Create axios request configuration
  createRequestConfig: (options = {}) => {
    const { timeout = 30000, headers = {} } = options;
    return {
      timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
  },

  // Handle API errors
  handleApiError: (error) => {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || error.response.statusText,
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'No response from server',
        status: 0,
        data: null
      };
    } else {
      // Something else happened
      return {
        message: error.message,
        status: -1,
        data: null
      };
    }
  }
};

// Validation utilities
export const validationUtils = {
  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Check if string is empty or whitespace
  isEmpty: (str) => {
    return !str || !str.trim();
  },

  // Validate session ID format
  isValidSessionId: (sessionId) => {
    return sessionId && typeof sessionId === 'string' && sessionId.length > 10;
  },

  // Sanitize input text
  sanitizeText: (text) => {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  }
};

// Debug utilities
export const debugUtils = {
  // Log with timestamp
  log: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${message}`, data || '');
    }
  },

  // Log error with details
  error: (message, error = null) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] ERROR: ${message}`, error || '');
    }
  },

  // Log warning
  warn: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] WARNING: ${message}`, data || '');
    }
  }
};

// Export default object with all utilities
export default {
  cn,
  generateSessionId,
  parseDbMessage,
  fileUtils,
  dateUtils,
  storageUtils,
  apiUtils,
  validationUtils,
  debugUtils
};