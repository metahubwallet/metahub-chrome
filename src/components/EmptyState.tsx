import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'No data available',
  icon,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground',
      className
    )}
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      {icon || <Inbox className="h-6 w-6" />}
    </div>
    <p className="text-sm">{message}</p>
  </div>
);

export default EmptyState;
