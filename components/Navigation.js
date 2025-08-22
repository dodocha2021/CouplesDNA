"use client";

import { useState, useId, useEffect } from "react";
import { LoginDialog } from "./auth/LoginDialog";
import { SignupDialog } from "./auth/SignupDialog";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

/* =========================================================
   Main Navigation component (with Sign In & Sign Up dialogs)
========================================================= */
export default function Navigation({
  // Navigation props
  brandName = "CouplesDNA",
  logoSrc = "/couplesdna-ai.png",
  loginButtonText = "Login",
  signUpButtonText = "Sign up",

  // SignIn Dialog props (now exposed in Figma)
  signInDialogTitle = "Welcome back",
  signInDialogDescription = "Enter your credentials to login to your account.",
  showGoogleLogin = true,
  signInGoogleButtonText = "Login with Google",
  rememberMeText = "Remember me",
  forgotPasswordText = "Forgot password?",
  signInButtonText = "Sign in",
  
  // SignUp Dialog props (shown in properties panel)
  signUpDialogTitle = "Sign up CouplesDNA",
  signUpDialogDescription = "We just need a few details to get you started.",
  showGoogleSignup = true,
  googleButtonText = "Continue with Google",
  termsText = "By signing up you agree to our Terms.",
  customIcon = true,
}) {
  const router = useRouter();
  // Controls the opening and closing of the two dialogs
  const [openSignIn, setOpenSignIn] = useState(false);
  const [openSignUp, setOpenSignUp] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <>
      <div className="flex w-full items-center justify-between mb-16">
        <div className="flex items-center gap-2">
          <ImageWithFallback
            src={logoSrc}
            alt={`${brandName} logo`}
            className="size-7 object-contain"
          />
          <h1 className="text-base font-bold md:text-xl">{brandName}</h1>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {user.user_metadata?.full_name || user.email}
              </span>
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push('/dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          ) : (
            <>
              {/* Login: Primary button, opens the login dialog */}
              <Button
                variant="primary"
                size="md"
                className="w-24 md:w-32"
                onClick={() => setOpenSignIn(true)}
              >
                {loginButtonText}
              </Button>

              {/* Sign up: Secondary button, opens the registration dialog */}
              <Button
                variant="secondary"
                size="md"
                className="w-24 md:w-32"
                onClick={() => setOpenSignUp(true)}
              >
                {signUpButtonText}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* New shadcn/ui login dialog */}
      <LoginDialog
        open={openSignIn}
        setOpen={setOpenSignIn}
        onSignupClick={() => {
          setOpenSignIn(false)
          setOpenSignUp(true)
        }}
      />

      {/* New shadcn/ui registration dialog */}
      <SignupDialog
        open={openSignUp}
        setOpen={setOpenSignUp}
        onLoginClick={() => {
          setOpenSignUp(false)
          setOpenSignIn(true)
        }}
      />
    </>
  );
}




const Button = ({
  children,
  className = "",
  variant = "primary", // 'primary' | 'secondary'
  size = "md", // 'sm' | 'md' | 'lg'
  fullWidth = false,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-black/40 disabled:opacity-50";

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variants = {
    primary:
      "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90",
    secondary:
      "bg-white text-black border border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800",
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};



/* =========================================================
   Image with graceful fallback
========================================================= */
function ImageWithFallback(props) {
  const [didError, setDidError] = useState(false);
  const { src, alt, style, className, ...rest } = props;

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ""}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img
          src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=="
          alt="Error loading image"
          {...rest}
          data-original-url={src}
        />
      </div>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={() => setDidError(true)}
    />
  );
}