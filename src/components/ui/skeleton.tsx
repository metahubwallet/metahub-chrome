import * as React from 'react';
import { cn } from '@/utils/cn';

const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
