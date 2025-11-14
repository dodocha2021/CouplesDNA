"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

interface ProfileIncompleteBannerProps {
  onCompleteClick: () => void
}

export function ProfileIncompleteBanner({ onCompleteClick }: ProfileIncompleteBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const checkProfileStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', user.id)
        .single()

      if (profile && !profile.profile_completed) {
        // Check if user dismissed banner in this session
        const dismissed = sessionStorage.getItem('profile_banner_dismissed')
        if (!dismissed) {
          setIsVisible(true)
        }
      }
    }

    checkProfileStatus()
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
    // Store dismissal in sessionStorage (will reset on new session)
    sessionStorage.setItem('profile_banner_dismissed', 'true')
  }

  if (!isVisible || isDismissed) {
    return null
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 dark:bg-blue-950 dark:border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Profile Incomplete
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="link"
              onClick={onCompleteClick}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0 h-auto"
            >
              Complete Now →
            </Button>
            <button
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
