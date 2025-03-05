/**
 * THIS FILE IS LIKELY REDUNDANT
 * Please use the JavaScript version (skeleton.js) if it exists.
 * This TypeScript file may be part of an incomplete migration.
 */

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
