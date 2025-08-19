import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'

export default function UploadPage() {
  const router = useRouter()
  const { questionnaireComplete, sessionId } = router.query
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

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

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Check file type and size
      const allowedTypes = ['.txt', '.csv', '.json']
      const maxSize = 10 * 1024 * 1024 // 10MB
      
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
      
      if (!allowedTypes.includes(fileExtension)) {
        setUploadStatus({
          type: 'error',
          message: 'Please select a valid file type (.txt, .csv, or .json)'
        })
        return
      }
      
      if (file.size > maxSize) {
        setUploadStatus({
          type: 'error',
          message: 'File size must be less than 10MB'
        })
        return
      }
      
      setSelectedFile(file)
      setUploadStatus(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

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
          message: 'File uploaded successfully! Generating your report...'
        })

        // Generate a session ID for the report  
        const newSessionId = Date.now().toString()
        
        // Redirect to report generation with secure file path
        setTimeout(() => {
          router.push(`/report/${newSessionId}?file=${encodeURIComponent(result.fileName)}&filePath=${encodeURIComponent(result.filePath)}`)
        }, 2000)
        
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({
        type: 'error',
        message: error.message || 'Upload failed. Please try again.'
      })
    } finally {
      setUploading(false)
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
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  Questionnaire completed! Your analysis will be personalized.
                </span>
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
                Supported formats: .txt, .csv, .json (max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Input */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".txt,.csv,.json"
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-gray-500">
                    Choose a file or drag and drop
                  </p>
                </div>
              </div>

              {/* Selected File Info */}
              {selectedFile && (
                <Card className="bg-gray-50">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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

              {/* Upload Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex-1"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <LoadingSpinner />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload & Analyze
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  size="lg"
                >
                  Cancel
                </Button>
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
  )
}