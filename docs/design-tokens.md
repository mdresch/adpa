# Design Tokens & Theming Guide

**Document Version:** 1.0  
**Date:** Week 1, Phase 1  
**Status:** Design Token Usage Reference

---

## Overview

ADPA uses a comprehensive design token system defined in `lib/theme/maturity-portal-theme.ts`. This system provides consistent colors, spacing, typography, and other design values across the application.

---

## Quick Start

### Importing the Theme

```typescript
import { maturityTheme, getMaturityColor, getChartColor } from '@/lib/theme/maturity-portal-theme'
```

### Basic Usage

```typescript
// Access colors directly
const primaryColor = maturityTheme.colors.primary[500]
const spacing = maturityTheme.spacing.md

// Use in inline styles
<div style={{ backgroundColor: maturityTheme.colors.background.primary }}>
  Content
</div>

// Use with Tailwind (via CSS variables)
<div className="bg-[var(--color-bg-primary)]">
  Content
</div>
```

---

## Token Reference

### Colors

#### Primary Palette

Deep professional blues (50-950 scale):

```typescript
maturityTheme.colors.primary[500]  // Main brand blue: #0066e6
maturityTheme.colors.primary[400]  // Lighter: #1a80ff
maturityTheme.colors.primary[600]  // Darker: #0052b8
```

#### Secondary Palette

Modern accent blues:

```typescript
maturityTheme.colors.secondary[500]  // Vibrant accent: #009fe6
```

#### Background Colors

```typescript
maturityTheme.colors.background.primary    // Deep navy: #0a1128
maturityTheme.colors.background.secondary   // Cards: #0f1736
maturityTheme.colors.background.tertiary    // Hover states: #141d44
maturityTheme.colors.background.elevated    // Elevated elements: #1a2452
maturityTheme.colors.background.muted       // Muted sections: #0d1431
```

#### Surface Colors

```typescript
maturityTheme.colors.surface.default   // Default surface
maturityTheme.colors.surface.hover     // Hover state
maturityTheme.colors.surface.active    // Active state
maturityTheme.colors.surface.disabled  // Disabled state
```

#### Text Colors

```typescript
maturityTheme.colors.text.primary    // High contrast: #e8edf7
maturityTheme.colors.text.secondary  // Secondary: #b8c5e0
maturityTheme.colors.text.muted      // Muted: #8896b8
maturityTheme.colors.text.inverse    // On light backgrounds: #0a1128
maturityTheme.colors.text.accent      // Links: #4d9cff
```

#### Semantic Colors

```typescript
// Success
maturityTheme.colors.success.bg
maturityTheme.colors.success.border
maturityTheme.colors.success.text
maturityTheme.colors.success.accent

// Warning
maturityTheme.colors.warning.bg
maturityTheme.colors.warning.border
maturityTheme.colors.warning.text
maturityTheme.colors.warning.accent

// Error
maturityTheme.colors.error.bg
maturityTheme.colors.error.border
maturityTheme.colors.error.text
maturityTheme.colors.error.accent

// Info
maturityTheme.colors.info.bg
maturityTheme.colors.info.border
maturityTheme.colors.info.text
maturityTheme.colors.info.accent
```

#### Border Colors

```typescript
maturityTheme.colors.border.default  // Default border
maturityTheme.colors.border.muted    // Muted border
maturityTheme.colors.border.accent    // Accent border
maturityTheme.colors.border.hover    // Hover border
```

---

### Spacing Scale

```typescript
maturityTheme.spacing.xs    // 0.25rem (4px)
maturityTheme.spacing.sm    // 0.5rem (8px)
maturityTheme.spacing.md    // 1rem (16px)
maturityTheme.spacing.lg    // 1.5rem (24px)
maturityTheme.spacing.xl    // 2rem (32px)
maturityTheme.spacing['2xl'] // 3rem (48px)
maturityTheme.spacing['3xl'] // 4rem (64px)
maturityTheme.spacing['4xl'] // 6rem (96px)
```

