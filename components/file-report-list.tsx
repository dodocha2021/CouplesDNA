'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CheckCircle2, Clock, AlertCircle, FileText, Calendar, HardDrive } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

interface FileItem {
  id: string
  name: string
  displayName: string
  uploadTime: string
  size: number
  vectorStatus: 'pending' | 'processing' | 'completed' | 'rejected-not-chat' | 'error-too-large' | 'error-download' | 'error-empty' | 'error-extraction' | 'error-timeout' | 'error-other'
  filePath: string
  metadata?: any
}

interface FileReportListProps {
  onGenerateReport?: (selectedFiles: FileItem[]) => void
  className?: string
  title?: string
  showHeader?: boolean
}

// Format bytes utility
const formatBytes = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

// Extract display name from file path (remove timestamp prefix)
const getDisplayName = (filename: string): string => {
  const underscoreIndex = filename.indexOf('_')
  if (underscoreIndex !== -1 && underscoreIndex > 0) {
    // Check if the part before underscore is a timestamp (all digits)
    const prefix = filename.substring(0, underscoreIndex)
    if (/^\d+$/.test(prefix)) {
      return filename.substring(underscoreIndex + 1)
    }
  }
  return filename
}

// Format upload time
const formatUploadTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function FileReportList({ 
  onGenerateReport, 
  className, 
  title = "Select Files for Report",
  showHeader = true 
}: FileReportListProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load files from database
  useEffect(() => {
    const loadFiles = async () => {
      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setError('Authentication required')
          return
        }

        // Get files from storage
        const { data: storageFiles, error: storageError } = await supabase.storage
          .from('chat-logs')
          .list(`users/${session.user.id}`, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
          })

        if (storageError) {
          console.error('Storage error:', storageError)
          setError('Failed to load files')
          return
        }

        // Check vector status for each file
        const fileItems: FileItem[] = []
        
        for (const file of storageFiles || []) {
          const filePath = `users/${session.user.id}/${file.name}`
          
          // First check if file has been vectorized (has documents)
          const { data: documents } = await supabase
            .from('documents')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('metadata->>source_file_path', filePath)
            .limit(1)

          let vectorStatus: FileItem['vectorStatus'] = 'pending'
          
          if (documents && documents.length > 0) {
            vectorStatus = 'completed'
          } else {
            // If no documents, check detailed status via API
            try {
              const response = await fetch(`/api/check-vector-status?filePath=${encodeURIComponent(filePath)}`, {
                headers: { 
                  'Authorization': `Bearer ${session.access_token}` 
                }
              })
              
              if (response.ok) {
                const result = await response.json()
                
                if (result.status === 'rejected' && result.reason === 'not_chat_log') {
                  vectorStatus = 'rejected-not-chat'
                } else if (result.status === 'error') {
                  switch (result.error_type) {
                    case 'file_too_large':
                      vectorStatus = 'error-too-large'
                      break
                    case 'processing_timeout':
                      vectorStatus = 'error-timeout'
                      break
                    case 'extraction_failed':
                      vectorStatus = 'error-extraction'
                      break
                    default:
                      vectorStatus = 'error-other'
                  }
                } else if (result.status === 'success') {
                  vectorStatus = 'completed'
                }
              }
            } catch (apiError) {
              console.warn(`Failed to check vector status for ${file.name}:`, apiError)
              // Keep default 'pending' status
            }
          }

          fileItems.push({
            id: file.id || file.name,
            name: file.name,
            displayName: getDisplayName(file.name),
            uploadTime: file.created_at || file.updated_at || '',
            size: file.metadata?.size || 0,
            vectorStatus,
            filePath,
            metadata: file.metadata
          })
        }

        setFiles(fileItems)
        setError(null)
      } catch (err) {
        console.error('Error loading files:', err)
        setError('Failed to load files')
      } finally {
        setLoading(false)
      }
    }

    loadFiles()
  }, [])

  // Handle checkbox change
  const handleCheckboxChange = (fileId: string, checked: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(fileId)
      } else {
        newSet.delete(fileId)
      }
      return newSet
    })
  }

  // Handle generate report
  const handleGenerateReport = () => {
    const selectedFileItems = files.filter(file => selectedFiles.has(file.id))
    onGenerateReport?.(selectedFileItems)
  }

  // Get vector status icon and text
  const getVectorStatusDisplay = (status: FileItem['vectorStatus']) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
          text: 'Completed',
          color: 'text-green-600'
        }
      case 'processing':
        return {
          icon: <Clock className="w-4 h-4 text-blue-500" />,
          text: 'Processing',
          color: 'text-blue-600'
        }
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4 text-gray-500" />,
          text: 'Pending',
          color: 'text-gray-600'
        }
      case 'rejected-not-chat':
        return {
          icon: <AlertCircle className="w-4 h-4 text-orange-500" />,
          text: 'Not Chat Log',
          color: 'text-orange-600'
        }
      case 'error-too-large':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: 'File Too Large',
          color: 'text-red-600'
        }
      case 'error-timeout':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: 'Processing Timeout',
          color: 'text-red-600'
        }
      case 'error-extraction':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: 'Extraction Failed',
          color: 'text-red-600'
        }
      default:
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: 'Error',
          color: 'text-red-600'
        }
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Loading your uploaded files...</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasCompletedFiles = files.some(file => file.vectorStatus === 'completed')
  const canGenerateReport = selectedFiles.size > 0 && files.length > 0

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>
            Select completed files to generate an analysis report
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {files.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No files uploaded yet</p>
          </div>
        ) : (
          <>
            {/* Files Table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-full table-fixed">
                  <thead>
                    <tr className="border-b text-xs text-left bg-gray-50">
                      <th className="h-9 px-3 w-[45%]">File Name</th>
                      <th className="h-9 px-3 w-[20%]">Upload Time</th>
                      <th className="h-9 px-3 w-[15%]">Size</th>
                      <th className="h-9 px-3 w-[20%]">Vector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => {
                      const statusDisplay = getVectorStatusDisplay(file.vectorStatus)
                      const canCheck = file.vectorStatus === 'completed'
                      const isChecked = selectedFiles.has(file.id)
                      
                      return (
                        <tr key={file.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleCheckboxChange(file.id, e.target.checked)}
                                disabled={!canCheck}
                                className={cn(
                                  "rounded border-gray-300 text-blue-600 focus:ring-blue-500",
                                  !canCheck && "opacity-50 cursor-not-allowed"
                                )}
                              />
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{file.displayName}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {formatUploadTime(file.uploadTime)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <HardDrive className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {formatBytes(file.size)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {statusDisplay.icon}
                              <span className={cn("text-xs", statusDisplay.color)}>
                                {statusDisplay.text}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Generate Report Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleGenerateReport}
                disabled={!canGenerateReport}
                variant="outline"
                size="sm"
              >
                Generate Report ({selectedFiles.size} selected)
              </Button>
            </div>

            {/* Info */}
            {!hasCompletedFiles && files.length > 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">
                  No files are ready for analysis yet. Files must complete vector processing first.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}