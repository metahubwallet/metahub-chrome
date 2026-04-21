import * as React from 'react';
import { cn } from '@/utils/cn';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, orientation = 'vertical', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden',
        orientation === 'vertical' && 'overflow-y-auto',
        orientation === 'horizontal' && 'overflow-x-auto',
        orientation === 'both' && 'overflow-auto',
        '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