**Usage:**
```typescript
<div style={{ padding: maturityTheme.spacing.md }}>
  Content
</div>
```

---

### Border Radius

```typescript
maturityTheme.radius.sm     // 0.375rem (6px)
maturityTheme.radius.md     // 0.5rem (8px)
maturityTheme.radius.lg     // 0.75rem (12px)
maturityTheme.radius.xl     // 1rem (16px)
maturityTheme.radius['2xl'] // 1.5rem (24px)
maturityTheme.radius.full   // 9999px (fully rounded)
```

---

### Shadows

```typescript
maturityTheme.shadows.sm          // Small shadow
maturityTheme.shadows.md          // Medium shadow
maturityTheme.shadows.lg          // Large shadow
maturityTheme.shadows.xl          // Extra large shadow
maturityTheme.shadows.glow        // Glow effect
maturityTheme.shadows.glowStrong  // Strong glow effect
```

**Usage:**
```typescript
<div style={{ boxShadow: maturityTheme.shadows.lg }}>
  Elevated content
</div>
```

---

### Typography

#### Font Families

```typescript
maturityTheme.typography.fontFamily.sans  // Inter, system-ui, -apple-system, sans-serif
maturityTheme.typography.fontFamily.mono  // JetBrains Mono, Consolas, monospace
```

#### Font Sizes

```typescript
maturityTheme.typography.fontSize.xs     // 0.75rem (12px)
maturityTheme.typography.fontSize.sm      // 0.875rem (14px)
maturityTheme.typography.fontSize.base    // 1rem (16px)
maturityTheme.typography.fontSize.lg      // 1.125rem (18px)
maturityTheme.typography.fontSize.xl      // 1.25rem (20px)
maturityTheme.typography.fontSize['2xl']  // 1.5rem (24px)
maturityTheme.typography.fontSize['3xl']  // 1.875rem (30px)
maturityTheme.typography.fontSize['4xl']  // 2.25rem (36px)
maturityTheme.typography.fontSize['5xl']  // 3rem (48px)
maturityTheme.typography.fontSize['6xl']  // 3.75rem (60px)
```

#### Font Weights

```typescript
maturityTheme.typography.fontWeight.normal   // 400
maturityTheme.typography.fontWeight.medium   // 500
maturityTheme.typography.fontWeight.semibold // 600
maturityTheme.typography.fontWeight.bold     // 700
```

#### Line Heights

```typescript
maturityTheme.typography.lineHeight.tight    // 1.25
maturityTheme.typography.lineHeight.normal   // 1.5
maturityTheme.typography.lineHeight.relaxed // 1.75
```

---

### Animation

#### Duration

```typescript
maturityTheme.animation.duration.fast   // 150ms
maturityTheme.animation.duration.normal // 300ms
maturityTheme.animation.duration.slow    // 500ms
```

#### Easing

```typescript
maturityTheme.animation.easing.default // cubic-bezier(0.4, 0, 0.2, 1)
maturityTheme.animation.easing.in      // cubic-bezier(0.4, 0, 1, 1)
maturityTheme.animation.easing.out     // cubic-bezier(0, 0, 0.2, 1)
maturityTheme.animation.easing.inOut   // cubic-bezier(0.4, 0, 0.2, 1)
```

---

### Breakpoints

```typescript
maturityTheme.breakpoints.sm    // 640px
maturityTheme.breakpoints.md    // 768px
maturityTheme.breakpoints.lg    // 1024px
maturityTheme.breakpoints.xl    // 1280px
maturityTheme.breakpoints['2xl'] // 1536px
```

**Note:** These match Tailwind's default breakpoints. Use Tailwind's responsive utilities (`sm:`, `md:`, etc.) instead of accessing these directly.

---

## Maturity Colors

The theme includes a special maturity color system for displaying maturity levels (1-5).

