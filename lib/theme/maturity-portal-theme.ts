/**
 * PM Maturity Portal Theme
 * Professional dark blue design system for revolutionary onboarding experience
 */

export const maturityTheme = {
  // Core brand colors - Professional dark blues
  colors: {
    // Primary palette - Deep professional blues
    primary: {
      50: '#e6f0ff',
      100: '#b3d4ff',
      200: '#80b8ff',
      300: '#4d9cff',
      400: '#1a80ff',
      500: '#0066e6',  // Main brand blue
      600: '#0052b8',
      700: '#003d8a',
      800: '#00295c',
      900: '#00142e',
      950: '#000a17',
    },
    
    // Secondary palette - Modern accent blues
    secondary: {
      50: '#e6f7ff',
      100: '#b3e5ff',
      200: '#80d4ff',
      300: '#4dc2ff',
      400: '#1ab0ff',
      500: '#009fe6',  // Vibrant accent
      600: '#007eb8',
      700: '#005e8a',
      800: '#003d5c',
      900: '#001d2e',
    },
    
    // Background colors - Dark professional
    background: {
      primary: '#0a1128',      // Deep navy - main background
      secondary: '#0f1736',    // Slightly lighter - cards
      tertiary: '#141d44',     // Card hover states
      elevated: '#1a2452',     // Elevated elements
      muted: '#0d1431',        // Muted sections
    },
    
    // Surface colors - For cards and containers
    surface: {
      default: '#1a2452',
      hover: '#202d5f',
      active: '#26356c',
      disabled: '#141d44',
    },
    
    // Text colors - Optimized for dark backgrounds
    text: {
      primary: '#e8edf7',      // Primary text - high contrast
      secondary: '#b8c5e0',    // Secondary text
      muted: '#8896b8',        // Muted text
      inverse: '#0a1128',      // Text on light backgrounds
      accent: '#4d9cff',       // Accent text (links)
    },
    
    // Status colors - Maturity levels and states
    maturity: {
      level1: {
        bg: '#3d1f1f',
        border: '#8b2e2e',
        text: '#ff6b6b',
        accent: '#ff4757',
      },
      level2: {
        bg: '#3d2a1f',
        border: '#b8622e',
        text: '#ffa726',
        accent: '#ff9800',
      },
      level3: {
        bg: '#1f2d3d',
        border: '#2e6cb8',
        text: '#5eb8ff',
        accent: '#42a5f5',
      },
      level4: {
        bg: '#1f3d2a',
        border: '#2eb862',
        text: '#6bff9f',
        accent: '#4caf50',
      },
      level5: {
        bg: '#2d1f3d',
        border: '#7e2eb8',
        text: '#b96bff',
        accent: '#ab47bc',
      },
    },
    
    // Semantic colors
    success: {
      bg: '#1f3d2a',
      border: '#2eb862',
      text: '#6bff9f',
      accent: '#4caf50',
    },
    warning: {
      bg: '#3d2f1f',
      border: '#b88e2e',
      text: '#ffd96b',
      accent: '#ffc107',
    },
    error: {
      bg: '#3d1f1f',
      border: '#8b2e2e',
      text: '#ff6b6b',
      accent: '#f44336',
    },
    info: {
      bg: '#1f2d3d',
      border: '#2e6cb8',
      text: '#5eb8ff',
      accent: '#2196f3',
    },
    
    // Border colors
    border: {
      default: '#26356c',
      muted: '#1a2452',
      accent: '#4d9cff',
      hover: '#5eb8ff',
    },
    
    // Chart colors - For data visualization
    chart: {
      primary: ['#0066e6', '#1a80ff', '#4d9cff', '#80b8ff', '#b3d4ff'],
      maturity: ['#ff4757', '#ff9800', '#42a5f5', '#4caf50', '#ab47bc'],
      knowledge: [
        '#0066e6', // Integration
        '#1a80ff', // Scope
        '#4d9cff', // Schedule
        '#009fe6', // Cost
        '#1ab0ff', // Quality
        '#4dc2ff', // Resource
        '#42a5f5', // Communication
        '#2196f3', // Risk
        '#1976d2', // Procurement
        '#1565c0', // Stakeholder
      ],
    },
  },
  
  // Spacing scale
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  
  // Border radius
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  
  // Shadows - Enhanced for dark theme
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 102, 230, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 102, 230, 0.15)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 102, 230, 0.2)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.5), 0 10px 10px rgba(0, 102, 230, 0.25)',
    glow: '0 0 20px rgba(77, 156, 255, 0.3), 0 0 40px rgba(77, 156, 255, 0.1)',
    glowStrong: '0 0 30px rgba(77, 156, 255, 0.5), 0 0 60px rgba(77, 156, 255, 0.2)',
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Animation
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Utility functions
export const getMaturityColor = (level: 1 | 2 | 3 | 4 | 5) => {
  return maturityTheme.colors.maturity[`level${level}`];
};

export const getChartColor = (index: number, type: 'primary' | 'maturity' | 'knowledge' = 'primary') => {
  const colors = maturityTheme.colors.chart[type];
  return colors[index % colors.length];
};

// CSS variables for integration with Tailwind
export const maturityThemeCssVariables = `
  --color-bg-primary: ${maturityTheme.colors.background.primary};
  --color-bg-secondary: ${maturityTheme.colors.background.secondary};
  --color-bg-tertiary: ${maturityTheme.colors.background.tertiary};
  --color-bg-elevated: ${maturityTheme.colors.background.elevated};
  
  --color-text-primary: ${maturityTheme.colors.text.primary};
  --color-text-secondary: ${maturityTheme.colors.text.secondary};
  --color-text-muted: ${maturityTheme.colors.text.muted};
  --color-text-accent: ${maturityTheme.colors.text.accent};
  
  --color-primary: ${maturityTheme.colors.primary[500]};
  --color-primary-hover: ${maturityTheme.colors.primary[400]};
  --color-primary-active: ${maturityTheme.colors.primary[600]};
  
  --color-border: ${maturityTheme.colors.border.default};
  --color-border-muted: ${maturityTheme.colors.border.muted};
  --color-border-accent: ${maturityTheme.colors.border.accent};
`;
