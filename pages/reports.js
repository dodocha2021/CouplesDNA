import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'
import FileReportList from '../components/file-report-list'

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    initializePage();
  }, [router])

  const handleGenerateReport = async (selectedFiles) => {
    console.log('Generating report for files:', selectedFiles)
    // TODO: Implement API call for report generation
    alert(`Generating report for ${selectedFiles.length} files...`)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Analysis Reports
            </h1>
            <p className="text-lg text-gray-600">
              Select your chat files to generate comprehensive relationship insights.
            </p>
          </div>

          {/* File Selection Component */}
          <FileReportList 
            onGenerateReport={handleGenerateReport}
            title="Your Chat Files"
            showHeader={true}
          />
        </div>
      </div>
    </div>
  )
}