### Using `getMaturityColor()`

```typescript
import { getMaturityColor } from '@/lib/theme/maturity-portal-theme'

// Get colors for a specific maturity level
const level1Colors = getMaturityColor(1)
const level3Colors = getMaturityColor(3)
const level5Colors = getMaturityColor(5)

// Access individual color properties
const bgColor = level3Colors.bg      // Background color
const borderColor = level3Colors.border // Border color
const textColor = level3Colors.text    // Text color
const accentColor = level3Colors.accent // Accent color
```

### Maturity Level Colors

| Level | Background | Border | Text | Accent | Use Case |
|-------|-----------|--------|------|--------|----------|
| 1 | `#3d1f1f` | `#8b2e2e` | `#ff6b6b` | `#ff4757` | Initial/Ad-hoc |
| 2 | `#3d2a1f` | `#b8622e` | `#ffa726` | `#ff9800` | Managed |
| 3 | `#1f2d3d` | `#2e6cb8` | `#5eb8ff` | `#42a5f5` | Defined |
| 4 | `#1f3d2a` | `#2eb862` | `#6bff9f` | `#4caf50` | Quantitatively Managed |
| 5 | `#2d1f3d` | `#7e2eb8` | `#b96bff` | `#ab47bc` | Optimizing |

### Example: Maturity Badge Component

```typescript
import { getMaturityColor } from '@/lib/theme/maturity-portal-theme'

interface MaturityBadgeProps {
  level: 1 | 2 | 3 | 4 | 5
  label: string
}

export function MaturityBadge({ level, label }: MaturityBadgeProps) {
  const colors = getMaturityColor(level)
  
  return (
    <div
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {label}
    </div>
  )
}
```

### Example: Maturity Progress Bar

```typescript
import { getMaturityColor } from '@/lib/theme/maturity-portal-theme'

function MaturityProgressBar({ currentLevel }: { currentLevel: number }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((level) => {
        const colors = getMaturityColor(level)
        const isActive = level <= currentLevel
        
        return (
          <div
            key={level}
            style={{
              flex: 1,
              height: '8px',
              backgroundColor: isActive ? colors.accent : colors.bg,
              borderRadius: '4px',
            }}
          />
        )
      })}
    </div>
  )
}
```

---

## Chart Colors

The theme provides predefined color palettes for data visualization.

### Using `getChartColor()`

```typescript
import { getChartColor } from '@/lib/theme/maturity-portal-theme'

// Get a color from the primary palette (cycles through colors)
const color1 = getChartColor(0, 'primary')  // First color
const color2 = getChartColor(1, 'primary') // Second color
const color3 = getChartColor(2, 'primary') // Third color
// ... continues cycling through the palette

// Get maturity colors
const maturityColor1 = getChartColor(0, 'maturity')  // Level 1 color
const maturityColor2 = getChartColor(1, 'maturity') // Level 2 color

// Get knowledge area colors (PMBOK 10 knowledge areas)
const integrationColor = getChartColor(0, 'knowledge')  // Integration
const scopeColor = getChartColor(1, 'knowledge')        // Scope
const scheduleColor = getChartColor(2, 'knowledge')     // Schedule
// ... continues for all 10 knowledge areas
```

### Chart Color Types

#### Primary Palette
5 shades of blue for general charts:
```typescript
getChartColor(0, 'primary') // #0066e6
getChartColor(1, 'primary') // #1a80ff
getChartColor(2, 'primary') // #4d9cff
getChartColor(3, 'primary') // #80b8ff
getChartColor(4, 'primary') // #b3d4ff
```

#### Maturity Palette
5 colors matching maturity levels:
```typescript
getChartColor(0, 'maturity') // #ff4757 (Level 1)
getChartColor(1, 'maturity') // #ff9800 (Level 2)
getChartColor(2, 'maturity') // #42a5f5 (Level 3)
getChartColor(3, 'maturity') // #4caf50 (Level 4)
getChartColor(4, 'maturity') // #ab47bc (Level 5)
```

