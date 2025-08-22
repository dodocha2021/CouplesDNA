"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, TrendingUp, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export const MyReportsContent = React.memo(function MyReportsContent() {
  const router = useRouter()
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('User not authenticated');

        // 2. Get all records for this user from workflow_progress table
        const { data, error } = await supabase
          .from('workflow_progress')
          .select('session_id, workflow_type, status, current_step, total_steps, started_at, completed_at') // Select required fields
          .eq('user_id', user.id) // 关键：按当前 user_id 筛选
          .order('started_at', { ascending: false }) // 按开始时间降序排序

        if (error) throw error

        // 3. 更新组件状态
        setReports(data || []) // 将获取到的报告存入 state

      } catch (err) {
        console.error("获取报告失败:", err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchReports();
  }, [])

  // Sort reports by date (newest first)
  const sortedReports = reports.sort((a, b) => {
    return new Date(b.started_at) - new Date(a.started_at)
  })

  // 计算统计数据
  const totalReports = reports.length
  const completedReports = reports.filter(report => report.status === 'completed').length

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
      router.push(`/test-finalreport/${report.session_id}?completed=true`)
    }
  }

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // 2. Get all records for this user from workflow_progress table
      const { data, error } = await supabase
        .from('workflow_progress')
        .select('session_id, workflow_type, status, current_step, total_steps, started_at, completed_at') // Select required fields
        .eq('user_id', user.id) // 关键：按当前 user_id 筛选
        .order('started_at', { ascending: false }) // 按开始时间降序排序

      if (error) throw error

      // 3. 更新组件状态
      setReports(data || []) // 将获取到的报告存入 state

    } catch (err) {
      console.error("获取报告失败:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
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

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2">
            Error loading reports: {error}
          </p>
          <Button onClick={fetchReports} className="mt-4">Try Again</Button>
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
              <div className="text-2xl font-bold">{totalReports}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedReports}</div>
              <p className="text-xs text-muted-foreground">Successful reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.filter(report => report.status === 'processing').length}
              </div>
              <p className="text-xs text-muted-foreground">In progress</p>
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
                <div>Session ID</div>
                <div>Created Date</div>
                <div>Status</div>
                <div>Progress</div>
                <div>Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {sortedReports.map((report) => (
                  <div
                    key={report.session_id}
                    className="reports-row grid grid-cols-5 gap-4 p-4 rounded-lg"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{report.session_id}</span>
                      <span className="text-sm text-muted-foreground">Report Session</span>
                    </div>
                    <div className="flex items-center text-sm">
                      {new Date(report.started_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center">
                      {getStatusBadge(report.status)}
                    </div>
                    <div className="flex items-center">
                      {report.total_steps && report.current_step ? (
                        <span className="text-sm">
                          {report.current_step}/{report.total_steps}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === 'completed' && (
                        <>
                          <Link
                            href={`/test-finalreport/${report.session_id}?completed=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            passHref
                          >
                            <Button size="sm">
                              View
                            </Button>
                          </Link>
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

export default MyReportsContent