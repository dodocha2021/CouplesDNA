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
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { User, Bell, Shield, Lock, Mail, CreditCard, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const RELATIONSHIP_STATUS_OPTIONS = [
  "In a relationship",
  "Married / Long-term partnership",
  "Post-breakup / Divorce recovery",
  "It's complicated (Casual / Long-distance / Other)",
]

const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
]

const AGE_RANGE_OPTIONS = [
  "18-24",
  "25-29",
  "30-34",
  "35-39",
  "40+",
]

const RELATIONSHIP_DURATION_OPTIONS = [
  "Less than 3 months",
  "3-12 months",
  "1-3 years",
  "3-5 years",
  "5+ years",
]

const CONSULTATION_FOCUS_OPTIONS = [
  "Communication skills",
  "Emotional connection & intimacy",
  "Conflict resolution",
  "Trust & security",
  "Personal growth & independence",
  "Future planning (Marriage / Children)",
  "Breakup / Heartbreak healing",
  "Self-awareness & relationship patterns",
]

export function SettingsContent() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)

  // Profile questionnaire form data
  const [questionnaireData, setQuestionnaireData] = useState({
    relationshipStatus: '',
    gender: '',
    ageRange: '',
    relationshipDuration: '',
    consultationFocus: [],
    primaryChallenge: ''
  })
  
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

        // Load questionnaire data
        setQuestionnaireData({
          relationshipStatus: profileData.relationship_status || '',
          gender: profileData.gender || '',
          ageRange: profileData.age_range || '',
          relationshipDuration: profileData.relationship_duration || '',
          consultationFocus: profileData.consultation_focus || [],
          primaryChallenge: profileData.primary_challenge || ''
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

  const saveQuestionnaire = async () => {
    if (!user) return

    // Validation
    if (!questionnaireData.relationshipStatus) {
      setSaveStatus({
        type: 'error',
        message: 'Please select your relationship status'
      })
      return
    }

    if (!questionnaireData.gender) {
      setSaveStatus({
        type: 'error',
        message: 'Please select your gender'
      })
      return
    }

    if (!questionnaireData.ageRange) {
      setSaveStatus({
        type: 'error',
        message: 'Please select your age range'
      })
      return
    }

    if (questionnaireData.consultationFocus.length === 0) {
      setSaveStatus({
        type: 'error',
        message: 'Please select at least 1 topic of interest'
      })
      return
    }

    if (questionnaireData.consultationFocus.length > 3) {
      setSaveStatus({
        type: 'error',
        message: 'Please select no more than 3 topics'
      })
      return
    }

    try {
      setSaving(true)
      setSaveStatus(null)

      const { error } = await supabase
        .from('profiles')
        .update({
          relationship_status: questionnaireData.relationshipStatus,
          gender: questionnaireData.gender,
          age_range: questionnaireData.ageRange,
          relationship_duration: questionnaireData.relationshipDuration || null,
          consultation_focus: questionnaireData.consultationFocus,
          primary_challenge: questionnaireData.primaryChallenge || null,
          profile_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setSaveStatus({
        type: 'success',
        message: 'Profile updated successfully!'
      })

      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('Error saving questionnaire:', error)
      setSaveStatus({
        type: 'error',
        message: 'Failed to save profile. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFocus = (option: string) => {
    setQuestionnaireData(prev => {
      const current = prev.consultationFocus
      if (current.includes(option)) {
        return { ...prev, consultationFocus: current.filter(f => f !== option) }
      } else {
        if (current.length >= 3) {
          return prev // Don't add if already 3 selected
        }
        return { ...prev, consultationFocus: [...current, option] }
      }
    })
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
          <Card>
            <CardHeader>
              <CardTitle>Personal Profile Questionnaire</CardTitle>
              <CardDescription>
                Information helps us provide personalized insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Relationship Status */}
                <div className="space-y-2">
                  <Label htmlFor="relationshipStatus">
                    Relationship Status <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={questionnaireData.relationshipStatus}
                    onValueChange={(value) => setQuestionnaireData(prev => ({ ...prev, relationshipStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender">
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={questionnaireData.gender}
                    onValueChange={(value) => setQuestionnaireData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Age Range */}
                <div className="space-y-2">
                  <Label htmlFor="ageRange">
                    Age Range <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={questionnaireData.ageRange}
                    onValueChange={(value) => setQuestionnaireData(prev => ({ ...prev, ageRange: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RANGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Relationship Duration */}
                <div className="space-y-2">
                  <Label htmlFor="relationshipDuration">
                    Relationship Duration
                  </Label>
                  <Select
                    value={questionnaireData.relationshipDuration}
                    onValueChange={(value) => setQuestionnaireData(prev => ({ ...prev, relationshipDuration: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_DURATION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Topics of Interest */}
              <div className="space-y-3">
                <Label>
                  Topics of Interest (Select 1-3) <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CONSULTATION_FOCUS_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        questionnaireData.consultationFocus.includes(option)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${
                        questionnaireData.consultationFocus.length >= 3 && !questionnaireData.consultationFocus.includes(option)
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <Checkbox
                        checked={questionnaireData.consultationFocus.includes(option)}
                        onCheckedChange={() => handleToggleFocus(option)}
                        disabled={questionnaireData.consultationFocus.length >= 3 && !questionnaireData.consultationFocus.includes(option)}
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {questionnaireData.consultationFocus.length}/3
                </p>
              </div>

              {/* Primary Challenge */}
              <div className="space-y-2">
                <Label htmlFor="primaryChallenge">
                  Main Challenge (Optional)
                </Label>
                <Textarea
                  id="primaryChallenge"
                  placeholder="e.g., We always argue about small things, I don't know how to express my needs..."
                  value={questionnaireData.primaryChallenge}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setQuestionnaireData(prev => ({ ...prev, primaryChallenge: e.target.value }))
                    }
                  }}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {questionnaireData.primaryChallenge.length}/200 characters
                </p>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-4 pt-4">
                <Button
                  onClick={saveQuestionnaire}
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
  )
}