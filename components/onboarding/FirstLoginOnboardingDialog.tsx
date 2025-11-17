"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

interface OnboardingData {
  relationship_status: string
  gender: string
  age_range: string
  relationship_duration: string
  consultation_focus: string[]
  primary_challenge: string
}

interface FirstLoginOnboardingDialogProps {
  open: boolean
  onComplete: () => void
}

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

const RELATIONSHIP_DURATION_OPTIONS = [
  "Less than 3 months",
  "3-12 months",
  "1-3 years",
  "3-5 years",
  "5+ years",
]

export function FirstLoginOnboardingDialog({ open, onComplete }: FirstLoginOnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [formData, setFormData] = useState<OnboardingData>({
    relationship_status: "",
    gender: "",
    age_range: "",
    relationship_duration: "",
    consultation_focus: [],
    primary_challenge: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const totalSteps = shouldShowDurationStep() ? 6 : 5

  function shouldShowDurationStep(): boolean {
    return (
      formData.relationship_status === "In a relationship" ||
      formData.relationship_status === "Married / Long-term partnership"
    )
  }

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return
    }

    if (!hasStarted && currentStep === 1) {
      setHasStarted(true)
    }

    // Skip step 4 (relationship duration) if not applicable
    if (currentStep === 3 && !shouldShowDurationStep()) {
      setCurrentStep(5)
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    // Skip step 4 (relationship duration) when going back if not applicable
    if (currentStep === 5 && !shouldShowDurationStep()) {
      setCurrentStep(3)
    } else {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateCurrentStep = (): boolean => {
    setErrors({})

    switch (currentStep) {
      case 1:
        if (!formData.relationship_status) {
          setErrors({ relationship_status: "Please select an option" })
          return false
        }
        break
      case 2:
        if (!formData.gender) {
          setErrors({ gender: "Please select an option" })
          return false
        }
        break
      case 3:
        if (!formData.age_range) {
          setErrors({ age_range: "Please select an option" })
          return false
        }
        break
      case 4:
        if (shouldShowDurationStep() && !formData.relationship_duration) {
          setErrors({ relationship_duration: "Please select an option" })
          return false
        }
        break
      case 5:
        if (formData.consultation_focus.length === 0) {
          setErrors({ consultation_focus: "Please select at least 1 option" })
          return false
        }
        if (formData.consultation_focus.length > 3) {
          setErrors({ consultation_focus: "Please select no more than 3 options" })
          return false
        }
        break
      case 6:
        // Optional field, no validation needed
        break
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          relationship_status: formData.relationship_status,
          gender: formData.gender,
          age_range: formData.age_range,
          relationship_duration: shouldShowDurationStep() ? formData.relationship_duration : null,
          consultation_focus: formData.consultation_focus,
          primary_challenge: formData.primary_challenge || null,
          profile_completed: true,
          profile_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        console.error("Error saving onboarding data:", error)
        throw error
      }

      setShowSuccess(true)
    } catch (error) {
      console.error("Submission error:", error)
      alert("Failed to save your information. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (hasStarted && !showSuccess) {
      setShowExitWarning(true)
    }
  }

  const handleExitConfirm = () => {
    setShowExitWarning(false)
    // Don't call onComplete, just close
  }

  const handleToggleFocus = (option: string) => {
    setFormData(prev => {
      const current = prev.consultation_focus
      if (current.includes(option)) {
        return { ...prev, consultation_focus: current.filter(f => f !== option) }
      } else {
        if (current.length >= 3) {
          return prev // Don't add if already 3 selected
        }
        return { ...prev, consultation_focus: [...current, option] }
      }
    })
  }

  const getStepNumber = (): number => {
    if (!shouldShowDurationStep() && currentStep > 4) {
      return currentStep - 1
    }
    return currentStep
  }

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-3xl [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold">Submission Successful!</h2>
            <p className="mb-8 text-muted-foreground">
              Thank you for completing your profile.<br />
              Let's start your journey.
            </p>
            <Button onClick={onComplete} size="lg">
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      {/* Main Dialog */}
      <Dialog open={open && !showExitWarning} onOpenChange={handleClose}>
        <DialogContent
          className="sm:max-w-3xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="mb-4 flex items-center justify-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full",
                    i < getStepNumber() ? "bg-primary" : "bg-gray-200"
                  )}
                />
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Step {getStepNumber()} of {totalSteps}
            </p>
          </DialogHeader>

          <div className="py-6">
            {/* Step 1: Welcome + Relationship Status */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="mb-8 text-center">
                  <h2 className="mb-2 text-2xl font-bold">👋 Welcome to CouplesDNA</h2>
                  <p className="text-muted-foreground">
                    To provide you with more personalized relationship insights,<br />
                    please take 2 minutes to tell us about yourself.
                  </p>
                </div>

                <div>
                  <Label className="mb-3 block text-base font-semibold">
                    What's your current relationship status?
                  </Label>
                  <div className="space-y-3">
                    {RELATIONSHIP_STATUS_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex cursor-pointer items-center space-x-3 rounded-lg border p-4 transition-colors",
                          formData.relationship_status === option
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="relationship_status"
                          value={option}
                          checked={formData.relationship_status === option}
                          onChange={(e) => setFormData({ ...formData, relationship_status: e.target.value })}
                          className="h-4 w-4 text-primary"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {errors.relationship_status && (
                    <p className="mt-2 text-sm text-red-600">{errors.relationship_status}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Gender */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div>
                  <Label className="mb-3 block text-base font-semibold">
                    What's your gender?
                  </Label>
                  <div className="space-y-3">
                    {GENDER_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex cursor-pointer items-center space-x-3 rounded-lg border p-4 transition-colors",
                          formData.gender === option
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value={option}
                          checked={formData.gender === option}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="h-4 w-4 text-primary"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {errors.gender && (
                    <p className="mt-2 text-sm text-red-600">{errors.gender}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Age Range */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div>
                  <Label className="mb-3 block text-base font-semibold">
                    What's your age range?
                  </Label>
                  <div className="space-y-3">
                    {AGE_RANGE_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex cursor-pointer items-center space-x-3 rounded-lg border p-4 transition-colors",
                          formData.age_range === option
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="age_range"
                          value={option}
                          checked={formData.age_range === option}
                          onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
                          className="h-4 w-4 text-primary"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {errors.age_range && (
                    <p className="mt-2 text-sm text-red-600">{errors.age_range}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Relationship Duration (Conditional) */}
            {currentStep === 4 && shouldShowDurationStep() && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div>
                  <Label className="mb-3 block text-base font-semibold">
                    How long have you been together?
                  </Label>
                  <div className="space-y-3">
                    {RELATIONSHIP_DURATION_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex cursor-pointer items-center space-x-3 rounded-lg border p-4 transition-colors",
                          formData.relationship_duration === option
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <input
                          type="radio"
                          name="relationship_duration"
                          value={option}
                          checked={formData.relationship_duration === option}
                          onChange={(e) => setFormData({ ...formData, relationship_duration: e.target.value })}
                          className="h-4 w-4 text-primary"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {errors.relationship_duration && (
                    <p className="mt-2 text-sm text-red-600">{errors.relationship_duration}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Consultation Focus */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div>
                  <Label className="mb-3 block text-base font-semibold">
                    What topics are you most interested in? (Select 1-3)
                  </Label>
                  <div className="space-y-3">
                    {CONSULTATION_FOCUS_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex cursor-pointer items-center space-x-3 rounded-lg border p-4 transition-colors",
                          formData.consultation_focus.includes(option)
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300",
                          formData.consultation_focus.length >= 3 && !formData.consultation_focus.includes(option)
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        )}
                      >
                        <Checkbox
                          checked={formData.consultation_focus.includes(option)}
                          onCheckedChange={() => handleToggleFocus(option)}
                          disabled={formData.consultation_focus.length >= 3 && !formData.consultation_focus.includes(option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {errors.consultation_focus && (
                    <p className="mt-2 text-sm text-red-600">{errors.consultation_focus}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Primary Challenge */}
            {currentStep === 6 && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div>
                  <Label className="mb-3 block text-base font-semibold">
                    What's your main challenge right now? (Optional)
                  </Label>
                  <Textarea
                    placeholder="e.g., We always argue about small things, I don't know how to express my needs..."
                    value={formData.primary_challenge}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setFormData({ ...formData, primary_challenge: e.target.value })
                      }
                    }}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="mt-2 text-sm text-muted-foreground text-right">
                    {formData.primary_challenge.length}/200
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Warning Dialog */}
      <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Are you sure you want to exit?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your progress will not be saved if you close now.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowExitWarning(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleExitConfirm}>
              Exit Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
