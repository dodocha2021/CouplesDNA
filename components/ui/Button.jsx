import React from 'react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "default", 
  children,
  ...props 
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors border border-black disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-black text-white hover:bg-gray-800",
    outline: "bg-white text-black hover:bg-gray-100",
    secondary: "bg-white text-black hover:bg-gray-100",
    ghost: "bg-transparent text-black hover:bg-gray-100 border-transparent",
    destructive: "bg-white text-black hover:bg-gray-100",
    primary: "bg-black text-white hover:bg-gray-800",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 py-1 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-6 py-3",
    icon: "h-10 w-10",
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";