"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Calendar, TrendingUp, Download, Search, Filter, SortAsc, SortDesc } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

export const MyReportsContent = React.memo(function MyReportsContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // For now, we'll use placeholder data until the reports table is created
        // TODO: Replace with actual database query when reports table exists
        const placeholderReports = [
          {
            id: '1',
            title: 'Weekly Communication Analysis',
            created_at: '2024-01-15T10:30:00Z',
            status: 'completed',
            sentiment_score: 0.85,
            report_type: 'upload',
            communication_style: 'Constructive',
            user_id: user.id
          },
          {
            id: '2', 
            title: 'Chat Log Analysis - Morning Conversation',
            created_at: '2024-01-12T08:15:00Z',
            status: 'completed',
            sentiment_score: 0.72,
            report_type: 'upload',
            communication_style: 'Supportive',
            user_id: user.id
          },
          {
            id: '3',
            title: 'Relationship Health Check',
            created_at: '2024-01-08T14:20:00Z',
            status: 'processing',
            sentiment_score: null,
            report_type: 'upload',
            communication_style: null,
            user_id: user.id
          },
          {
            id: '4',
            title: 'Evening Chat Analysis',
            created_at: '2024-01-05T19:45:00Z',
            status: 'completed',
            sentiment_score: 0.91,
            report_type: 'upload',
            communication_style: 'Empathetic',
            user_id: user.id
          },
          {
            id: '5',
            title: 'Weekend Discussion Analysis',
            created_at: '2024-01-03T11:30:00Z',
            status: 'failed',
            sentiment_score: null,
            report_type: 'upload',
            communication_style: null,
            user_id: user.id
          }
        ]
        setReports(placeholderReports)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  // Advanced filtering logic
  const filteredReports = reports.filter(report => {
    // Text search filter
    const matchesSearch = !searchTerm || (
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.communication_style && report.communication_style.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Status filter
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter

    // Sentiment filter
    const matchesSentiment = sentimentFilter === 'all' || (
      (sentimentFilter === 'positive' && report.sentiment_score && report.sentiment_score >= 0.7) ||
      (sentimentFilter === 'neutral' && report.sentiment_score && report.sentiment_score >= 0.4 && report.sentiment_score < 0.7) ||
      (sentimentFilter === 'negative' && report.sentiment_score && report.sentiment_score < 0.4) ||
      (sentimentFilter === 'unknown' && !report.sentiment_score)
    )

    return matchesSearch && matchesStatus && matchesSentiment
  }).sort((a, b) => {
    let aVal, bVal
    
    switch (sortBy) {
      case 'title':
        aVal = a.title.toLowerCase()
        bVal = b.title.toLowerCase()
        break
      case 'date':
        aVal = new Date(a.created_at)
        bVal = new Date(b.created_at)
        break
      case 'sentiment':
        aVal = a.sentiment_score || 0
        bVal = b.sentiment_score || 0
        break
      case 'status':
        aVal = a.status
        bVal = b.status
        break
      default:
        return 0
    }

    if (sortOrder === 'desc') {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
    } else {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    }
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
            <div className="flex flex-col gap-4 pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiment</SelectItem>
                    <SelectItem value="positive">Positive (70%+)</SelectItem>
                    <SelectItem value="neutral">Neutral (40-70%)</SelectItem>
                    <SelectItem value="negative">Negative (&lt;40%)</SelectItem>
                    <SelectItem value="unknown">No Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Sort by:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="sentiment">Sentiment</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? 
                      <SortAsc className="h-4 w-4" /> : 
                      <SortDesc className="h-4 w-4" />
                    }
                  </Button>
                </div>
                <div className="ml-auto text-sm text-muted-foreground">
                  Showing {filteredReports.length} of {reports.length} reports
                </div>
              </div>
            </div>
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
                {filteredReports.map((report) => (
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
                          <Button size="sm">
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

              {filteredReports.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    {searchTerm ? 'No reports match your search' : 'No reports generated yet'}
                  </p>
                  {!searchTerm && (
                    <Button className="mt-4">Generate Your First Report</Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})