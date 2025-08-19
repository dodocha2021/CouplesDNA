"use client"

import React, { useState, useEffect } from 'react'
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
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase, getUserRole } from '@/lib/supabase'

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface SidebarLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive?: boolean
}

function SidebarLink({ href, icon, label, isActive }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('guest')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const role = await getUserRole()
        console.log('User role from getUserRole:', role) // Debug log
        setUserRole(role)

        if (role !== 'guest') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
            console.log('User profile:', profile) // Debug log
            setUserProfile(profile)
            
            // Double check role from profile directly
            if (profile?.role) {
              console.log('Role from profile:', profile.role) // Debug log
              setUserRole(profile.role)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [])

  const handleLogout = async () => {
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
  }

  const navigation = [
    {
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'Dashboard',
      show: userRole !== 'guest'
    },
    {
      href: '/test-simple-chat',
      icon: <MessageCircle className="w-5 h-5" />,
      label: 'Live Chat',
      show: userRole !== 'guest'
    },
    {
      href: '/my-reports',
      icon: <FileText className="w-5 h-5" />,
      label: 'My Reports',
      show: userRole !== 'guest'
    },
    {
      href: '/settings',
      icon: <Settings className="w-5 h-5" />,
      label: 'Settings',
      show: userRole !== 'guest'
    },
    {
      href: '/admin',
      icon: <Shield className="w-5 h-5" />,
      label: 'Admin Panel',
      show: userRole === 'admin'
    }
  ]

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
            onClick={() => setSidebarOpen(!sidebarOpen)}
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
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isActive={router.pathname === item.href}
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
          {children}
        </main>
      </div>
    </div>
  )
}