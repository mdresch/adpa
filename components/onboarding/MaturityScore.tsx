/**
 * Maturity Score Display
 * Beautiful animated score display for maturity levels
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { maturityTheme, getMaturityColor } from '@/lib/theme/maturity-portal-theme';

interface MaturityScoreProps {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  score?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  showProgress?: boolean;
}

const sizeConfig = {
  sm: { diameter: 80, strokeWidth: 6, fontSize: 'text-xl' },
  md: { diameter: 120, strokeWidth: 8, fontSize: 'text-3xl' },
  lg: { diameter: 160, strokeWidth: 10, fontSize: 'text-5xl' },
  xl: { diameter: 200, strokeWidth: 12, fontSize: 'text-6xl' },
};

const maturityLabels = {
  1: 'Initial',
  2: 'Repeatable',
  3: 'Defined',
  4: 'Managed',
  5: 'Optimizing',
};

export const MaturityScore: React.FC<MaturityScoreProps> = ({
  level,
  label,
  score,
  size = 'lg',
  animated = true,
  showProgress = true,
}) => {
  const [displayLevel, setDisplayLevel] = useState(animated ? 0 : level);
  const config = sizeConfig[size];
  const colors = getMaturityColor(level);
  
  const radius = (config.diameter - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (level / 5) * circumference;

  useEffect(() => {
    if (animated) {
      // Animate the level count up
      let current = 0;
      const interval = setInterval(() => {
        current += 0.1;
        if (current >= level) {
          current = level;
          clearInterval(interval);
        }
        setDisplayLevel(current);
      }, 50);

      return () => clearInterval(interval);
    }
  }, [animated, level]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: config.diameter, height: config.diameter }}>
        {/* Animated circular glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            width: config.diameter,
            height: config.diameter,
            borderRadius: '50%',
            border: `2px solid ${colors.accent}`,
          }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.15, 1],
            boxShadow: [
              `0 0 0px ${colors.accent}40`,
              `0 0 40px ${colors.accent}80`,
              `0 0 0px ${colors.accent}40`,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{ 
            width: config.diameter, 
            height: config.diameter,
            borderRadius: '50%',
          }}
        >
          {/* Background circle */}
          <svg
            width={config.diameter}
            height={config.diameter}
            className="absolute transform -rotate-90"
          >
            <circle
              cx={config.diameter / 2}
              cy={config.diameter / 2}
              r={radius}
              stroke={maturityTheme.colors.surface.disabled}
              strokeWidth={config.strokeWidth}
              fill="none"
            />
            {showProgress && (
              <motion.circle
                cx={config.diameter / 2}
                cy={config.diameter / 2}
                r={radius}
                stroke={colors.accent}
                strokeWidth={config.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - progress }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{
                  filter: `drop-shadow(0 0 8px ${colors.accent})`,
                }}
              />
            )}
          </svg>

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              className={`font-bold ${config.fontSize}`}
              style={{ color: colors.text }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              {Math.round(displayLevel)}
            </motion.div>
            {score && (
              <motion.div
                className="text-xs font-medium mt-1"
                style={{ color: maturityTheme.colors.text.secondary }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {score.toFixed(1)}
              </motion.div>
            )}
          </div>

          {/* Glow effect background */}
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-20"
            style={{ backgroundColor: colors.accent }}
          />
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <motion.div
          className="text-lg font-semibold"
          style={{ color: colors.text }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Level {level}: {maturityLabels[level]}
        </motion.div>
        {label && (
          <motion.div
            className="text-sm mt-1"
            style={{ color: maturityTheme.colors.text.muted }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {label}
          </motion.div>
        )}
      </div>
    </div>
  );
};

interface MaturityBadgeProps {
  level: 1 | 2 | 3 | 4 | 5;
  size?: 'sm' | 'md' | 'lg';
}

export const MaturityBadge: React.FC<MaturityBadgeProps> = ({ level, size = 'md' }) => {
  const colors = getMaturityColor(level);
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <motion.div
      className={`inline-flex items-center gap-2 rounded-full font-semibold border ${sizeClasses[size]}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
      whileHover={{ scale: 1.05 }}
    >
      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} />
      Level {level}
    </motion.div>
  );
};
