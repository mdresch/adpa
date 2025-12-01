/**
 * Maturity Card Component
 * Beautiful card component for displaying maturity-related content
 */

import React from 'react';
import { motion } from 'framer-motion';
import { maturityTheme } from '@/lib/theme/maturity-portal-theme';

interface MaturityCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  variant?: 'default' | 'elevated' | 'success' | 'warning' | 'error' | 'info';
}

const variantStyles = {
  default: {
    background: maturityTheme.colors.surface.default,
    border: maturityTheme.colors.border.default,
  },
  elevated: {
    background: maturityTheme.colors.background.elevated,
    border: maturityTheme.colors.border.accent,
  },
  success: {
    background: maturityTheme.colors.success.bg,
    border: maturityTheme.colors.success.border,
  },
  warning: {
    background: maturityTheme.colors.warning.bg,
    border: maturityTheme.colors.warning.border,
  },
  error: {
    background: maturityTheme.colors.error.bg,
    border: maturityTheme.colors.error.border,
  },
  info: {
    background: maturityTheme.colors.info.bg,
    border: maturityTheme.colors.info.border,
  },
};

export const MaturityCard: React.FC<MaturityCardProps> = ({
  children,
  className = '',
  hover = true,
  glow = false,
  variant = 'default',
}) => {
  const style = variantStyles[variant];

  return (
    <motion.div
      className={`rounded-xl border backdrop-blur-sm ${className}`}
      style={{
        backgroundColor: style.background,
        borderColor: style.border,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { 
        boxShadow: glow ? maturityTheme.shadows.glowStrong : maturityTheme.shadows.lg,
      } : undefined}
    >
      {children}
    </motion.div>
  );
};

interface MaturityCardHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const MaturityCardHeader: React.FC<MaturityCardHeaderProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="p-6 border-b" style={{ borderColor: maturityTheme.colors.border.muted }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {icon && (
            <div className="mt-1" style={{ color: maturityTheme.colors.primary[400] }}>
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h3 
              className="text-xl font-semibold mb-1" 
              style={{ color: maturityTheme.colors.text.primary }}
            >
              {title}
            </h3>
            {description && (
              <p 
                className="text-sm" 
                style={{ color: maturityTheme.colors.text.secondary }}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
    </div>
  );
};

interface MaturityCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const MaturityCardContent: React.FC<MaturityCardContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

interface MaturityCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const MaturityCardFooter: React.FC<MaturityCardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div 
      className={`p-6 border-t ${className}`}
      style={{ borderColor: maturityTheme.colors.border.muted }}
    >
      {children}
    </div>
  );
};
