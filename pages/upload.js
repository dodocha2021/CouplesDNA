import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'
import TableUpload from '../components/file-uploader'
import FileReportList from '../components/file-report-list'
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

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
    const initializePage = async () => {
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


  const handleBackToQuestionnaire = () => {
    router.push('/questionnaire')
  }

  const handleGenerateReport = async (selectedFiles) => {
    console.log('Generating report for files:', selectedFiles)
    // TODO: Implement API call for report generation
    alert(`Generating report for ${selectedFiles.length} files...`)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto py-12">
          <div className="max-w-6xl mx-auto">
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

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Select Chat Log File</CardTitle>
                  <CardDescription>Supports: .txt, .csv, .json, .pdf, .docx, .md, .xml, .html (max 5MB)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TableUpload onFilesChange={handleFilesReady} className="w-full" maxFiles={10} accept=".txt,.csv,.json,.pdf,.docx,.md,.xml,.html" maxSize={5 * 1024 * 1024} simulateUpload={false} />
                  
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
                </CardContent>
              </Card>

              {/* File Report Selection */}
              <FileReportList 
                onGenerateReport={handleGenerateReport}
                title="Generate Analysis Report"
                showHeader={true}
              />
            </div>


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

    </>
  )
}