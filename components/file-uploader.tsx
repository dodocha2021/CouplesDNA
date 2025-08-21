'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { cn } from '../lib/utils';
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
  vectorStatus?: 'pending' | 'processing' | 'completed' | 'error';
  filePath?: string;
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
  maxSize = 50 * 1024 * 1024, // 50MB
  accept = '*',
  multiple = true,
  className,
  onFilesChange,
  simulateUpload = false,
}: TableUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check vector processing status via API
  const checkVectorProcessing = async (fileId: string, filePath: string) => {
    try {
      // Update status to processing
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, vectorStatus: 'processing' as const } : f
        )
      );

      // Check if documents were created for this file path via API
      const response = await axios.get(`/api/check-document-processing?filePath=${encodeURIComponent(filePath)}`);
      
      if (response.data.success && response.data.processed) {
        // Processing successful
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, vectorStatus: 'completed' as const } : f
          )
        );
      } else {
        // Check again after 5 seconds (up to 3 times)
        setTimeout(() => {
          checkVectorProcessingRetry(fileId, filePath, 1);
        }, 5000);
      }
    } catch (error) {
      console.error('Vector processing check error:', error);
      if (error.response?.status === 401) {
        console.error('Authentication failed for vector processing check');
      }
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, vectorStatus: 'error' as const } : f
        )
      );
    }
  };

  // Retry vector processing check via API
  const checkVectorProcessingRetry = async (fileId: string, filePath: string, retryCount: number) => {
    if (retryCount > 3) {
      // Max retries reached, mark as error
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, vectorStatus: 'error' as const } : f
        )
      );
      return;
    }

    try {
      const response = await axios.get(`/api/check-document-processing?filePath=${encodeURIComponent(filePath)}`);
      
      if (response.data.success && response.data.processed) {
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, vectorStatus: 'completed' as const } : f
          )
        );
      } else {
        // Try again
        setTimeout(() => {
          checkVectorProcessingRetry(fileId, filePath, retryCount + 1);
        }, 10000); // Longer delay for retries
      }
    } catch (error) {
      console.error('Vector processing retry error:', error);
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, vectorStatus: 'error' as const } : f
        )
      );
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout
      });

      clearInterval(progressInterval);

      if (response.data.success) {
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

        // Start checking for vector processing after a delay
        setTimeout(() => {
          checkVectorProcessing(fileId, response.data.filePath);
        }, 10000); // Check after 10 seconds
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

      // Auto upload via API
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

  const clearFiles = () => {
    setUploadFiles([]);
    setErrors([]);
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

          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-left">
                  <th className="h-9 px-3">Name</th>
                  <th className="h-9 px-3">Type</th>
                  <th className="h-9 px-3">Size</th>
                  <th className="h-9 px-3 w-[80px]">Vector</th>
                  <th className="h-9 px-3 w-[100px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploadFiles.map((fileItem) => (
                  <tr key={fileItem.id} className="border-b">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
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
                        <div className="flex flex-col">
                          <p className="flex items-center gap-1 truncate text-sm font-medium">
                            {fileItem.file.name}
                            {fileItem.status === 'error' && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                Error
                              </span>
                            )}
                          </p>
                          {fileItem.status === 'error' && fileItem.error && (
                            <p className="text-xs text-red-600 mt-1">
                              {fileItem.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {getFileTypeLabel(fileItem.file)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-600">
                      {formatBytes(fileItem.file.size)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center">
                        {fileItem.status === 'completed' && (
                          <>
                            {fileItem.vectorStatus === 'pending' && (
                              <div className="flex items-center gap-1" title="Vector processing pending">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              </div>
                            )}
                            {fileItem.vectorStatus === 'processing' && (
                              <div className="flex items-center gap-1" title="Processing vectors...">
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                              </div>
                            )}
                            {fileItem.vectorStatus === 'completed' && (
                              <div className="flex items-center gap-1" title="Vectorized successfully">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              </div>
                            )}
                            {fileItem.vectorStatus === 'error' && (
                              <div className="flex items-center gap-1" title="Vector processing failed">
                                <AlertCircle className="w-4 h-4 text-red-500" />
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
                            onClick={() => removeFile(fileItem.id)}
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