"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Users, FileText, BarChart3, Settings, Shield, Activity, Search, Filter, Eye, Edit, UserCheck, UserX, Play, RefreshCw, AlertCircle, CheckCircle, Clock, FileCode, Terminal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import axios from 'axios'
import PromptManagementTab from '@/components/admin/PromptManagementTab'

export function AdminContent() {
  const [users, setUsers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [reportConfigs, setReportConfigs] = useState<any[]>([])
  const [slideConfigs, setSlideConfigs] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalReports: 0,
    totalSlides: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [reportFilter, setReportFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Test Final Report Integration
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [workflowProgress, setWorkflowProgress] = useState<any>(null)
  const [sessionHistory, setSessionHistory] = useState<any[]>([])
  const [totalQuestions, setTotalQuestions] = useState(40)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchUsers(),
        fetchReports(),
        fetchReportConfigs(),
        fetchSlideConfigs(),
        fetchStats()
      ])
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching users:', error)
      return
    }
    setUsers(data || [])
  }

  const fetchReports = async () => {
    const { data: sessionData, error } = await supabase
      .from('n8n_workflow_sessions')
      .select(`
        *,
        profiles:user_id(full_name, email)
      `)
      .order('started_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching reports:', error)
      return
    }
    setReports(sessionData || [])
  }

  const fetchReportConfigs = async () => {
    const { data, error } = await supabase
      .from('prompt_configs')
      .select(`
        *,
        profiles:user_id(full_name, email)
      `)
      .eq('prompt_type', 'report')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching report configs:', error)
      return
    }
    setReportConfigs(data || [])
  }

  const fetchSlideConfigs = async () => {
    const { data, error } = await supabase
      .from('prompt_configs')
      .select(`
        *,
        profiles:user_id(full_name, email)
      `)
      .eq('prompt_type', 'slide')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching slide configs:', error)
      return
    }
    setSlideConfigs(data || [])
  }

  const fetchStats = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', oneMonthAgo.toISOString())

      const { count: totalReports } = await supabase
        .from('prompt_configs')
        .select('*', { count: 'exact', head: true })
        .eq('prompt_type', 'report')

      const { count: totalSlides } = await supabase
        .from('prompt_configs')
        .select('*', { count: 'exact', head: true })
        .eq('prompt_type', 'slide')

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalReports: totalReports || 0,
        totalSlides: totalSlides || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  // Test Final Report Functions
  const handleGenerateTestReport = async () => {
    setTestLoading(true)
    setTestError(null)
    setTestResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setTestError('No active session for test report generation')
        return
      }

      const testSessionId = `admin-test-${Date.now()}`
      
      const response = await axios.post('/api/generate-Finalreport', {
        sessionId: testSessionId,
        totalQuestions: totalQuestions
      }, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        timeout: 90000
      })

      setTestResult(response.data)
      await fetchSessionHistory()
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message
      setTestError(errorMessage)
    } finally {
      setTestLoading(false)
    }
  }

  const fetchSessionHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No active session for history fetching')
        return
      }

      const response = await axios.get('/api/get-session-history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (response.data.success) {
        setSessionHistory(response.data.data.slice(0, 10)) // Show last 10
      }
    } catch (error) {
      console.error('Error fetching session history:', error)
    }
  }

  useEffect(() => {
    fetchSessionHistory()
  }, [])

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    
    if (error) {
      console.error('Error updating user role:', error)
      return false
    }
    
    await fetchUsers()
    return true
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId)
    
    if (error) {
      console.error('Error updating user status:', error)
      return false
    }
    
    await fetchUsers()
    return true
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = userFilter === 'all' || 
      (userFilter === 'admin' && user.role === 'admin') ||
      (userFilter === 'user' && user.role === 'user') ||
      (userFilter === 'active' && user.is_active !== false) ||
      (userFilter === 'inactive' && user.is_active === false)
    
    return matchesSearch && matchesFilter
  })

  const filteredReports = reports.filter(report => {
    const matchesFilter = reportFilter === 'all' || report.status === reportFilter
    return matchesFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    return role === 'admin' ?
      <Badge variant="destructive">Admin</Badge> :
      <Badge variant="outline">User</Badge>
  }

  // Format date helper
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month} ${day}, ${hours}:${minutes}`
  }

  // Download JSON
  const downloadJSON = (config: any, type: 'report' | 'slide') => {
    const fileName = `${type}-${config.name || 'untitled'}-${new Date().toISOString().split('T')[0]}.json`
    const jsonStr = JSON.stringify(config, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Delete config with confirmation
  const deleteConfig = async (configId: string, configName: string, type: 'report' | 'slide') => {
    if (!confirm(`Are you sure you want to delete "${configName}"?`)) {
      return
    }

    const { error } = await supabase
      .from('prompt_configs')
      .delete()
      .eq('id', configId)

    if (error) {
      console.error('Error deleting config:', error)
      alert('Failed to delete. Please try again.')
      return
    }

    // Show toast (简单实现)
    alert(`✓ Successfully deleted "${configName}"`)

    // Refresh data
    if (type === 'report') {
      await fetchReportConfigs()
      await fetchStats()
    } else {
      await fetchSlideConfigs()
      await fetchStats()
    }
  }

  // View All - jump to Dev Tools
  const viewAll = (type: 'report' | 'slide') => {
    setActiveTab('tools')
    // Dev Tools will auto-select the type via URL or prop (can be enhanced later)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          System administration and management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="tools">Dev Tools</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">All time registrations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalReports}</div>
                <p className="text-xs text-muted-foreground">Generated reports</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Slides</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSlides}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Recent Users - 20% width (1/5) */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.slice(0, 10).map((user) => (
                      <div key={user.id} className="pb-3 border-b last:border-0">
                        <p className="font-medium text-sm">{user.full_name || 'No Name'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <div className="flex gap-1 mt-1">
                          {getRoleBadge(user.role || 'user')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Reports - 40% width (2/5) */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Reports</CardTitle>
                <Button variant="link" size="sm" onClick={() => viewAll('report')}>
                  View All →
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : reportConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="mb-2">No reports yet</p>
                    <Button size="sm" onClick={() => setActiveTab('tools')}>
                      Create your first report
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reportConfigs.map((config) => (
                      <div key={config.id} className="pb-3 border-b last:border-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {config.name || config.report_topic || 'Untitled Report'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {config.profiles?.full_name || config.profiles?.email || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(config.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => window.location.href = `/admin/prompt-studio?id=${config.id}`}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => downloadJSON(config, 'report')}
                          >
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => deleteConfig(config.id, config.name || 'this report', 'report')}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Slides - 40% width (2/5) */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Slides</CardTitle>
                <Button variant="link" size="sm" onClick={() => viewAll('slide')}>
                  View All →
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : slideConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="mb-2">No slides yet</p>
                    <Button size="sm" onClick={() => setActiveTab('tools')}>
                      Create your first slide
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {slideConfigs.map((config) => (
                      <div key={config.id} className="pb-3 border-b last:border-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {config.name || 'Untitled Slide'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {config.profiles?.full_name || config.profiles?.email || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(config.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => window.location.href = `/admin/prompt-studio?id=${config.id}`}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => downloadJSON(config, 'slide')}
                          >
                            Download
                          </Button>
                          {config.manus_share_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => window.open(config.manus_share_url, '_blank')}
                            >
                              Manus
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => deleteConfig(config.id, config.name || 'this slide', 'slide')}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage all registered users ({filteredUsers.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="admin">Admins Only</SelectItem>
                    <SelectItem value="user">Regular Users</SelectItem>
                    <SelectItem value="active">Active Users</SelectItem>
                    <SelectItem value="inactive">Inactive Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse">Loading users...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium">{user.full_name || 'No Name'}</h3>
                          {getRoleBadge(user.role || 'user')}
                          {getStatusBadge(user.is_active === false ? 'inactive' : 'active')}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                          <span>Reports: {user.total_reports || 0}</span>
                          {user.updated_at && (
                            <span>Last active: {new Date(user.updated_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>User Details</DialogTitle>
                              <DialogDescription>
                                Detailed information for {user.full_name || user.email}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedUser && (
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label className="text-right font-medium">Name:</Label>
                                  <span className="col-span-3">{selectedUser.full_name || 'Not set'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label className="text-right font-medium">Email:</Label>
                                  <span className="col-span-3">{selectedUser.email}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label className="text-right font-medium">Role:</Label>
                                  <span className="col-span-3">{getRoleBadge(selectedUser.role || 'user')}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label className="text-right font-medium">Status:</Label>
                                  <span className="col-span-3">{getStatusBadge(selectedUser.is_active === false ? 'inactive' : 'active')}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label className="text-right font-medium">Age Range:</Label>
                                  <span className="col-span-3">{selectedUser.age_range || 'Not set'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label className="text-right font-medium">Relationship Stage:</Label>
                                  <span className="col-span-3">{selectedUser.relationship_stage || 'Not set'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label className="text-right font-medium">Total Reports:</Label>
                                  <span className="col-span-3">{selectedUser.total_reports || 0}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label className="text-right font-medium">Avg Sentiment:</Label>
                                  <span className="col-span-3">{selectedUser.avg_sentiment_score || 'N/A'}</span>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                              <DialogDescription>
                                Modify user role and status for {selectedUser?.full_name || selectedUser?.email}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedUser && (
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="role" className="text-right">Role:</Label>
                                  <Select defaultValue={selectedUser.role || 'user'} onValueChange={(value) => updateUserRole(selectedUser.id, value)}>
                                    <SelectTrigger className="col-span-3">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          variant={user.is_active === false ? "default" : "destructive"} 
                          size="sm"
                          onClick={() => toggleUserStatus(user.id, user.is_active !== false)}
                        >
                          {user.is_active === false ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found matching your criteria
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dev Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <PromptManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}