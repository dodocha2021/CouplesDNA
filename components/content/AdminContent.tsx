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
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalReports: 0,
    reportsThisWeek: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [reportFilter, setReportFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  
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
        .from('n8n_workflow_sessions')
        .select('*', { count: 'exact', head: true })
      
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const { count: reportsThisWeek } = await supabase
        .from('n8n_workflow_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', oneWeekAgo.toISOString())
      
      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalReports: totalReports || 0,
        reportsThisWeek: reportsThisWeek || 0
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          System administration and management
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
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
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.reportsThisWeek}</div>
                <p className="text-xs text-muted-foreground">New reports</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.full_name || 'No Name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(user.role || 'user')}
                          {getStatusBadge(user.is_active === false ? 'inactive' : 'active')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.slice(0, 5).map((report) => (
                      <div key={report.session_id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Report #{report.session_id.slice(-8)}</p>
                          <p className="text-sm text-muted-foreground">
                            by {report.profiles?.full_name || report.profiles?.email || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(report.status || 'processing')}
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

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reports Management</CardTitle>
              <CardDescription>View and manage all system reports ({filteredReports.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter Controls */}
              <div className="flex gap-4 mb-6">
                <Select value={reportFilter} onValueChange={setReportFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reports</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="error">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse">Loading reports...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <div key={report.session_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium">Report #{report.session_id.slice(-8)}</h3>
                          {getStatusBadge(report.status || 'processing')}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          User: {report.profiles?.full_name || report.profiles?.email || 'Unknown'}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>Started: {new Date(report.started_at).toLocaleDateString()}</span>
                          <span>Progress: {report.current_step || 0}/{report.total_steps || 0}</span>
                          {report.completed_at && (
                            <span>Completed: {new Date(report.completed_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/test-finalreport/${report.session_id}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/report/${report.session_id}`, '_blank')}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredReports.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No reports found matching your criteria
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Online</div>
                <p className="text-xs text-muted-foreground">All connections active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">67%</div>
                <p className="text-xs text-muted-foreground">Of allocated space</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Health</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Healthy</div>
                <p className="text-xs text-muted-foreground">All endpoints responsive</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>Configure system-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Authentication Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Session Timeout:</span>
                      <span className="text-muted-foreground">7 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Password Requirements:</span>
                      <span className="text-muted-foreground">Standard</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Two-Factor Auth:</span>
                      <span className="text-muted-foreground">Disabled</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Report Generation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Max Queue Size:</span>
                      <span className="text-muted-foreground">50</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeout Duration:</span>
                      <span className="text-muted-foreground">10 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI Model Version:</span>
                      <span className="text-muted-foreground">GPT-4</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <h4 className="font-medium mb-3">System Maintenance</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Clear Cache</Button>
                  <Button variant="outline" size="sm">Rebuild Index</Button>
                  <Button variant="outline" size="sm">Export Logs</Button>
                  <Button variant="destructive" size="sm">Maintenance Mode</Button>
                </div>
              </div>
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