"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, TrendingUp, Download } from 'lucide-react'
import axios from 'axios'
import { supabase } from '../../lib/supabase'

export const MyReportsContent = React.memo(function MyReportsContent() {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      // 获取当前用户和访问令牌
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('User not authenticated')
        setReports([])
        setLoading(false)
        return
      }

      // 使用访问令牌调用 API
      const response = await axios.get('/api/get-reports', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.data.success) {
        setReports(response.data.data)
      } else {
        console.error('Failed to fetch reports:', response.data.error)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      if (error.response?.status === 401) {
        console.error('User not authenticated')
        // Could redirect to login page here
      }
    } finally {
      setLoading(false)
    }
  }

  // Sort reports by date (newest first)
  const sortedReports = reports.sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
      case 'processing':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleViewReport = (report) => {
    if (report.session_id) {
      router.push(`/report/${report.session_id}`)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Reports</h1>
        <p className="text-muted-foreground">
          View and manage all your relationship analysis reports
        </p>
      </div>

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.filter(r => r.status === 'completed').length}</div>
              <p className="text-xs text-muted-foreground">Successful reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.filter(r => r.sentiment_score).length > 0 
                  ? Math.round(reports.filter(r => r.sentiment_score).reduce((acc, r) => acc + r.sentiment_score!, 0) / reports.filter(r => r.sentiment_score).length * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Positivity score</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>All Reports</CardTitle>
            <CardDescription>Complete history of your relationship analysis reports</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Table Header */}
            <div className="rounded-lg border">
              <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 font-medium text-sm border-b">
                <div>Report Title</div>
                <div>Date</div>
                <div>Status</div>
                <div>Sentiment Score</div>
                <div>Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {sortedReports.map((report) => (
                  <div
                    key={report.id}
                    className="reports-row grid grid-cols-5 gap-4 p-4 rounded-lg"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{report.title}</span>
                      <span className="text-sm text-muted-foreground">{report.communication_style || 'Processing...'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center">
                      {getStatusBadge(report.status)}
                    </div>
                    <div className="flex items-center">
                      {report.sentiment_score ? (
                        <span className={`font-medium ${
                          report.sentiment_score >= 0.8 ? 'text-green-600' :
                          report.sentiment_score >= 0.6 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {Math.round(report.sentiment_score * 100)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === 'completed' && (
                        <>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                          <Button size="sm" onClick={() => handleViewReport(report)}>
                            View
                          </Button>
                        </>
                      )}
                      {report.status === 'processing' && (
                        <div className="text-sm text-muted-foreground">Processing...</div>
                      )}
                      {report.status === 'failed' && (
                        <Button variant="outline" size="sm">
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {sortedReports.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    No reports generated yet
                  </p>
                  <Button className="mt-4">Generate Your First Report</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})