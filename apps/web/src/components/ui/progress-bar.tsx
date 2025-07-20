"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface TokenUsageProgressProps {
  used: number;
  limit: number;
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TokenUsageProgress: React.FC<TokenUsageProgressProps> = ({ 
  used, 
  limit, 
  className,
  showDetails = true,
  size = 'md'
}) => {
  const percentage = Math.min((used / limit) * 100, 100);
  const remaining = Math.max(limit - used, 0);
  
  // Determine color based on usage
  const getStatusColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getStatusIcon = () => {
    if (percentage >= 90) return <XCircle className="h-4 w-4 text-red-500" />;
    if (percentage >= 75) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };
  
  const getStatusText = () => {
    if (percentage >= 90) return 'Critical';
    if (percentage >= 75) return 'Warning';
    return 'Healthy';
  };
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium text-foreground">
              AI Token Usage - {getStatusText()}
            </span>
          </div>
          <span className="text-muted-foreground">
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
      )}
      
      <div className="relative">
        <div className={cn(
          'w-full bg-muted rounded-full overflow-hidden',
          sizeClasses[size]
        )}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              getStatusColor()
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Percentage overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white mix-blend-difference">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Remaining: {remaining.toLocaleString()} tokens</span>
          <span>Reset in: {Math.ceil((new Date().getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days</span>
        </div>
      )}
    </div>
  );
};

// Legacy export for backward compatibility
export const ProgressBar = TokenUsageProgress;

