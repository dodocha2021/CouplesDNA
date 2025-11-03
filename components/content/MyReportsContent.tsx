"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label'
import {
  FileText,
  Calendar,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Maximize2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '@/hooks/use-toast'

export const MyReportsContent = React.memo(function MyReportsContent() {
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Generate Dialog State
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [userUploads, setUserUploads] = useState([])
  const [systemSettings, setSystemSettings] = useState([])
  const [selectedUploadId, setSelectedUploadId] = useState('')
  const [selectedSettingName, setSelectedSettingName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Slide Preview State
  const [selectedReport, setSelectedReport] = useState(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [slideScale, setSlideScale] = useState(1)
  const slideContainerRef = React.useRef(null)

  const { toast } = useToast()

  // Fetch reports
  const fetchReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setReports(data || [])
    } catch (err) {
      console.error("Failed to fetch reports:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch user uploads for generate dialog
  const fetchUserUploads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_uploads')
        .select('id, file_name, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUserUploads(data || [])
    } catch (err) {
      console.error("Failed to fetch user uploads:", err)
    }
  }

  // Fetch system settings for generate dialog
  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_configs')
        .select('id, setting_name')
        .eq('is_system_default', true)
        .not('setting_name', 'is', null)
        .order('setting_name', { ascending: true })

      if (error) throw error
      setSystemSettings(data || [])
    } catch (err) {
      console.error("Failed to fetch system settings:", err)
    }
  }

  // Initial load
  useEffect(() => {
    fetchReports()
  }, [])

  // Calculate slide scale for responsive display
  useEffect(() => {
    const calculateScale = () => {
      if (slideContainerRef.current) {
        const containerWidth = slideContainerRef.current.offsetWidth
        const slideWidth = 1280 // Manus slide width
        const scale = containerWidth / slideWidth
        setSlideScale(Math.min(scale, 1)) // Don't scale up, only down
      }
    }

    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [selectedReport])

  // Realtime subscription for status updates
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel('user_reports_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_reports',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Realtime update received:', payload)
            setReports(prevReports =>
              prevReports.map(report =>
                report.id === payload.new.id ? payload.new : report
              )
            )

            // Show toast for completed reports
            if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
              toast({
                title: "Report Completed!",
                description: `Your report "${payload.new.setting_name}" is ready to view.`
              })
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupRealtimeSubscription()
  }, [toast])

  // Open generate dialog
  const handleOpenGenerateDialog = () => {
    fetchUserUploads()
    fetchSystemSettings()
    setIsGenerateDialogOpen(true)
  }

  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedUploadId || !selectedSettingName) {
      toast({
        variant: "destructive",
        title: "Incomplete Selection",
        description: "Please select both a chat record and a topic."
      })
      return
    }

    setIsGenerating(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/user-reports/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_data_id: selectedUploadId,
          setting_name: selectedSettingName
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create report')
      }

      toast({
        title: "Report Generation Started",
        description: "Your report is being generated. This may take a few minutes."
      })

      // Refresh reports list
      await fetchReports()

      // Reset and close dialog
      setSelectedUploadId('')
      setSelectedSettingName('')
      setIsGenerateDialogOpen(false)

      // Trigger Edge Function to process the report
      setTimeout(async () => {
        try {
          console.log('🔄 Triggering Edge Function to process report...')
          const triggerResponse = await fetch('/api/trigger-report-processing', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          const triggerResult = await triggerResponse.json()
          console.log('✅ Edge Function triggered:', triggerResult)
        } catch (err) {
          console.error('⚠️  Failed to trigger Edge Function:', err)
        }
      }, 1000) // 延迟1秒，确保数据库写入完成
    } catch (err) {
      console.error("Failed to generate report:", err)
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: err.message
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle thumb up/down
  const handleThumb = async (reportId: string, thumbValue: boolean | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/user-reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ thumb_up: thumbValue })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update rating')
      }

      // Update local state
      setReports(prevReports =>
        prevReports.map(report =>
          report.id === reportId ? { ...report, thumb_up: thumbValue } : report
        )
      )

      toast({
        title: "Rating Updated",
        description: "Thank you for your feedback!"
      })
    } catch (err) {
      console.error("Failed to update thumb:", err)
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message
      })
    }
  }

  // Handle soft delete
  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/user-reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete report')
      }

      // Remove from local state
      setReports(prevReports => prevReports.filter(report => report.id !== reportId))

      toast({
        title: "Report Deleted",
        description: "The report has been removed from your list."
      })
    } catch (err) {
      console.error("Failed to delete report:", err)
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: err.message
      })
    }
  }

  // View slides
  const handleViewSlides = (report) => {
    if (report.generate_slides) {
      try {
        const slidesData = typeof report.generate_slides === 'string'
          ? JSON.parse(report.generate_slides)
          : report.generate_slides

        const slides = slidesData.files || slidesData

        setSelectedReport({ ...report, slides })
        setCurrentSlideIndex(0)
      } catch (err) {
        console.error("Failed to parse slides:", err)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load slides"
        })
      }
    }
  }

  // Open slide in new window with full navigation
  const handleOpenInNewWindow = () => {
    if (!selectedReport || !selectedReport.slides || selectedReport.slides.length === 0) {
      return
    }

    const slides = selectedReport.slides
    const startIndex = currentSlideIndex
    const newWindow = window.open('', '_blank', 'width=1280,height=720,resizable=yes,scrollbars=yes')

    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${selectedReport.setting_name} - Slides</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }

              body {
                background: #1a1a1a;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              #viewer {
                width: 100%;
                height: 100%;
                position: relative;
                overflow: hidden;
              }

              #slide-container {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
              }

              #slide-wrapper {
                position: relative;
                width: 100%;
                height: 100%;
                max-width: 1280px;
                max-height: 720px;
                display: flex;
                overflow: hidden;
              }

              .slide-frame {
                position: absolute;
                width: 100%;
                height: 100%;
                transition: transform 0.3s ease-in-out;
                transform-origin: center center;
              }

              .slide-frame.current {
                transform: translateX(0);
                z-index: 2;
              }

              .slide-frame.next {
                transform: translateX(100%);
                z-index: 1;
              }

              .slide-frame.prev {
                transform: translateX(-100%);
                z-index: 1;
              }

              .slide-frame.slide-left {
                transform: translateX(-100%);
              }

              .slide-frame.slide-right {
                transform: translateX(100%);
              }

              .slide-frame iframe {
                width: 100%;
                height: 100%;
                border: none;
                background: white;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
              }

              .nav-arrow {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 60px;
                height: 60px;
                background: rgba(0,0,0,0.5);
                border: none;
                border-radius: 50%;
                color: white;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s, background 0.2s;
                z-index: 100;
                pointer-events: none;
              }

              .nav-arrow.visible {
                opacity: 1;
                pointer-events: auto;
              }

              .nav-arrow:hover {
                background: rgba(0,0,0,0.7);
              }

              .nav-arrow.left {
                left: 20px;
              }

              .nav-arrow.right {
                right: 20px;
              }

              .nav-arrow:disabled {
                opacity: 0 !important;
                cursor: not-allowed;
              }

              .page-indicator {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.6);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                opacity: 0;
                transition: opacity 0.3s;
                z-index: 100;
              }

              .page-indicator.visible {
                opacity: 1;
              }

              .close-btn {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 40px;
                height: 40px;
                background: rgba(0,0,0,0.6);
                border: none;
                border-radius: 50%;
                color: white;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s, background 0.2s;
                z-index: 100;
              }

              .close-btn.visible {
                opacity: 1;
              }

              .close-btn:hover {
                background: rgba(0,0,0,0.8);
              }

              .hover-zone {
                position: absolute;
                top: 0;
                bottom: 0;
                width: 20%;
                z-index: 50;
              }

              .hover-zone.left {
                left: 0;
              }

              .hover-zone.right {
                right: 0;
              }
            </style>
          </head>
          <body>
            <div id="viewer">
              <div id="slide-container">
                <div id="slide-wrapper">
                  <div id="slide-current" class="slide-frame current">
                    <iframe srcdoc=""></iframe>
                  </div>
                  <div id="slide-next" class="slide-frame next">
                    <iframe srcdoc=""></iframe>
                  </div>
                </div>
              </div>

              <!-- Navigation arrows -->
              <button class="nav-arrow left" id="btn-prev">←</button>
              <button class="nav-arrow right" id="btn-next">→</button>

              <!-- Hover zones -->
              <div class="hover-zone left"></div>
              <div class="hover-zone right"></div>

              <!-- Page indicator -->
              <div class="page-indicator" id="page-indicator">1 / 1</div>

              <!-- Close button -->
              <button class="close-btn" id="btn-close">×</button>
            </div>

            <script>
              const slides = ${JSON.stringify(slides.map(s => s.content))};
              let currentIndex = ${startIndex};
              let isAnimating = false;
              let hideTimeout = null;

              const currentFrame = document.getElementById('slide-current');
              const nextFrame = document.getElementById('slide-next');
              const btnPrev = document.getElementById('btn-prev');
              const btnNext = document.getElementById('btn-next');
              const btnClose = document.getElementById('btn-close');
              const pageIndicator = document.getElementById('page-indicator');
              const hoverZones = document.querySelectorAll('.hover-zone');

              // Initialize
              function init() {
                showSlide(currentIndex);
                updateUI();
                calculateScale();
                window.addEventListener('resize', calculateScale);
              }

              // Calculate scale for responsive display
              function calculateScale() {
                const wrapper = document.getElementById('slide-wrapper');
                const container = document.getElementById('slide-container');
                const containerWidth = container.offsetWidth - 80; // padding
                const containerHeight = container.offsetHeight - 80;
                const slideWidth = 1280;
                const slideHeight = 720;

                const scaleX = containerWidth / slideWidth;
                const scaleY = containerHeight / slideHeight;
                const scale = Math.min(scaleX, scaleY, 1);

                wrapper.style.transform = \`scale(\${scale})\`;
              }

              // Show slide
              function showSlide(index) {
                const iframe = currentFrame.querySelector('iframe');
                iframe.srcdoc = slides[index];
              }

              // Navigate to next slide
              function nextSlide() {
                if (isAnimating || currentIndex >= slides.length - 1) return;

                isAnimating = true;
                const nextIndex = currentIndex + 1;

                // Load next slide
                nextFrame.querySelector('iframe').srcdoc = slides[nextIndex];
                nextFrame.className = 'slide-frame next';

                // Trigger animation
                setTimeout(() => {
                  currentFrame.classList.add('slide-left');
                  nextFrame.classList.remove('next');
                  nextFrame.classList.add('current');

                  setTimeout(() => {
                    // Swap frames
                    const temp = currentFrame.id;
                    currentFrame.id = nextFrame.id;
                    nextFrame.id = temp;

                    currentFrame.className = 'slide-frame current';
                    nextFrame.className = 'slide-frame next';
                    nextFrame.classList.remove('slide-left');

                    currentIndex = nextIndex;
                    updateUI();
                    isAnimating = false;
                  }, 300);
                }, 10);
              }

              // Navigate to previous slide
              function prevSlide() {
                if (isAnimating || currentIndex <= 0) return;

                isAnimating = true;
                const prevIndex = currentIndex - 1;

                // Load prev slide
                nextFrame.querySelector('iframe').srcdoc = slides[prevIndex];
                nextFrame.className = 'slide-frame prev';

                // Trigger animation
                setTimeout(() => {
                  currentFrame.classList.add('slide-right');
                  nextFrame.classList.remove('prev');
                  nextFrame.classList.add('current');

                  setTimeout(() => {
                    // Swap frames
                    const temp = currentFrame.id;
                    currentFrame.id = nextFrame.id;
                    nextFrame.id = temp;

                    currentFrame.className = 'slide-frame current';
                    nextFrame.className = 'slide-frame next';
                    nextFrame.classList.remove('slide-right');

                    currentIndex = prevIndex;
                    updateUI();
                    isAnimating = false;
                  }, 300);
                }, 10);
              }

              // Update UI
              function updateUI() {
                btnPrev.disabled = currentIndex === 0;
                btnNext.disabled = currentIndex === slides.length - 1;
                pageIndicator.textContent = \`Slide \${currentIndex + 1} / \${slides.length}\`;
              }

              // Show controls
              function showControls() {
                clearTimeout(hideTimeout);
                btnPrev.classList.add('visible');
                btnNext.classList.add('visible');
                btnClose.classList.add('visible');
                pageIndicator.classList.add('visible');

                hideTimeout = setTimeout(() => {
                  btnPrev.classList.remove('visible');
                  btnNext.classList.remove('visible');
                  btnClose.classList.remove('visible');
                  pageIndicator.classList.remove('visible');
                }, 3000);
              }

              // Event listeners
              btnPrev.addEventListener('click', prevSlide);
              btnNext.addEventListener('click', nextSlide);
              btnClose.addEventListener('click', () => window.close());

              document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') prevSlide();
                if (e.key === 'ArrowRight') nextSlide();
                if (e.key === 'Escape') window.close();
                showControls();
              });

              document.addEventListener('mousemove', showControls);

              hoverZones.forEach(zone => {
                zone.addEventListener('mouseenter', () => {
                  if (zone.classList.contains('left')) {
                    btnPrev.classList.add('visible');
                  } else {
                    btnNext.classList.add('visible');
                  }
                });
              });

              // Initialize
              init();
              showControls();
            </script>
          </body>
        </html>
      `)
      newWindow.document.close()
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to open new window. Please check your popup blocker settings."
      })
    }
  }

  // Get status badge
  const getStatusBadge = (report) => {
    const { status, report_status, slide_status } = report

    if (status === 'processing') {
      return (
        <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      )
    }

    if (status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>
    }

    if (status === 'completed') {
      if (slide_status === 'completed') {
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
      }
      if (slide_status === 'failed' && report_status === 'completed') {
        return <Badge variant="destructive">Report OK, Slides Failed</Badge>
      }
    }

    return <Badge variant="outline">Pending</Badge>
  }

  // Get status text
  const getStatusText = (report) => {
    const { status, report_status, slide_status } = report

    if (status === 'processing') {
      if (report_status === 'generating') return 'Generating report...'
      if (report_status === 'completed' && slide_status === 'generating') return 'Generating slides...'
      return 'Processing...'
    }

    if (status === 'failed') {
      if (report.report_error) return `Report failed: ${report.report_error}`
      if (report.slide_error) return `Slide failed: ${report.slide_error}`
      return 'Failed'
    }

    if (status === 'completed') {
      return 'Completed'
    }

    return 'Pending'
  }

  // Calculate stats
  const totalReports = reports.length
  const completedReports = reports.filter(r => r.status === 'completed' && r.slide_status === 'completed').length
  const processingReports = reports.filter(r => r.status === 'processing').length

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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Reports</h1>
          <p className="text-muted-foreground">
            Generate and manage your relationship analysis reports
          </p>
        </div>
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={handleOpenGenerateDialog}>
              Generate New Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
              <DialogDescription>
                Select your chat record and analysis topic to generate a new report
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="upload-select">Chat Record</Label>
                <Select value={selectedUploadId} onValueChange={setSelectedUploadId}>
                  <SelectTrigger id="upload-select">
                    <SelectValue placeholder="Select a chat record" />
                  </SelectTrigger>
                  <SelectContent>
                    {userUploads.map(upload => (
                      <SelectItem key={upload.id} value={upload.id}>
                        {upload.file_name} - {new Date(upload.created_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic-select">Analysis Topic</Label>
                <Select value={selectedSettingName} onValueChange={setSelectedSettingName}>
                  <SelectTrigger id="topic-select">
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemSettings.map(setting => (
                      <SelectItem key={setting.id} value={setting.setting_name}>
                        {setting.setting_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsGenerateDialogOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating || !selectedUploadId || !selectedSettingName}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="text-2xl font-bold">{processingReports}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports List or Empty State */}
        {reports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                You haven't generated any reports yet
              </p>
              <Button className="mt-4" onClick={handleOpenGenerateDialog}>
                Generate Your First Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Latest Report Preview (if completed with slides) */}
            {reports[0] && reports[0].status === 'completed' && reports[0].slide_status === 'completed' && reports[0].generate_slides && !selectedReport && (
              <Card>
                <CardHeader>
                  <CardTitle>Latest Report: {reports[0].setting_name}</CardTitle>
                  <CardDescription>
                    Generated on {new Date(reports[0].created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => handleViewSlides(reports[0])}>
                    View Slides
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Slide Preview (when a report is selected) */}
            {selectedReport && selectedReport.slides && selectedReport.slides.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>
                        {selectedReport.setting_name} - Slides ({currentSlideIndex + 1}/{selectedReport.slides.length})
                      </CardTitle>
                      <CardDescription>
                        Generated on {new Date(selectedReport.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenInNewWindow}
                        title="Open in new window"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        New Window
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedReport(null)}>
                        Close Preview
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    ref={slideContainerRef}
                    className="border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center"
                    style={{ height: '70vh', minHeight: '500px' }}
                  >
                    <div
                      style={{
                        width: '1280px',
                        height: '720px',
                        transform: `scale(${slideScale})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.3s ease'
                      }}
                    >
                      <iframe
                        srcDoc={selectedReport.slides[currentSlideIndex].content}
                        style={{
                          width: '1280px',
                          height: '720px',
                          border: 'none',
                          background: 'white',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                        title={`Slide ${currentSlideIndex + 1}`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                      disabled={currentSlideIndex === 0}
                      variant="outline"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Slide {currentSlideIndex + 1} of {selectedReport.slides.length}
                    </span>
                    <Button
                      onClick={() => setCurrentSlideIndex(Math.min(selectedReport.slides.length - 1, currentSlideIndex + 1))}
                      disabled={currentSlideIndex === selectedReport.slides.length - 1}
                      variant="outline"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Reports */}
            <Card>
              <CardHeader>
                <CardTitle>All Reports</CardTitle>
                <CardDescription>Complete history of your generated reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{report.setting_name}</h3>
                          {getStatusBadge(report)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {getStatusText(report)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(report.created_at).toLocaleDateString()} at{' '}
                          {new Date(report.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* View Slides Button */}
                        {report.status === 'completed' && report.slide_status === 'completed' && report.generate_slides && (
                          <Button
                            size="sm"
                            onClick={() => handleViewSlides(report)}
                          >
                            View Slides
                          </Button>
                        )}

                        {/* Thumb Buttons */}
                        {report.status === 'completed' && report.slide_status === 'completed' && (
                          <div className="flex items-center gap-1 border rounded-md">
                            <Button
                              size="sm"
                              variant={report.thumb_up === true ? "default" : "ghost"}
                              className="h-8 px-2"
                              onClick={() => handleThumb(report.id, report.thumb_up === true ? null : true)}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <div className="h-4 w-px bg-border" />
                            <Button
                              size="sm"
                              variant={report.thumb_up === false ? "default" : "ghost"}
                              className="h-8 px-2"
                              onClick={() => handleThumb(report.id, report.thumb_up === false ? null : false)}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* Delete Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => handleDelete(report.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
})

export default MyReportsContent
