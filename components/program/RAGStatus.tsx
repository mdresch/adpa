"use client"

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface RAGStatusProps {
  status: 'green' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  breakdown?: {
    green: number;
    amber: number;
    red: number;
  };
  onClick?: () => void;
  className?: string;
}

export function RAGStatus({
  status,
  size = 'md',
  showLabel = false,
  showTooltip = false,
  breakdown,
  onClick,
  className
}: RAGStatusProps) {
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-2xl',
    lg: 'text-4xl'
  };
  
  const statusConfig = {
    green: { 
      icon: '🟢', 
      label: 'ON TRACK', 
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300'
    },
    amber: { 
      icon: '🟡', 
      label: 'AT RISK', 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300'
    },
    red: { 
      icon: '🔴', 
      label: 'CRITICAL', 
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      pulse: true
    }
  };
  
  const config = statusConfig[status];
  
  const indicator = (
    <span 
      className={cn(
        'inline-flex items-center justify-center',
        sizeClasses[size],
        config.pulse && 'animate-pulse',
        onClick && 'cursor-pointer hover:scale-110 transition-transform',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={`Status: ${config.label}`}
    >
      {config.icon}
    </span>
  );

  const content = (
    <div className="inline-flex items-center gap-2">
      {indicator}
      {showLabel && (
        <span className={cn(
          'text-xs font-semibold uppercase',
          config.color
        )}>
          {config.label}
        </span>
      )}
    </div>
  );

  if (showTooltip && breakdown) {
    const tooltipText = `${breakdown.green} green, ${breakdown.amber} amber, ${breakdown.red} red`;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
