'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import {
  CloudUpload,
  Download,
  FileArchiveIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  RefreshCwIcon,
  Trash2,
  TriangleAlert,
  Upload,
  VideoIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// Helper function to format file size
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  downloadUrl?: string;
  vectorStatus?: 'pending' | 'processing' | 'completed' | 'rejected-not-chat' | 'error-too-large' | 'error-download' | 'error-empty' | 'error-extraction' | 'error-timeout' | 'error-other';
  vectorErrorMessage?: string;
  filePath?: string;
  isHistorical?: boolean; // 区分历史文件和新上传文件
}

interface TableUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  className?: string;
  onFilesChange?: (files: File[]) => void;
  simulateUpload?: boolean;
}

export default function TableUpload({
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = '*',
  multiple = true,
  className,
  onFilesChange,
  simulateUpload = false,
}: TableUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load historical files from database
  const loadHistoricalFiles = async () => {
    try {
      setIsLoadingHistorical(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      const { data: files, error } = await supabase.storage
        .from('chat-logs')
        .list(`users/${session.user.id}`, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error loading historical files:', error);
        return;
      }

      if (files && files.length > 0) {
        const historicalFileItems: FileUploadItem[] = files.map((file) => {
          // Create a mock File object with the correct size
          const mockFileSize = file.metadata?.size || 0;
          const mockFile = new File([''], file.name, { 
            type: file.metadata?.mimetype || 'text/plain',
            lastModified: new Date(file.created_at || Date.now()).getTime()
          });
          
          // Override the size property
          Object.defineProperty(mockFile, 'size', {
            value: mockFileSize,
            writable: false
          });

          return {
            id: `historical-${file.id || file.name}`,
            file: mockFile,
            progress: 100,
            status: 'completed' as const,
            downloadUrl: '', // Will be set if needed
            vectorStatus: 'pending' as const, // Will be checked
            filePath: `users/${session.user.id}/${file.name}`,
            isHistorical: true
          };
        });

        setUploadFiles(prev => {
          // Remove any existing historical files and add new ones
          const newFiles = prev.filter(f => !f.isHistorical);
          return [...newFiles, ...historicalFileItems];
        });

        // Check vector status for each historical file
        historicalFileItems.forEach(fileItem => {
          if (fileItem.filePath) {
            setTimeout(() => {
              checkVectorProcessing(fileItem.id, fileItem.filePath!);
            }, 1000);
          }
        });
      }
    } catch (error) {
      console.error('Error in loadHistoricalFiles:', error);
    } finally {
      setIsLoadingHistorical(false);
    }
  };

  // Load historical files on component mount
  useEffect(() => {
    loadHistoricalFiles();
  }, []);

  // Vector status cache management
  const CACHE_KEY = 'vector_status_cache';
  const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  const getVectorStatusFromCache = (filePath: string) => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const cache = JSON.parse(cached);
      const entry = cache[filePath];
      
      if (!entry) return null;
      
      // Check if cache is expired
      if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
        // Remove expired entry
        delete cache[filePath];
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        return null;
      }
      
      return entry;
    } catch (error) {
      console.error('Error reading vector status cache:', error);
      return null;
    }
  };

  const setVectorStatusInCache = (filePath: string, status: any, errorMessage?: string) => {
    try {
      const cached = localStorage.getItem(CACHE_KEY) || '{}';
      const cache = JSON.parse(cached);
      
      cache[filePath] = {
        status,
        errorMessage,
        timestamp: Date.now()
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving vector status cache:', error);
    }
  };

  // Check vector processing status via Edge Function
  const checkVectorProcessing = async (fileId: string, filePath: string) => {
    try {
      // First check cache
      const cachedStatus = getVectorStatusFromCache(filePath);
      if (cachedStatus) {
        console.log(`Using cached vector status for ${filePath}:`, cachedStatus.status);
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { 
              ...f, 
              vectorStatus: cachedStatus.status,
              vectorErrorMessage: cachedStatus.errorMessage
            } : f
          )
        );
        return;
      }

      // Update status to processing if not in cache
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, vectorStatus: 'processing' as const } : f
        )
      );

      // Get the current user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { 
              ...f, 
              vectorStatus: 'error-other' as const,
              vectorErrorMessage: 'Authentication required'
            } : f
          )
        );
        return;
      }

      // First check if documents already exist for this file path
      const checkResponse = await axios.get(`/api/check-document-processing?filePath=${encodeURIComponent(filePath)}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (checkResponse.data.success && checkResponse.data.processed) {
        // Already processed successfully
        const status = 'completed' as const;
        setVectorStatusInCache(filePath, status);
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, vectorStatus: status } : f
          )
        );
        return;
      }

      // If not found in documents table, try to get detailed status from processing
      const statusResponse = await axios.get(`/api/check-vector-status?filePath=${encodeURIComponent(filePath)}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const result = statusResponse.data;
      console.log('FRONTEND_RECEIVED_RESULT:', JSON.stringify(result, null, 2));
      
      // Handle structured response from processing status check
      if (result.status === 'success') {
        console.log('FRONTEND_PROCESSING: success status detected');
        const status = 'completed' as const;
        setVectorStatusInCache(filePath, status);
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, vectorStatus: status } : f
          )
        );
      } else if (result.status === 'rejected' && result.reason === 'not_chat_log') {
        console.log('FRONTEND_PROCESSING: rejected not_chat_log status detected');
        const status = 'rejected-not-chat' as const;
        const errorMessage = '非聊天记录文件';
        setVectorStatusInCache(filePath, status, errorMessage);
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { 
              ...f, 
              vectorStatus: status,
              vectorErrorMessage: errorMessage
            } : f
          )
        );
      } else if (result.status === 'error') {
        console.log('FRONTEND_PROCESSING: error status detected, error_type:', result.error_type);
        let vectorStatus: FileUploadItem['vectorStatus'] = 'error-other';
        let errorMessage = '处理失败';

        switch (result.error_type) {
          case 'file_too_large':
            vectorStatus = 'error-too-large';
            errorMessage = '文件过大';
            break;
          case 'download_failed':
            vectorStatus = 'error-download';
            errorMessage = '下载失败';
            break;
          case 'file_empty':
            vectorStatus = 'error-empty';
            errorMessage = '文件为空';
            break;
          case 'extraction_failed':
            vectorStatus = 'error-extraction';
            errorMessage = 'Extraction Failed';
            break;
          case 'processing_timeout':
            vectorStatus = 'error-timeout';
            errorMessage = 'Processing Timeout';
            break;
          default:
            vectorStatus = 'error-other';
            errorMessage = result.message || '处理失败';
            break;
        }

        setVectorStatusInCache(filePath, vectorStatus, errorMessage);
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { 
              ...f, 
              vectorStatus,
              vectorErrorMessage: errorMessage
            } : f
          )
        );
      } else {
        // Unknown status, mark as other error
        console.log('FRONTEND_PROCESSING: unknown status detected, result.status:', result.status);
        const status = 'error-other' as const;
        const errorMessage = 'Unknown status';
        setVectorStatusInCache(filePath, status, errorMessage);
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { 
              ...f, 
              vectorStatus: status,
              vectorErrorMessage: errorMessage
            } : f
          )
        );
      }
      
    } catch (error) {
      console.error('Vector processing check error:', error);
      const status = 'error-other' as const;
      const errorMessage = '检查失败';
      setVectorStatusInCache(filePath, status, errorMessage);
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { 
            ...f, 
            vectorStatus: status,
            vectorErrorMessage: errorMessage
          } : f
        )
      );
    }
  };


  // Delete file from storage and remove from list
  const deleteFile = async (fileItem: FileUploadItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('Authentication required for file deletion');
        return;
      }

      if (fileItem.isHistorical && fileItem.filePath) {
        // Delete historical file from storage
        const { error } = await supabase.storage
          .from('chat-logs')
          .remove([fileItem.filePath]);

        if (error) {
          console.error('Error deleting file from storage:', error);
          return;
        }

        // Also try to delete associated documents from vector database
        try {
          const { error: docError } = await supabase
            .from('documents')
            .delete()
            .eq('user_id', session.user.id)
            .eq('metadata->>source_file_path', fileItem.filePath);
          
          if (docError) {
            console.warn('Error deleting associated documents:', docError);
          }
        } catch (docDeleteError) {
          console.warn('Could not delete associated documents:', docDeleteError);
        }
      }

      // Remove from local state
      setUploadFiles(prev => prev.filter(f => f.id !== fileItem.id));
      
      // Clear from cache if exists
      if (fileItem.filePath) {
        try {
          const cached = localStorage.getItem(CACHE_KEY) || '{}';
          const cache = JSON.parse(cached);
          delete cache[fileItem.filePath];
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (error) {
          console.error('Error clearing cache for deleted file:', error);
        }
      }
      
    } catch (error) {
      console.error('Error in deleteFile:', error);
    }
  };

  // Upload file via API
  const uploadFile = async (file: File, fileId: string) => {
    try {
      console.log('Uploading file:', { 
        fileName: file.name, 
        fileSize: file.size, 
        fileType: file.type
      });

      // Get the current user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };
      
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      // Update progress periodically (simulate)
      const progressInterval = setInterval(() => {
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);

      const response = await axios.post('/api/upload', formData, {
        headers,
        timeout: 60000, // 60 seconds timeout
      });

      clearInterval(progressInterval);

      if (response.status === 200 && response.data.filePath) {
        console.log('Upload successful:', response.data);
        
        // Update file status to completed
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? { 
                  ...f, 
                  status: 'completed' as const, 
                  progress: 100, 
                  downloadUrl: response.data.publicUrl,
                  vectorStatus: 'pending' as const,
                  filePath: response.data.filePath
                }
              : f
          )
        );

        // Remove the uploading file from the list as it will appear in historical files
        setUploadFiles(prev => prev.filter(f => f.id !== fileId));
        
        // Refresh historical files to show the newly uploaded file
        setTimeout(() => {
          loadHistoricalFiles();
        }, 1000);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error details:', error);
      
      let errorMessage = 'Upload failed';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds maximum of ${formatBytes(maxSize)}`;
    }
    return null;
  };

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileUploadItem[] = [];
    const newErrors: string[] = [];

    newFiles.forEach(file => {
      const validation = validateFile(file);
      if (validation) {
        newErrors.push(`${file.name}: ${validation}`);
        return;
      }

      if (uploadFiles.length + validFiles.length >= maxFiles) {
        newErrors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const fileId = Math.random().toString(36).substring(2, 15);
      validFiles.push({
        id: fileId,
        file,
        progress: 0,
        status: 'uploading',
      });

      // Auto upload via API (only for new files)
      uploadFile(file, fileId);
    });

    if (newErrors.length > 0) {
      setErrors(prev => [...prev, ...newErrors]);
    }

    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
      onFilesChange?.(validFiles.map(f => f.file));
    }
  }, [uploadFiles.length, maxFiles, maxSize, onFilesChange]);

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const clearFiles = async () => {
    try {
      // Delete all files (both historical and new uploads)
      const filesToDelete = [...uploadFiles];
      
      // Delete each file using the same logic as individual delete
      for (const fileItem of filesToDelete) {
        if (fileItem.isHistorical || fileItem.status === 'completed') {
          await deleteFile(fileItem);
        }
      }
      
      // Clear any remaining files and errors
      setUploadFiles([]);
      setErrors([]);
    } catch (error) {
      console.error('Error clearing files:', error);
      // Still clear the UI even if some deletions failed
      setUploadFiles([]);
      setErrors([]);
    }
  };

  const retryUpload = (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (file) {
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, progress: 0, status: 'uploading' as const, error: undefined } : f
        )
      );
      uploadFile(file.file, fileId);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <ImageIcon className="size-4" />;
    if (type.startsWith('video/')) return <VideoIcon className="size-4" />;
    if (type.startsWith('audio/')) return <HeadphonesIcon className="size-4" />;
    if (type.includes('pdf')) return <FileTextIcon className="size-4" />;
    if (type.includes('word') || type.includes('doc')) return <FileTextIcon className="size-4" />;
    if (type.includes('excel') || type.includes('sheet')) return <FileSpreadsheetIcon className="size-4" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchiveIcon className="size-4" />;
    return <FileTextIcon className="size-4" />;
  };

  const getFileTypeLabel = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('video/')) return 'Video';
    if (type.startsWith('audio/')) return 'Audio';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('doc')) return 'Word';
    if (type.includes('excel') || type.includes('sheet')) return 'Excel';
    if (type.includes('zip') || type.includes('rar')) return 'Archive';
    if (type.includes('json')) return 'JSON';
    if (type.includes('text')) return 'Text';
    return 'File';
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Files Table */}
      {uploadFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Files ({uploadFiles.length})</h3>
            <div className="flex gap-2">
              <Button onClick={openFileDialog} variant="outline" size="sm">
                <CloudUpload className="w-4 h-4 mr-1" />
                Add files
              </Button>
              <Button onClick={clearFiles} variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-1" />
                Remove all
              </Button>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full table-fixed">
                <thead>
                  <tr className="border-b text-xs text-left bg-gray-50">
                    <th className="h-9 px-3 w-[40%]">Name</th>
                    <th className="h-9 px-3 w-[15%]">Type</th>
                    <th className="h-9 px-3 w-[15%]">Size</th>
                    <th className="h-9 px-3 w-[20%]">Vector</th>
                    <th className="h-9 px-3 w-[10%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                {uploadFiles.map((fileItem) => (
                  <tr key={fileItem.id} className="border-b">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-8 shrink-0 relative flex items-center justify-center text-gray-600">
                          {fileItem.status === 'uploading' ? (
                            <div className="relative">
                              {/* Circular progress background */}
                              <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="text-gray-200"
                                />
                                {/* Progress circle */}
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeDasharray={`${2 * Math.PI * 14}`}
                                  strokeDashoffset={`${2 * Math.PI * 14 * (1 - fileItem.progress / 100)}`}
                                  className="text-blue-600 transition-all duration-300"
                                  strokeLinecap="round"
                                />
                              </svg>
                              {/* File icon in center */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                {getFileIcon(fileItem.file)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              {getFileIcon(fileItem.file)}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <p className="flex items-center gap-1 text-sm font-medium">
                            <span className="truncate">{fileItem.file.name}</span>
                            {fileItem.status === 'error' && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded flex-shrink-0">
                                Error
                              </span>
                            )}
                          </p>
                          {fileItem.status === 'error' && fileItem.error && (
                            <p className="text-xs text-red-600 mt-1 truncate">
                              {fileItem.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded truncate">
                        {getFileTypeLabel(fileItem.file)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-600 truncate">
                      {formatBytes(fileItem.file.size)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-start">
                        {(fileItem.status === 'completed' || fileItem.isHistorical) && (
                          <>
                            {fileItem.vectorStatus === 'pending' && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-xs text-gray-500">Pending</span>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'processing' && (
                              <div className="flex items-center gap-1">
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                <span className="text-xs text-blue-600">Processing</span>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'completed' && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-green-600">Completed</span>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'rejected-not-chat' && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-orange-500" />
                                <span className="text-xs text-orange-600">Not Chat Log</span>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'error-too-large' && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-red-600">Too Large</span>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'error-download' && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-red-600">Download Failed</span>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'error-empty' && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-red-600">Empty File</span>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'error-extraction' && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-red-600">Extraction Failed</span>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'error-timeout' && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-orange-500" />
                                <span className="text-xs text-orange-600">Processing Timeout</span>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'error-other' && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-red-600">Error</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 justify-end">
                        {fileItem.downloadUrl && fileItem.status === 'completed' && (
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0" asChild>
                            <Link href={fileItem.downloadUrl} target="_blank">
                              <Download className="size-3.5" />
                            </Link>
                          </Button>
                        )}
                        {fileItem.status === 'error' ? (
                          <Button
                            onClick={() => retryUpload(fileItem.id)}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <RefreshCwIcon className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => fileItem.isHistorical ? deleteFile(fileItem) : removeFile(fileItem.id)}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          'relative rounded-lg border border-dashed p-6 text-center transition-colors',
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 transition-colors',
              isDragging ? 'bg-blue-100' : '',
            )}
          >
            <Upload className="h-5 w-5 text-gray-600" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Drop files here or{' '}
              <button
                type="button"
                onClick={openFileDialog}
                className="cursor-pointer text-blue-600 underline-offset-4 hover:underline"
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-gray-500">
              Maximum file size: {formatBytes(maxSize)} • Maximum files: {maxFiles}
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mt-5 p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex">
            <TriangleAlert className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">File upload error(s)</h3>
              <div className="mt-2 text-sm text-red-700">
                {errors.map((error, index) => (
                  <p key={index} className="mb-1 last:mb-0">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}