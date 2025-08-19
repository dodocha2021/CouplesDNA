import React from 'react';
import { cn } from '../../lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import LoadingSpinner from './LoadingSpinner';
import { useAutoScroll } from '../../hooks/useAutoScroll';

// Chat Bubble Components
export const ChatBubble = ({ 
  className, 
  variant = "received", 
  children, 
  ...props 
}) => {
  return (
    <div
      className={cn(
        "flex items-start gap-3 max-w-[80%] mb-4",
        variant === "sent" ? "ml-auto flex-row-reverse" : "mr-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const ChatBubbleAvatar = ({ className, ...props }) => (
  <Avatar className={cn("h-8 w-8", className)} {...props} />
);

export const ChatBubbleMessage = ({
  className,
  variant = "received",
  isLoading = false,
  children,
  ...props
}) => {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center space-x-1 px-4 py-3 rounded-2xl bg-gray-100",
          className
        )}
        {...props}
      >
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-2xl text-sm",
        variant === "sent"
          ? "bg-blue-600 text-white ml-auto"
          : "bg-gray-100 text-gray-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Chat Message List Component
export const ChatMessageList = React.forwardRef(({ 
  className, 
  children, 
  smooth = false, 
  ...props 
}, _ref) => {
  const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
    smooth,
    content: children,
  });

  return (
    <div className="relative w-full h-full">
      <div
        className={cn("flex flex-col w-full h-full p-4 overflow-y-auto", className)}
        ref={scrollRef}
        onWheel={disableAutoScroll}
        onTouchMove={disableAutoScroll}
        {...props}
      >
        <div className="flex flex-col gap-6">{children}</div>
      </div>

      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          variant="outline"
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 inline-flex rounded-full shadow-md"
          aria-label="Scroll to bottom"
        >
          ↓
        </Button>
      )}
    </div>
  );
});
ChatMessageList.displayName = "ChatMessageList";