"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/router"
import { Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { loginSchema, LoginFormData } from "@/lib/validations/auth"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
//import Link from 'next/link'

interface LoginDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  onSignupClick?: () => void
  triggerButton?: React.ReactNode
}

export function LoginDialog({ 
  open, 
  setOpen, 
  onSignupClick,
  triggerButton 
}: LoginDialogProps) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setErrorMessage(null) // Clear previous errors
      console.log("Attempting login with:", data.email)
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        console.error("Login error:", error.message)
        setErrorMessage("Oops! Email or password doesn't match. Let's try again! 💝")
        return
      }

      console.log("Login successful:", authData.user?.email)
      setOpen(false)
      form.reset()
      setErrorMessage(null)
      
      // Redirect to dashboard
      await router.push('/dashboard')

    } catch (error) {
      console.error("Login error:", error)
      setErrorMessage("Something went wrong! Don't worry, love conquers all. Try again! 💕")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        console.error("Google login error:", error.message)
      }
    } catch (error) {
      console.error("Google login error:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-pink-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border border-pink-200 dark:border-gray-700 shadow-xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="animate-pulse">💕</div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">
            Welcome Back, Lovebirds! 💕
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <Card className="border-0 shadow-none">
            <CardHeader className="text-center pb-6">
              <CardDescription className="text-gray-600">
                Ready to discover your relationship insights? Let's get you signed in! ✨
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
                  <div className="flex flex-col gap-4">
                    <Button 
                      variant="outline" 
                      className="w-full hover:bg-gray-50 hover:scale-105 transition-all duration-200 border-gray-200 hover:border-gray-300" 
                      type="button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                        <path
                          d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                          fill="currentColor"
                        />
                      </svg>
                      Quick login with Apple 🍎
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full hover:bg-blue-50 hover:scale-105 transition-all duration-200 border-gray-200 hover:border-blue-300" 
                      type="button"
                      onClick={handleGoogleLogin}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      Continue with Google ✨
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-gradient-to-br from-pink-50 via-white to-red-50 dark:bg-gray-900 px-2 text-gray-500">
                        Or sign in the classic way 💌
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Email Address 📧</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your.love@email.com"
                              className="focus:ring-pink-500 focus:border-pink-500 hover:border-gray-400 transition-colors"
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
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-gray-700">Password 🔐</FormLabel>
                            <a
                              href="#"
                              className="text-sm text-pink-600 hover:text-pink-700 underline-offset-4 hover:underline transition-colors"
                            >
                              Forgot? No worries! 💭
                            </a>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Your secret password ✨"
                                {...field} 
                                className="pr-10 focus:ring-pink-500 focus:border-pink-500 hover:border-gray-400 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-pink-600 transition-colors duration-200"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="remember"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal text-gray-600">
                            Keep me signed in 💖
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    {errorMessage && (
                      <div className="p-3 text-sm text-pink-700 bg-pink-50 border border-pink-200 rounded-md animate-pulse">
                        {errorMessage}
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 transform hover:scale-105 transition-all duration-200 text-white font-semibold"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Signing you in... 💕
                        </div>
                      ) : (
                        "Let's Go! 🚀"
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-center text-sm">
                    <span className="text-gray-600">New to CouplesDNA?{" "}</span>
                    <button
                      type="button"
                      className="text-pink-600 hover:text-pink-700 underline underline-offset-4 hover:scale-105 transition-all duration-200 font-medium"
                      onClick={() => {
                        setOpen(false)
                        onSignupClick?.()
                      }}
                    >
                      Join the love journey! 💕
                    </button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <div className="text-balance text-center text-xs text-gray-500 [&_a]:text-pink-600 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-pink-700">
            By continuing, you agree to our <a href="#">Terms of Love</a>{" "}
            and <a href="#">Privacy Promise</a>. We protect your relationship data! 🔒💕
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}