#### Knowledge Palette
10 colors for PMBOK knowledge areas:
```typescript
getChartColor(0, 'knowledge') // Integration: #0066e6
getChartColor(1, 'knowledge') // Scope: #1a80ff
getChartColor(2, 'knowledge') // Schedule: #4d9cff
getChartColor(3, 'knowledge') // Cost: #009fe6
getChartColor(4, 'knowledge') // Quality: #1ab0ff
getChartColor(5, 'knowledge') // Resource: #4dc2ff
getChartColor(6, 'knowledge') // Communication: #42a5f5
getChartColor(7, 'knowledge') // Risk: #2196f3
getChartColor(8, 'knowledge') // Procurement: #1976d2
getChartColor(9, 'knowledge') // Stakeholder: #1565c0
```

### Example: Recharts Bar Chart

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { getChartColor } from '@/lib/theme/maturity-portal-theme'

const data = [
  { name: 'Integration', value: 85 },
  { name: 'Scope', value: 72 },
  { name: 'Schedule', value: 90 },
  { name: 'Cost', value: 68 },
]

export function KnowledgeAreaChart() {
  return (
    <BarChart data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar 
        dataKey="value" 
        fill={getChartColor(0, 'knowledge')}
      />
    </BarChart>
  )
}
```

### Example: Multi-Series Chart

```typescript
import { LineChart, Line } from 'recharts'
import { getChartColor } from '@/lib/theme/maturity-portal-theme'

const data = [
  { month: 'Jan', project1: 100, project2: 120, project3: 90 },
  { month: 'Feb', project1: 110, project2: 130, project3: 95 },
  // ...
]

export function MultiProjectChart() {
  return (
    <LineChart data={data}>
      <Line 
        dataKey="project1" 
        stroke={getChartColor(0, 'primary')}
        name="Project 1"
      />
      <Line 
        dataKey="project2" 
        stroke={getChartColor(1, 'primary')}
        name="Project 2"
      />
      <Line 
        dataKey="project3" 
        stroke={getChartColor(2, 'primary')}
        name="Project 3"
      />
    </LineChart>
  )
}
```

### Example: Pie Chart with Maturity Colors

```typescript
import { PieChart, Pie, Cell } from 'recharts'
import { getChartColor } from '@/lib/theme/maturity-portal-theme'

const data = [
  { name: 'Level 1', value: 5 },
  { name: 'Level 2', value: 15 },
  { name: 'Level 3', value: 30 },
  { name: 'Level 4', value: 35 },
  { name: 'Level 5', value: 15 },
]

export function MaturityDistributionChart() {
  return (
    <PieChart>
      <Pie data={data} dataKey="value">
        {data.map((entry, index) => (
          <Cell 
            key={`cell-${index}`} 
            fill={getChartColor(index, 'maturity')} 
          />
        ))}
      </Pie>
    </PieChart>
  )
}
```

---

## CSS Variables Integration

The theme exports CSS variables for use with Tailwind CSS or plain CSS.

### Available CSS Variables

```css
/* Background colors */
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary
--color-bg-elevated

/* Text colors */
--color-text-primary
--color-text-secondary
--color-text-muted
--color-text-accent

/* Primary colors */
--color-primary
--color-primary-hover
--color-primary-active

/* Border colors */
--color-border
--color-border-muted
--color-border-accent
```

### Using CSS Variables

```typescript
// In your component
<div className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
  Content
</div>

// Or in CSS
.custom-element {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
```

### Injecting CSS Variables

To use the CSS variables, inject them into your app:

```typescript
// In your root layout or _app.tsx
import { maturityThemeCssVariables } from '@/lib/theme/maturity-portal-theme'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${maturityThemeCssVariables} }` }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

## Usage Examples

### Example 1: Card Component

```typescript
import { maturityTheme } from '@/lib/theme/maturity-portal-theme'

