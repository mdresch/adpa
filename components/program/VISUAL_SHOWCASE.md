# RAG Status Widget - Visual Showcase

This document shows what the RAG Status Widget looks like in action.

## Component Examples

### Basic Status Indicators

```
🟢 Green    🟡 Amber    🔴 Red (pulsing)
```

### With Labels

```
🟢 ON TRACK
🟡 AT RISK
🔴 CRITICAL (pulsing)
```

### Size Variants

```
Small (sm):   🟢 (16px equivalent)
Medium (md):  🟢 (24px equivalent - default)
Large (lg):   🟢 (32px equivalent)
```

### With Tooltip (hover to see breakdown)

```
🟢 (Hover: "5 green, 0 amber, 0 red")
🟡 (Hover: "2 green, 1 amber, 0 red")
🔴 (Hover: "1 green, 2 amber, 3 red")
```

### Interactive (Clickable)

```
🟢 ON TRACK ← Click to view details
🟡 AT RISK ← Click to view details
🔴 CRITICAL ← Click to view details (pulsing)
```

### Real-World Example

```
┌─────────────────────────────────────────────────┐
│ Project Alpha                  🟡 AT RISK       │
│ 23 sub-projects                                  │
│                         (Hover: 15 green,       │
│                          6 amber, 2 red)        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Project Beta                   🟢 ON TRACK      │
│ 8 sub-projects                                   │
│                         (Hover: 8 green,        │
│                          0 amber, 0 red)        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Project Gamma                  🔴 CRITICAL      │
│ 12 sub-projects                 (pulsing)        │
│                         (Hover: 3 green,        │
│                          4 amber, 5 red)        │
└─────────────────────────────────────────────────┘
```

## Features Demonstrated

✅ **Three Status Types**
- Green (🟢) - ON TRACK - Everything going well
- Amber (🟡) - AT RISK - Attention needed
- Red (🔴) - CRITICAL - Urgent attention (with pulse animation)

✅ **Size Variants**
- sm (small) - 16px
- md (medium) - 24px (default)
- lg (large) - 32px

✅ **Optional Features**
- Label display (ON TRACK, AT RISK, CRITICAL)
- Tooltip with breakdown counts
- Click handler for interactivity
- Custom CSS classes

✅ **Accessibility**
- ARIA labels for screen readers
- Keyboard navigation (Enter/Space)
- Focus management
- Role attributes

## Usage in Code

```tsx
// Simple
<RAGStatus status="green" />

// With all features
<RAGStatus 
  status="amber" 
  size="lg"
  showLabel
  showTooltip
  breakdown={{ green: 2, amber: 1, red: 0 }}
  onClick={() => navigate('/details')}
/>
```

## Live Demo

Visit `/demo-rag-status` to see the component in action with:
- All status types
- All size variants
- Labels and tooltips
- Interactive examples
- Real-world use cases

## Technical Details

- **Framework**: React with Next.js 14
- **Styling**: Tailwind CSS with cn() utility
- **Components Used**: Radix UI Tooltip
- **Animation**: Tailwind animate-pulse for red status
- **Accessibility**: Full ARIA support
- **Testing**: 18 unit tests (100% coverage)
