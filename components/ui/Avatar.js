import React from 'react';
import { cn } from '../../lib/utils';

// Avatar Component - 通用头像组件
const Avatar = ({ className, src, fallback, ...props }) => (
  <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props}>
    {src ? (
      <img src={src} alt="" className="aspect-square h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-transparent">
        <span className="text-sm font-medium">{fallback || "?"}</span>
      </div>
    )}
  </div>
);

export default Avatar;
export { Avatar };