export function ThemedCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: maturityTheme.colors.surface.default,
        borderColor: maturityTheme.colors.border.default,
        borderRadius: maturityTheme.radius.lg,
        padding: maturityTheme.spacing.lg,
        boxShadow: maturityTheme.shadows.md,
      }}
    >
      {children}
    </div>
  )
}
```

### Example 2: Button Variants

```typescript
import { maturityTheme } from '@/lib/theme/maturity-portal-theme'

export function ThemedButton({ 
  variant = 'primary',
  children 
}: { 
  variant?: 'primary' | 'secondary' | 'success' | 'error'
  children: React.ReactNode 
}) {
  const variantStyles = {
    primary: {
      backgroundColor: maturityTheme.colors.primary[500],
      color: maturityTheme.colors.text.primary,
    },
    secondary: {
      backgroundColor: maturityTheme.colors.secondary[500],
      color: maturityTheme.colors.text.primary,
    },
    success: {
      backgroundColor: maturityTheme.colors.success.accent,
      color: maturityTheme.colors.text.primary,
    },
    error: {
      backgroundColor: maturityTheme.colors.error.accent,
      color: maturityTheme.colors.text.primary,
    },
  }

  return (
    <button
      style={{
        ...variantStyles[variant],
        padding: `${maturityTheme.spacing.sm} ${maturityTheme.spacing.md}`,
        borderRadius: maturityTheme.radius.md,
        fontSize: maturityTheme.typography.fontSize.base,
        fontWeight: maturityTheme.typography.fontWeight.medium,
        border: 'none',
        cursor: 'pointer',
        transition: `all ${maturityTheme.animation.duration.normal} ${maturityTheme.animation.easing.default}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.9'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1'
      }}
    >
      {children}
    </button>
  )
}
```

### Example 3: Typography System

```typescript
import { maturityTheme } from '@/lib/theme/maturity-portal-theme'

export function Heading({ 
  level = 1, 
  children 
}: { 
  level?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode 
}) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  const sizeMap = {
    1: maturityTheme.typography.fontSize['4xl'],
    2: maturityTheme.typography.fontSize['3xl'],
    3: maturityTheme.typography.fontSize['2xl'],
    4: maturityTheme.typography.fontSize.xl,
    5: maturityTheme.typography.fontSize.lg,
    6: maturityTheme.typography.fontSize.base,
  }

  return (
    <Tag
      style={{
        fontSize: sizeMap[level],
        fontWeight: maturityTheme.typography.fontWeight.bold,
        lineHeight: maturityTheme.typography.lineHeight.tight,
        color: maturityTheme.colors.text.primary,
        fontFamily: maturityTheme.typography.fontFamily.sans,
      }}
    >
      {children}
    </Tag>
  )
}
```

### Example 4: Status Badge

```typescript
import { maturityTheme } from '@/lib/theme/maturity-portal-theme'

type Status = 'success' | 'warning' | 'error' | 'info'

export function StatusBadge({ 
  status, 
  label 
}: { 
  status: Status
  label: string 
}) {
  const statusColors = maturityTheme.colors[status]

  return (
    <span
      style={{
        backgroundColor: statusColors.bg,
        borderColor: statusColors.border,
        color: statusColors.text,
        padding: `${maturityTheme.spacing.xs} ${maturityTheme.spacing.sm}`,
        borderRadius: maturityTheme.radius.full,
        borderWidth: '1px',
        borderStyle: 'solid',
        fontSize: maturityTheme.typography.fontSize.xs,
        fontWeight: maturityTheme.typography.fontWeight.medium,
      }}
    >
      {label}
    </span>
  )
}
```

---

## Best Practices

### 1. Use Theme Tokens, Not Hardcoded Values

❌ **Bad:**
```typescript
<div style={{ padding: '16px', color: '#0066e6' }}>
  Content
</div>
```

✅ **Good:**
```typescript
<div style={{ 
  padding: maturityTheme.spacing.md, 
  color: maturityTheme.colors.primary[500] 
}}>
  Content
</div>
```

### 2. Prefer Tailwind Classes When Possible

For most cases, use Tailwind's utility classes which reference CSS variables:

```typescript
// Instead of inline styles, use Tailwind
<div className="p-4 text-primary bg-background">
  Content
</div>
```

### 3. Use Helper Functions for Dynamic Colors

❌ **Bad:**
```typescript
const colors = maturityTheme.colors.maturity.level3
```

✅ **Good:**
```typescript
const colors = getMaturityColor(3)
```

### 4. Type Safety

The theme is fully typed. Use TypeScript to get autocomplete and type checking:

```typescript
// TypeScript will autocomplete available options
maturityTheme.colors.primary[500]  // ✅ Valid
maturityTheme.colors.primary[999] // ❌ Type error
```

### 5. Consistent Spacing

Always use the spacing scale:

```typescript
// Consistent spacing
<div style={{ marginBottom: maturityTheme.spacing.md }}>
  <div style={{ padding: maturityTheme.spacing.lg }}>
    Content
  </div>
</div>
```

---

## Integration with Tailwind CSS

The theme works seamlessly with Tailwind CSS through CSS variables defined in `app/globals.css`. The Tailwind config (`tailwind.config.ts`) references these variables.

### Using Tailwind Classes

```typescript
// These classes use the theme tokens via CSS variables
<div className="bg-background text-foreground p-4 rounded-lg">
  Content
</div>
```

### Custom Tailwind Utilities

You can extend Tailwind to use theme tokens directly:

```typescript
// tailwind.config.ts
import { maturityTheme } from './lib/theme/maturity-portal-theme'

export default {
  theme: {
    extend: {
      colors: {
        'maturity-1': maturityTheme.colors.maturity.level1.accent,
        'maturity-2': maturityTheme.colors.maturity.level2.accent,
        // ...
      },
      spacing: maturityTheme.spacing,
      borderRadius: maturityTheme.radius,
    },
  },
}
```

---

## Migration Guide

### From Hardcoded Values

If you have components with hardcoded colors/spacing:

1. **Identify hardcoded values:**
   ```typescript
   // Before
   <div style={{ padding: '16px', backgroundColor: '#0066e6' }}>
   ```

2. **Replace with theme tokens:**
   ```typescript
   // After
   <div style={{ 
     padding: maturityTheme.spacing.md, 
     backgroundColor: maturityTheme.colors.primary[500] 
   }}>
   ```

3. **Or use Tailwind classes:**
   ```typescript
   // Even better
   <div className="p-4 bg-primary">
   ```

---

## Troubleshooting

### Theme Not Found

If you get import errors:
```typescript
// Ensure correct import path
import { maturityTheme } from '@/lib/theme/maturity-portal-theme'
```

### Colors Not Applying

If colors don't appear:
1. Check that CSS variables are injected (see CSS Variables Integration)
2. Verify Tailwind config references CSS variables
3. Ensure dark mode classes are applied if using dark theme

### Type Errors

If TypeScript complains:
```typescript
// Ensure you're using the correct property names
maturityTheme.colors.primary[500]  // ✅
maturityTheme.colors.primary.500   // ❌ (use bracket notation)
```

---

## Reference

### Complete Token List

See `lib/theme/maturity-portal-theme.ts` for the complete token definition.

### Related Files

- `lib/theme/maturity-portal-theme.ts` - Theme definition
- `app/globals.css` - CSS variables and Tailwind integration
- `tailwind.config.ts` - Tailwind configuration
- `components/onboarding/MaturityCard.tsx` - Example usage

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Week 1, Phase 1 | Initial design tokens documentation | ADPA Team |

---

**End of Document**

