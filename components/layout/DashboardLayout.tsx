"use client"

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { 
  LayoutDashboard, 
  MessageCircle, 
  FileText, 
  Settings, 
  Shield,
  User,
  LogOut,
  Menu,
  X,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase, getUserRole } from '@/lib/supabase'

// Lazy load content components for better performance
const DashboardContent = lazy(() => import('@/components/content/DashboardContent'))
const LiveChatContent = lazy(() => import('@/components/content/LiveChatContent').then(m => ({ default: m.LiveChatContent })))
const MyReportsContent = lazy(() => import('@/components/content/MyReportsContent').then(m => ({ default: m.MyReportsContent })))
const SettingsContent = lazy(() => import('@/components/content/SettingsContent').then(m => ({ default: m.SettingsContent })))
const AdminContent = lazy(() => import('@/components/content/AdminContent').then(m => ({ default: m.AdminContent })))

interface DashboardLayoutProps {
  children?: React.ReactNode
  enableSPA?: boolean
}

interface SidebarLinkProps {
  id: string
  icon: React.ReactNode
  label: string
  isActive?: boolean
  onClick: () => void
}

const SidebarLink = React.memo(function SidebarLink({ id, icon, label, isActive, onClick }: SidebarLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`sidebar-link ${isActive ? 'active' : ''} flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full text-left focus-enhanced ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-sm'
      }`}
    >
      {icon}
      {label}
    </button>
  )
})

export function DashboardLayout({ children, enableSPA = false }: DashboardLayoutProps) {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('guest')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeContent, setActiveContent] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        
        // Check session first for authentication guard
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // Redirect to home if no session
          router.push('/')
          return
        }

        const role = await getUserRole()
        setUserRole(role)

        if (role !== 'guest') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
            setUserProfile(profile)
            
            // Use role from profile if available
            if (profile?.role) {
              setUserRole(profile.role)
            }
          }
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching user data:', error)
        // Redirect to home on error
        router.push('/')
      }
    }

    fetchUserData()
  }, [router])

  const handleLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error.message)
        return
      }
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [router])

  const navigation = useMemo(() => [
    {
      id: 'dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'Dashboard',
      show: userRole !== 'guest'
    },
    {
      id: 'live-chat',
      href: '/test-simple-chat',
      icon: <MessageCircle className="w-5 h-5" />,
      label: 'Live Chat',
      show: userRole !== 'guest'
    },
    {
      id: 'my-reports',
      href: '/my-reports',
      icon: <FileText className="w-5 h-5" />,
      label: 'My Reports',
      show: userRole !== 'guest'
    },
    {
      id: 'settings',
      href: '/settings',
      icon: <Settings className="w-5 h-5" />,
      label: 'Settings',
      show: userRole !== 'guest'
    },
    {
      id: 'admin',
      href: '/admin',
      icon: <Shield className="w-5 h-5" />,
      label: 'Admin Panel',
      show: userRole === 'admin'
    }
  ], [userRole])

  const handleNavigation = useCallback((item: any) => {
    if (enableSPA) {
      setActiveContent(item.id)
      setSidebarOpen(false) // Close mobile sidebar
    } else {
      router.push(item.href)
    }
  }, [enableSPA, router])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  )

  const renderContent = () => {
    if (!enableSPA) {
      return children
    }

    return (
      <Suspense fallback={<LoadingFallback />}>
        {(() => {
          switch (activeContent) {
            case 'dashboard':
              return <DashboardContent />
            case 'live-chat':
              return <LiveChatContent />
            case 'my-reports':
              return <MyReportsContent />
            case 'settings':
              return <SettingsContent />
            case 'admin':
              return <AdminContent />
            default:
              return <DashboardContent />
          }
        })()}
      </Suspense>
    )
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex h-16 items-center px-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-2 ml-4 md:ml-0">
            <img
              src="/couplesdna-ai.png"
              alt="CouplesDNA logo"
              className="h-7 w-7 object-contain"
            />
            <Link href="/" className="text-lg font-bold">
              CouplesDNA
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {userProfile ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span>{userProfile.full_name || userProfile.email}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:sticky top-16 z-40 w-64 h-[calc(100vh-4rem)] bg-muted/20 border-r transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full p-4">
            <nav className="space-y-2 flex-1">
              {navigation.map((item) => 
                item.show ? (
                  <SidebarLink
                    key={item.id}
                    id={item.id}
                    icon={item.icon}
                    label={item.label}
                    isActive={enableSPA ? activeContent === item.id : router.pathname === item.href}
                    onClick={() => handleNavigation(item)}
                  />
                ) : null
              )}
            </nav>
          </div>
        </aside>

        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-16 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}