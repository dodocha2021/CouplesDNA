"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Bell, Shield, Lock, Mail, CreditCard, Plus, Trash2, CheckCircle2, AlertCircle, Edit } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FirstLoginOnboardingDialog } from '@/components/onboarding/FirstLoginOnboardingDialog'

export function SettingsContent() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingData, setOnboardingData] = useState(null)
  
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    ageRange: '',
    relationshipStage: '',
    phone: '',
    timezone: 'UTC-8'
  })

  const [notifications, setNotifications] = useState({
    emailReports: true,
    weeklyInsights: true,
    chatReminders: false,
    marketingEmails: false
  })

  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return
      
      setUser(currentUser)

      // Load profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (profileData) {
        setProfile({
          fullName: profileData.full_name || '',
          email: currentUser.email || '',
          ageRange: profileData.age_range || '',
          relationshipStage: profileData.relationship_stage || '',
          phone: profileData.phone || '',
          timezone: profileData.timezone || 'UTC-8'
        })

        // Load notification preferences (if you have them in the database)
        setNotifications({
          emailReports: profileData.email_reports ?? true,
          weeklyInsights: profileData.weekly_insights ?? true,
          chatReminders: profileData.chat_reminders ?? false,
          marketingEmails: profileData.marketing_emails ?? false
        })

        // Load onboarding questionnaire data
        setOnboardingData({
          relationshipStatus: profileData.relationship_status || '',
          gender: profileData.gender || '',
          ageRange: profileData.age_range || '',
          relationshipDuration: profileData.relationship_duration || '',
          consultationFocus: profileData.consultation_focus || [],
          primaryChallenge: profileData.primary_challenge || '',
          profileCompleted: profileData.profile_completed || false
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setSaveStatus({
        type: 'error',
        message: 'Failed to load user data'
      })
    } finally {
      setLoading(false)
    }
  }

  const savePersonalInfo = async () => {
    if (!user) return

    try {
      setSaving(true)
      setSaveStatus(null)

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.fullName,
          phone: profile.phone,
          timezone: profile.timezone,
          age_range: profile.ageRange,
          relationship_stage: profile.relationshipStage,
          email_reports: notifications.emailReports,
          weekly_insights: notifications.weeklyInsights,
          chat_reminders: notifications.chatReminders,
          marketing_emails: notifications.marketingEmails,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setSaveStatus({
        type: 'success',
        message: 'Personal information updated successfully!'
      })

      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('Error saving personal info:', error)
      setSaveStatus({
        type: 'error',
        message: 'Failed to save changes. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const saveProfile = async () => {
    if (!user) return

    try {
      setSaving(true)
      setSaveStatus(null)

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          age_range: profile.ageRange,
          relationship_stage: profile.relationshipStage,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setSaveStatus({
        type: 'success',
        message: 'Profile updated successfully!'
      })

      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
      setSaveStatus({
        type: 'error',
        message: 'Failed to save profile. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const saveNotifications = async () => {
    if (!user) return

    try {
      setSaving(true)
      setSaveStatus(null)

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email_reports: notifications.emailReports,
          weekly_insights: notifications.weeklyInsights,
          chat_reminders: notifications.chatReminders,
          marketing_emails: notifications.marketingEmails,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setSaveStatus({
        type: 'success',
        message: 'Notification preferences saved successfully!'
      })

      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('Error saving notifications:', error)
      setSaveStatus({
        type: 'error',
        message: 'Failed to save notification preferences. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const updatePassword = async () => {
    if (!password.newPassword || !password.confirmPassword) {
      setSaveStatus({
        type: 'error',
        message: 'Please fill in all password fields'
      })
      return
    }

    if (password.newPassword !== password.confirmPassword) {
      setSaveStatus({
        type: 'error',
        message: 'New passwords do not match'
      })
      return
    }

    if (password.newPassword.length < 6) {
      setSaveStatus({
        type: 'error',
        message: 'Password must be at least 6 characters long'
      })
      return
    }

    try {
      setSaving(true)
      setSaveStatus(null)

      const { error } = await supabase.auth.updateUser({
        password: password.newPassword
      })

      if (error) throw error

      setSaveStatus({
        type: 'success',
        message: 'Password updated successfully!'
      })

      setPassword({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('Error updating password:', error)
      setSaveStatus({
        type: 'error',
        message: error.message || 'Failed to update password. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    // Reload user data to reflect changes
    loadUserData()
  }

  const deleteAccount = async () => {
    if (!user) return

    const confirmDelete = window.confirm(
      '确定要删除您的账户吗？此操作无法撤销，所有数据将永久丢失。'
    )

    if (!confirmDelete) return

    try {
      setSaving(true)
      setSaveStatus(null)

      // Call our secure delete API
      const response = await fetch('/api/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account')
      }

      // Redirect to home page after successful deletion
      window.location.href = '/'
      
    } catch (error) {
      console.error('Error deleting account:', error)
      setSaveStatus({
        type: 'error',
        message: error.message || 'Failed to delete account. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      {/* Onboarding Dialog */}
      <FirstLoginOnboardingDialog
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="my-details" className="space-y-8">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="my-details">My details</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="danger" className="text-red-600">Danger Zone</TabsTrigger>
        </TabsList>

        {/* My Details Tab */}
        <TabsContent value="my-details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and account information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={profile.timezone} onValueChange={(value) => setProfile(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="UTC-7">Mountain Time (UTC-7)</SelectItem>
                      <SelectItem value="UTC-6">Central Time (UTC-6)</SelectItem>
                      <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="UTC+0">GMT (UTC+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={savePersonalInfo} 
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                {saveStatus && (
                  <div className={`flex items-center gap-2 text-sm ${
                    saveStatus.type === 'error' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {saveStatus.type === 'error' ? 
                      <AlertCircle className="h-4 w-4" /> : 
                      <CheckCircle2 className="h-4 w-4" />
                    }
                    {saveStatus.message}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Onboarding Questionnaire Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personal Profile Questionnaire</CardTitle>
                  <CardDescription>
                    Information from your initial questionnaire helps us provide personalized insights.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOnboarding(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {onboardingData?.profileCompleted ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Relationship Status</p>
                    <p className="font-medium">{onboardingData.relationshipStatus || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Gender</p>
                    <p className="font-medium">{onboardingData.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Age Range</p>
                    <p className="font-medium">{onboardingData.ageRange || 'Not specified'}</p>
                  </div>
                  {onboardingData.relationshipDuration && (
                    <div>
                      <p className="text-muted-foreground mb-1">Relationship Duration</p>
                      <p className="font-medium">{onboardingData.relationshipDuration}</p>
                    </div>
                  )}
                  {onboardingData.consultationFocus?.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-muted-foreground mb-1">Topics of Interest</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {onboardingData.consultationFocus.map((topic, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {onboardingData.primaryChallenge && (
                    <div className="md:col-span-2">
                      <p className="text-muted-foreground mb-1">Main Challenge</p>
                      <p className="font-medium text-sm italic">"{onboardingData.primaryChallenge}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">
                    You haven't completed your profile questionnaire yet.
                  </p>
                  <Button onClick={() => setShowOnboarding(true)}>
                    Complete Questionnaire
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Relationship Profile</CardTitle>
              <CardDescription>
                Help us provide more personalized insights by sharing information about your relationship.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ageRange">Age Range</Label>
                  <Select value={profile.ageRange} onValueChange={(value) => setProfile(prev => ({ ...prev, ageRange: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18-24">18-24</SelectItem>
                      <SelectItem value="25-34">25-34</SelectItem>
                      <SelectItem value="35-44">35-44</SelectItem>
                      <SelectItem value="45+">45+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationshipStage">Relationship Stage</Label>
                  <Select value={profile.relationshipStage} onValueChange={(value) => setProfile(prev => ({ ...prev, relationshipStage: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dating">Dating / Early Stage</SelectItem>
                      <SelectItem value="living-together">Long-term / Living Together</SelectItem>
                      <SelectItem value="married">Engaged / Married</SelectItem>
                      <SelectItem value="challenges">Facing Challenges / Seeking Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={saveProfile} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Update Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={password.currentPassword}
                    onChange={(e) => setPassword(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={password.newPassword}
                    onChange={(e) => setPassword(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={password.confirmPassword}
                    onChange={(e) => setPassword(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
              </div>
              <Button 
                onClick={updatePassword} 
                disabled={saving}
              >
                {saving ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>
                Manage your email preferences and communication settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Primary Email</Label>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                  <Button variant="outline" size="sm">Change Email</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Your email address is verified
                    </p>
                  </div>
                  <div className="text-sm text-green-600 font-medium">Verified ✓</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you&apos;d like to receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive analysis reports via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailReports}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailReports: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Insights</Label>
                    <p className="text-sm text-muted-foreground">
                      Get weekly relationship insights and tips
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyInsights}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weeklyInsights: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Chat Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Reminders to continue conversations
                    </p>
                  </div>
                  <Switch
                    checked={notifications.chatReminders}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, chatReminders: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Product updates and promotional content
                    </p>
                  </div>
                  <Switch
                    checked={notifications.marketingEmails}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketingEmails: checked }))}
                  />
                </div>
              </div>
              <Button 
                onClick={saveNotifications} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                These actions cannot be undone. Please proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start space-x-4">
                  <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-red-800">Delete Account</h4>
                      <p className="text-sm text-red-700">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={deleteAccount}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {saving ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  )
}