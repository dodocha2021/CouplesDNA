import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'
import TableUpload from '../components/file-uploader'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'

export default function UploadPage() {
  const router = useRouter()
  const { questionnaireComplete, sessionId } = router.query
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [processingStatus, setProcessingStatus] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser(session.user)
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilesReady = (files) => {
    // Transform files to match expected format
    const transformedFiles = files.map((file, index) => ({
      id: `file-${index}`,
      file: file
    }))
    setSelectedFiles(transformedFiles)
    setUploadStatus(null)
  }

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const selectedFile = selectedFiles[0].file // Use the first file for upload

    try {
      setUploading(true)
      setUploadStatus({
        type: 'loading',
        message: 'Uploading your file...'
      })

      const formData = new FormData()
      formData.append('file', selectedFile)

      // Get the current user session for authentication (optional)
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers = {}
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: headers,
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setUploadStatus({
          type: 'success',
          message: 'File uploaded successfully! Processing for vector analysis...'
        })

        // Check if the file processing might fail (show processing status)
        setProcessingStatus({
          type: 'processing',
          message: 'Analyzing file content and generating vectors... This may take a moment.',
          filePath: result.filePath
        })

        // Check processing status after a delay
        setTimeout(() => {
          checkProcessingStatus(result.filePath)
        }, 10000) // Check after 10 seconds

        // Generate a session ID for the report  
        const newSessionId = Date.now().toString()
        
        // Redirect to report generation with secure file path
        setTimeout(() => {
          router.push(`/report/${newSessionId}?file=${encodeURIComponent(result.fileName)}&filePath=${encodeURIComponent(result.filePath)}`)
        }, 3000) // Extended to 3 seconds to allow processing status to show
        
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({
        type: 'error',
        message: error.message || 'Upload failed. Please try again.'
      })
      setProcessingStatus(null) // Clear processing status on error
    } finally {
      setUploading(false)
    }
  }

  const checkProcessingStatus = async (filePath) => {
    try {
      // Check if documents were created for this file path
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('metadata->>source_file_path', filePath)
        .limit(1)

      if (error) {
        console.error('Error checking processing status:', error)
        setProcessingStatus({
          type: 'error',
          message: 'Processing verification failed. The file might be too large or invalid.',
          showRetry: true
        })
        return
      }

      if (data && data.length > 0) {
        // Processing successful
        setProcessingStatus({
          type: 'success',
          message: 'File successfully processed and vectorized!'
        })
      } else {
        // No documents found - processing likely failed
        setProcessingStatus({
          type: 'error',
          message: 'File processing failed or timed out.',
          showRetry: true
        })
      }
    } catch (error) {
      console.error('Processing status check error:', error)
      setProcessingStatus({
        type: 'error',
        message: 'Processing verification failed.',
        showRetry: true
      })
    }
  }

  const handleBackToQuestionnaire = () => {
    router.push('/questionnaire')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
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
                      // Clear questionnaire answers from profiles table
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
                      // Redirect to first question
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
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Select Chat Log File
              </CardTitle>
              <CardDescription>
                Supported formats: .txt, .csv, .json (max 3MB - optimized chunking)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <TableUpload
                onFilesChange={handleFilesReady}
                className="w-full"
                maxFiles={5}
                accept=".txt,.csv,.json"
                maxSize={3 * 1024 * 1024} // 3MB
                simulateUpload={false}
              />

              {/* Status Messages */}
              {uploadStatus && (
                <Card className={`${
                  uploadStatus.type === 'error' ? 'border-red-200 bg-red-50' :
                  uploadStatus.type === 'success' ? 'border-green-200 bg-green-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      {uploadStatus.type === 'loading' && <LoadingSpinner />}
                      {uploadStatus.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                      {uploadStatus.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                      <span className={`${
                        uploadStatus.type === 'error' ? 'text-red-800' :
                        uploadStatus.type === 'success' ? 'text-green-800' :
                        'text-blue-800'
                      }`}>
                        {uploadStatus.message}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Processing Status Messages */}
              {processingStatus && (
                <Card className={`mt-3 ${
                  processingStatus.type === 'error' ? 'border-red-200 bg-red-50' :
                  processingStatus.type === 'success' ? 'border-green-200 bg-green-50' :
                  processingStatus.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      {processingStatus.type === 'processing' && <LoadingSpinner />}
                      {processingStatus.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                      {processingStatus.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />}
                      {processingStatus.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />}
                      <div className="flex-1">
                        <span className={`${
                          processingStatus.type === 'error' ? 'text-red-800' :
                          processingStatus.type === 'success' ? 'text-green-800' :
                          processingStatus.type === 'warning' ? 'text-yellow-800' :
                          'text-blue-800'
                        } block`}>
                          {processingStatus.message}
                        </span>
                        {processingStatus.type === 'error' && processingStatus.showRetry && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => {
                                setProcessingStatus(null)
                                setUploadStatus(null)
                                setSelectedFiles([])
                              }}
                              className="inline-flex items-center gap-1 text-sm bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Retry with smaller file
                            </button>
                            <span className="text-xs text-red-600">
                              ⚠️ Try files under 2MB for optimal processing
                            </span>
                          </div>
                        )}
                        {processingStatus.type === 'warning' && (
                          <p className="text-sm text-yellow-700 mt-1">
                            The file was uploaded but may not be processed for vector analysis. You can still proceed to generate a report.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
  )
}