import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'
import TableUpload from '../components/file-uploader'
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function UploadPage() {
  const router = useRouter()
  const { questionnaireComplete, sessionId } = router.query
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [processingStatus, setProcessingStatus] = useState(null)
  const [recentFiles, setRecentFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(new Set());
  const [completedFiles, setCompletedFiles] = useState(new Set());

  const fetchRecentFiles = async (userId) => {
    setFilesLoading(true);
    try {
      const { data: files, error: filesError } = await supabase.storage
        .from('chat-logs')
        .list(`users/${userId}`, {
          limit: 10,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (filesError) {
        console.error('Error fetching recent files:', filesError);
      } else {
        setRecentFiles([...(files || [])]);
      }
    } catch (error) {
      console.error('Could not fetch recent files:', error);
    } finally {
      setFilesLoading(false);
    }
  }

  useEffect(() => {
    const initializePage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/')
          return
        }
        setUser(session.user)
        await fetchRecentFiles(session.user.id);
      } catch (error) {
        console.error('Auth check or file fetch error:', error)
      } finally {
        setLoading(false)
      }
    }
    initializePage();
  }, [])

  const handleFilesReady = (files) => {
    const transformedFiles = files.map((file, index) => ({
      id: `file-${index}`,
      file: file
    }))
    setSelectedFiles(transformedFiles)
    setUploadStatus(null)
    setProcessingStatus(null)
  }

  const checkProcessingStatus = async (filePath, userId) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('metadata->>source_file_path', filePath)
        .limit(1)

      if (error) {
        console.error('Error checking processing status:', error)
        setProcessingStatus({ type: 'error', message: 'Processing verification failed.' })
        return;
      }

      if (data && data.length > 0) {
        setProcessingStatus({ type: 'success', message: 'File successfully processed and vectorized!' })
        
        // 从处理中文件列表移除已完成的文件，并添加到完成列表
        const filePathParts = filePath.split('/');
        const fileName = filePathParts[filePathParts.length - 1];
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileName);
          return newSet;
        });
        setCompletedFiles(prev => new Set(prev).add(fileName));
        
        // 等待一秒后刷新文件列表，确保文件已经在存储中可见
        setTimeout(async () => {
          await fetchRecentFiles(userId);
          // 5秒后清除完成状态，恢复为普通的"Yes"状态
          setTimeout(() => {
            setCompletedFiles(prev => {
              const newSet = new Set(prev);
              newSet.delete(fileName);
              return newSet;
            });
          }, 5000);
        }, 1000);
      } else {
        setProcessingStatus({ type: 'error', message: 'File processing failed or timed out.' })
        
        // 处理失败也要移除处理标记
        const filePathParts = filePath.split('/');
        const fileName = filePathParts[filePathParts.length - 1];
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileName);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Processing status check error:', error)
      setProcessingStatus({ type: 'error', message: 'Processing verification failed.' })
    }
  }

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return
    const selectedFile = selectedFiles[0].file

    try {
      setUploading(true)
      setUploadStatus({ type: 'loading', message: 'Uploading your file...' })
      setProcessingStatus(null)

      const formData = new FormData()
      formData.append('file', selectedFile)

      const { data: { session } } = await supabase.auth.getSession()
      const headers = {}
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/upload', { method: 'POST', headers, body: formData })
      const result = await response.json()

      if (response.ok) {
        setUploadStatus({ type: 'success', message: 'File uploaded! Now processing for vector analysis...' })
        setProcessingStatus({ type: 'processing', message: 'Analyzing file content... This may take a moment.' })
        
        // 立即刷新文件列表，显示刚上传的文件
        await fetchRecentFiles(user.id);
        
        // 将新上传的文件标记为正在处理
        const fileName = selectedFile.name;
        setProcessingFiles(prev => new Set(prev).add(fileName));
        
        setTimeout(() => {
          checkProcessingStatus(result.filePath, user.id)
        }, 10000)

      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({ type: 'error', message: error.message || 'Upload failed. Please try again.' })
      setProcessingStatus(null)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/delete-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ filePath: `users/${user.id}/${fileToDelete.name}` }),
      });

      const result = await response.json();

      if (response.ok) {
        setRecentFiles(prevFiles => prevFiles.filter(f => f.id !== fileToDelete.id));
      } else {
        throw new Error(result.error || 'Failed to delete file.');
      }
    } catch (error) {
      console.error('Delete file error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  const handleBackToQuestionnaire = () => {
    router.push('/questionnaire')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto py-12">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Upload Chat Log
              </h1>
              <p className="text-lg text-gray-600">
                Upload your chat conversation file to get personalized relationship insights.
              </p>
            </div>

            {/* Questionnaire Status */}
            {questionnaireComplete && (
              <Card className="mb-6 border-green-200 bg-green-50">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      Questionnaire completed! Your analysis will be personalized.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (user) {
                          await supabase
                            .from('profiles')
                            .update({ 
                              age_range: null,
                              relationship_stage: null,
                              default_focus: null,
                              conversation_feeling: null
                            })
                            .eq('id', user.id)
                        }
                        router.push('/questionnaire')
                      } catch (error) {
                        console.error('Error resetting questionnaire:', error)
                      }
                    }}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    Redo
                  </Button>
                </CardContent>
              </Card>
            )}

            {!questionnaireComplete && (
              <Card className="mb-6 border-yellow-200 bg-yellow-50">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-yellow-800 font-medium mb-2">
                        Get More Accurate Results
                      </p>
                      <p className="text-yellow-700 text-sm mb-3">
                        Complete our quick questionnaire for more personalized insights.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleBackToQuestionnaire}
                        className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                      >
                        Take Questionnaire
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Select Chat Log File</CardTitle>
                <CardDescription>Your recently uploaded files - click ❌ to delete</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TableUpload onFilesChange={handleFilesReady} className="w-full" maxFiles={1} accept=".txt,.csv,.json" maxSize={3 * 1024 * 1024} simulateUpload={false} />
                
                {/* Status Messages */}
                {uploadStatus && (
                  <div className={`p-3 rounded-md text-sm flex items-center gap-3 ${
                    uploadStatus.type === 'error' ? 'bg-red-50 text-red-800' :
                    uploadStatus.type === 'success' ? 'bg-green-50 text-green-800' :
                    'bg-blue-50 text-blue-800'
                  }`}>
                    {uploadStatus.type === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {uploadStatus.type === 'error' && <AlertCircle className="h-4 w-4" />}
                    {uploadStatus.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                    <span>{uploadStatus.message}</span>
                  </div>
                )}

                {processingStatus && (
                   <div className={`p-3 rounded-md text-sm flex items-center gap-3 mt-2 ${
                    processingStatus.type === 'error' ? 'bg-red-50 text-red-800' :
                    processingStatus.type === 'success' ? 'bg-green-50 text-green-800' :
                    'bg-blue-50 text-blue-800'
                  }`}>
                    {processingStatus.type === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {processingStatus.type === 'error' && <AlertCircle className="h-4 w-4" />}
                    {processingStatus.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                    <span>{processingStatus.message}</span>
                  </div>
                )}


                {/* Recently Uploaded Files Table */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Your Files</h3>
                  {filesLoading ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading files...</span>
                    </div>
                  ) : (
                    <div className="rounded-lg border">
                      <div className="grid grid-cols-5 gap-4 p-4 font-medium text-sm border-b bg-muted/50">
                        <div>Name</div>
                        <div>Type</div>
                        <div>Size</div>
                        <div>Vector</div>
                        <div>Actions</div>
                      </div>
                      {recentFiles.length > 0 ? (
                        recentFiles.map((file) => (
                          <div key={file.id} className="grid grid-cols-5 gap-4 p-4 text-sm border-b hover:bg-muted/25">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <div className="text-muted-foreground">Text</div>
                            <div className="text-muted-foreground">
                              {file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(2)} KB` : 'N/A'}
                            </div>
                            <div className="flex items-center gap-1">
                              {processingFiles.has(file.name) ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              ) : completedFiles.has(file.name) ? (
                                <span className="text-green-600">✅</span>
                              ) : (
                                <span className="text-muted-foreground">Yes</span>
                              )}
                            </div>
                            <div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setFileToDelete(file)} 
                                disabled={isDeleting}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          No files uploaded yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* Info Section */}
            <Card className="mt-6">
              <CardContent className="py-6">
                <h3 className="font-semibold mb-3">What happens next?</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>1. Your file will be securely uploaded and processed</p>
                  <p>2. Our AI will analyze your conversation patterns</p>
                  <p>3. You&apos;ll receive a detailed relationship report</p>
                  <p>4. The analysis typically takes 2-5 minutes</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={!!fileToDelete} onOpenChange={(isOpen) => !isOpen && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file <span className="font-medium text-foreground">{fileToDelete?.name}</span> and all of its associated analysis data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFileToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}