import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
const Skeleton = forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('animate-pulse rounded-md bg-muted', className), ...props })));
Skeleton.displayName = 'Skeleton';
export { Skeleton };
