# Beacon 2.3: RAG Status Widget (Frontend Component)

## Owner
Frontend Agent #2 (can run parallel with other UI beacons)

## Duration
10 minutes with GitHub Copilot

## Dependencies
None (standalone reusable component)

## Epic
ADPA v3.0 - Program Management UI

## Description
Create a reusable React component that displays RAG (Red/Amber/Green) status with traffic light visualization. Used throughout ADPA for program status, project status, risk status, etc.

---

## Requirements

### New Component: components/program/RAGStatus.tsx

**Component Props:**
```typescript
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
  className?: string;
}
```

**Visual Styles:**
- Traffic light circle: 🟢 green, 🟡 amber, 🔴 red
- Sizes: sm (16px), md (24px), lg (32px)
- Optional label: "ON TRACK" | "AT RISK" | "CRITICAL"
- Optional tooltip: Hover to see breakdown (e.g., "2 green, 1 amber, 0 red")

**Behavior:**
- Animated: Pulse effect for red status (urgent attention)
- Accessible: ARIA labels for screen readers
- Clickable: Optional onClick handler for drill-down
- Real-time: Can subscribe to WebSocket for status updates

**Usage Examples:**
```typescript
// Simple usage
<RAGStatus status="green" />

// With label
<RAGStatus status="amber" showLabel />

// With breakdown tooltip (for programs)
<RAGStatus 
  status="amber" 
  showTooltip
  breakdown={{ green: 2, amber: 1, red: 0 }}
/>

// Large with click handler
<RAGStatus 
  status="red" 
  size="lg" 
  showLabel
  onClick={() => navigate('/programs/123/risks')}
/>
```

---

## Reference Files

**Study these patterns:**
- `components/ui/badge.tsx` - Badge component patterns
- `components/ui/button.tsx` - Size variants (sm/md/lg)
- `app/projects/[id]/page.tsx` - How status is currently displayed
- `components/ui/tooltip.tsx` - Tooltip implementation

**Tailwind patterns:**
- Use `cn()` utility from `lib/utils.ts` for className merging
- Status colors from ADPA theme (see tailwind.config.ts)

---

## Implementation

**Component Structure:**
```typescript
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RAGStatusProps {
  status: 'green' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  breakdown?: { green: number; amber: number; red: number };
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
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  const statusConfig = {
    green: { icon: '🟢', label: 'ON TRACK', color: 'text-green-600' },
    amber: { icon: '🟡', label: 'AT RISK', color: 'text-yellow-600' },
    red: { icon: '🔴', label: 'CRITICAL', color: 'text-red-600', pulse: true }
  };
  
  const config = statusConfig[status];
  
  const indicator = (
    <span className={cn(
      sizeClasses[size],
      config.pulse && 'animate-pulse',
      onClick && 'cursor-pointer hover:scale-110 transition-transform',
      className
    )}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    aria-label={`Status: ${config.label}`}
    >
      {config.icon}
    </span>
  );
  
  // Wrap with tooltip if breakdown provided
  // Add label if showLabel
  // Return component
}
```

**Styling:**
- Green: `bg-green-100 text-green-800 border-green-300`
- Amber: `bg-yellow-100 text-yellow-800 border-yellow-300`
- Red: `bg-red-100 text-red-800 border-red-300` + pulse animation

---

## Testing

**Create:** `components/program/__tests__/RAGStatus.test.tsx`

**Test cases:**
- Renders green status correctly
- Renders amber status correctly
- Renders red status correctly (with pulse)
- Shows label when showLabel=true
- Shows tooltip with breakdown when provided
- Handles onClick callback
- Different sizes render correctly
- Accessible (ARIA labels)

---

## Output Files

1. `components/program/RAGStatus.tsx` - Main component
2. `components/program/__tests__/RAGStatus.test.tsx` - Unit tests

---

## Success Criteria

- [x] Component renders all 3 status types
- [x] Size variants work (sm, md, lg)
- [x] Label display works
- [x] Tooltip with breakdown works
- [x] Click handler works
- [x] Red status pulses (animation)
- [x] Accessible (ARIA labels, keyboard support)
- [x] Tests pass (80%+ coverage)
- [x] Used in Programs list and detail pages
- [x] Reusable across ADPA (projects, risks, etc.)

---

## Time Estimate

**Traditional:** 3-4 hours (component + variants + tooltip + tests + styling)
**With Copilot:** 10 minutes (AI generates, human tweaks colors)
**Savings:** 95% faster!

---

**Status:** Ready for AI generation  
**Priority:** MEDIUM (reusable component, used by other beacons)  
**Parallel:** Can develop independently (no dependencies)

