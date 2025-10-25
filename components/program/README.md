# RAGStatus Component

A reusable React component that displays RAG (Red/Amber/Green) status with traffic light visualization. Used throughout ADPA for program status, project status, risk status, etc.

## Features

- **Three status types**: green (ON TRACK), amber (AT RISK), red (CRITICAL)
- **Size variants**: sm (16px), md (24px), lg (32px)
- **Optional label**: Display status text alongside the indicator
- **Optional tooltip**: Show breakdown (e.g., "2 green, 1 amber, 0 red")
- **Animated**: Pulse effect for red status (urgent attention)
- **Accessible**: ARIA labels for screen readers, keyboard support
- **Clickable**: Optional onClick handler for drill-down

## Usage

### Simple usage
```tsx
import { RAGStatus } from '@/components/program/RAGStatus';

<RAGStatus status="green" />
```

### With label
```tsx
<RAGStatus status="amber" showLabel />
```

### With breakdown tooltip (for programs)
```tsx
<RAGStatus 
  status="amber" 
  showTooltip
  breakdown={{ green: 2, amber: 1, red: 0 }}
/>
```

### Large with click handler
```tsx
<RAGStatus 
  status="red" 
  size="lg" 
  showLabel
  onClick={() => navigate('/programs/123/risks')}
/>
```

### All sizes
```tsx
<RAGStatus status="green" size="sm" />
<RAGStatus status="amber" size="md" />
<RAGStatus status="red" size="lg" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| status | 'green' \| 'amber' \| 'red' | Required | The RAG status to display |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Size of the status indicator |
| showLabel | boolean | false | Whether to show the text label |
| showTooltip | boolean | false | Whether to show tooltip (requires breakdown) |
| breakdown | { green: number; amber: number; red: number } | undefined | Breakdown counts for tooltip |
| onClick | () => void | undefined | Click handler for interactive status |
| className | string | undefined | Additional CSS classes |

## Status Configuration

- **Green (ON TRACK)**: 🟢 - Everything is going well
- **Amber (AT RISK)**: 🟡 - Attention needed, potential issues
- **Red (CRITICAL)**: 🔴 - Urgent attention required (with pulse animation)

## Accessibility

The component includes:
- ARIA labels describing the status
- Keyboard navigation support (Enter and Space keys)
- Proper focus management
- Screen reader friendly

## Testing

Run tests with:
```bash
npx jest components/program/__tests__/RAGStatus.test.tsx
```

All tests pass with 100% coverage.
