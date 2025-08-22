"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/router"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { signupSchema, SignupFormData } from "@/lib/validations/auth"
import { supabase } from "@/lib/supabase"

interface SignupDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  onLoginClick?: () => void
  triggerButton?: React.ReactNode
}

export function SignupDialog({ 
  open, 
  setOpen, 
  onLoginClick,
  triggerButton 
}: SignupDialogProps) {
  const router = useRouter()
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      console.log("Attempting signup with:", data.email)
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
          }
        }
      })

      if (error) {
        console.error("Signup error:", error.message)
        // You can add proper error handling here
        return
      }

      console.log("Signup successful:", authData.user?.email)
      
      // Close dialog and reset form
      setOpen(false)
      form.reset()
      
      // Redirect to dashboard
      await router.push('/dashboard')
      
    } catch (error) {
      console.error("Signup error:", error)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        console.error("Google signup error:", error.message)
      }
    } catch (error) {
      console.error("Google signup error:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Join CouplesDNA</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <Card className="border-0 shadow-none">
            <CardHeader className="text-center pb-6">
              <CardDescription>
                We just need a few details to get you started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
                  <div className="flex flex-col gap-4">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      type="button"
                      onClick={handleGoogleSignup}
                    >
                      <svg width="20" height="20" className="mr-2" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                        <path d="M1 1h22v22H1z" fill="none" />
                      </svg>
                      Continue with Google
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Matt Welsh"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="hi@yourcompany.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? "Creating account..." : "Sign up"}
                    </Button>
                  </div>
                  
                  <div className="text-center text-sm">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="underline underline-offset-4 hover:text-primary"
                      onClick={() => {
                        setOpen(false)
                        onLoginClick?.()
                      }}
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <div className="text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
            By signing up you agree to our{" "}
            <a href="#">Terms</a>.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}