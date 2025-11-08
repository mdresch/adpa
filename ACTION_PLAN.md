# Code Quality Action Plan - Development Branch

This document provides actionable steps to address the issues found in the code review of the development branch.

## Quick Wins (Can be done immediately)

### 1. Auto-fix Linting Issues (15-30 minutes)

```bash
# Run ESLint auto-fix
pnpm lint --fix

# This will automatically fix:
# - Remove unused imports
# - Fix some spacing/formatting issues
# - Fix some simple no-unescaped-entities issues
```

**Expected reduction**: ~150-200 errors auto-fixed

### 2. Add .gitignore Entry (2 minutes)

The `.gitignore` file already looks good and includes common patterns. No changes needed.

---

## Critical Priority Tasks

### Task 1: Fix Failing Database Tests (2-4 hours)

**Location**: `__tests__/lib/db.test.ts`

**Issue**: 2 tests failing due to SQL function import issues

**Steps**:
1. Check `lib/db.ts` imports:
   ```typescript
   // Ensure proper import
   import { sql } from '@vercel/postgres';
   // NOT: import * as postgres from '@vercel/postgres';
   ```

2. Verify environment variables in test:
   ```typescript
   // Add to test setup
   process.env.POSTGRES_URL = 'postgresql://localhost:5432/test';
   ```

3. Update test mocks if needed

4. Run tests: `pnpm test:db-unit`

**Success Criteria**: All 18 tests passing

---

### Task 2: Fix Security Vulnerabilities (1-2 hours)

**Issue**: 3 moderate vulnerabilities in `react-syntax-highlighter`

**Option A: Upgrade (Recommended)**
```bash
# Update to latest version
npm install react-syntax-highlighter@latest --save

# Check breaking changes
# https://github.com/react-syntax-highlighter/react-syntax-highlighter/releases
```

**Files to test after upgrade**:
- `app/demo-document-viewer/page.tsx`
- `app/documents/[id]/view/page.tsx`
- Any component using syntax highlighting

**Option B: Replace Library**
```bash
# Alternative: Use Prism React Renderer
npm install prism-react-renderer --save
npm uninstall react-syntax-highlighter
```

**Success Criteria**: `npm audit --production` shows 0 vulnerabilities

---

### Task 3: Remove Unused Imports (4-6 hours)

**Automated approach**:

1. Install unused imports remover:
   ```bash
   npm install -g ts-unused-exports
   ```

2. Find unused exports:
   ```bash
   ts-unused-exports tsconfig.json
   ```

3. Use VS Code "Organize Imports" feature:
   - Install "TypeScript Auto Imports" extension
   - Run on each file: Ctrl+Shift+O (Windows) or Cmd+Shift+O (Mac)

**Manual review needed for**:
- `app/(dashboard)/components/*.tsx` (11 files with unused Card imports)
- `app/admin/quality-trends/page.tsx` (10 unused component imports)

**Success Criteria**: Reduce unused-vars errors from 273 to < 50

---

## High Priority Tasks

### Task 4: Create TypeScript Interfaces (8-12 hours)

**Phase 1: Core Types** (4 hours)
Create `types/api.ts` for API responses:

```typescript
// types/api.ts
export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'google' | 'github' | 'ollama';
  model: string;
  status: 'active' | 'inactive' | 'error';
  priority: number;
  endpoint: string;
  apiKey: string;
  lastUsed: string;
  requestCount: number;
  errorRate: number;
  enabled: boolean;
}

export interface TestResult {
  providerId: string;
  testName: string;
  status: 'success' | 'failure' | 'pending';
  result: unknown; // Replace specific any with unknown, then narrow
  timestamp: string;
}

export interface HealthMetric {
  providerId: string;
  providerName: string;
  providerType: string;
  overallHealth: number;
  availability: number;
  responseTime: number;
  successRate: number;
  lastTested: string;
  recommendations: string[];
}
```

**Phase 2: Replace `any` in Critical Files** (8 hours)

Priority files (ordered by impact):
1. `app/(dashboard)/types/index.ts` - Fix 5 core type definitions
2. `app/ai-providers/page.tsx` - 82 instances
3. `app/ai-providers/[id]/page.tsx` - 95 instances
4. `app/integrations/*/page.tsx` - Various instances

**Pattern to follow**:
```typescript
// ❌ Before
const [data, setData] = useState<any>(null);

// ✅ After
const [data, setData] = useState<AIProvider | null>(null);
```

**Success Criteria**: Reduce `any` type errors from 300 to < 50

---

### Task 5: Fix React Hooks Dependencies (2-4 hours)

**Issue**: 31 missing dependencies in useEffect hooks

**Pattern to fix**:

```typescript
// ❌ Before
useEffect(() => {
  loadDashboardData();
}, []);

// ✅ After - Option 1: Add dependency
useEffect(() => {
  loadDashboardData();
}, [loadDashboardData]);

// ✅ After - Option 2: Use useCallback
const loadDashboardData = useCallback(async () => {
  // ... function body
}, [/* dependencies */]);

useEffect(() => {
  loadDashboardData();
}, [loadDashboardData]);
```

**Files to fix** (grep results from lint output):
- `app/admin/quality/dashboard/page.tsx`
- `app/admin/quality/template-improvements/page.tsx`
- `app/ai-providers/page.tsx`
- Various integration pages

**Success Criteria**: 0 react-hooks/exhaustive-deps warnings

---

### Task 6: Improve Error Handling (4-6 hours)

**Pattern**: Many catch blocks capture errors but don't use them

**Files with most issues**:
- `app/admin/quality/template-improvements/page.tsx` (5 instances)
- `app/ai-providers/[id]/page.tsx` (8 instances)
- `app/login/page.tsx` (1 instance)

**Fix pattern**:

```typescript
// ❌ Before
try {
  await fetchData();
} catch (error) {
  // error is captured but not used
  toast.error("Failed to load");
}

// ✅ After
try {
  await fetchData();
} catch (error) {
  console.error('Failed to fetch data:', error);
  toast.error(`Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

**Best practice**: Create error utility function
```typescript
// lib/error-handler.ts
export function handleError(error: unknown, context: string): string {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[${context}]`, error);
  return message;
}

// Usage
catch (error) {
  const message = handleError(error, 'loadDashboardData');
  toast.error(`Failed to load: ${message}`);
}
```

**Success Criteria**: All caught errors are logged or displayed

---

## Medium Priority Tasks

### Task 7: Refactor Large Files (16-24 hours)

**Target files**:
1. `app/ai-providers/[id]/page.tsx` (2,370 lines) → Split into 5-6 files
2. `app/ai-providers/page.tsx` (1,711 lines) → Split into 4-5 files

**Refactoring strategy for `app/ai-providers/[id]/page.tsx`**:

```
Current: page.tsx (2,370 lines)

Refactor to:
├── page.tsx (200 lines) - Main component, layout
├── components/
│   ├── ProviderHeader.tsx (150 lines)
│   ├── ProviderMetrics.tsx (200 lines)
│   ├── ProviderModels.tsx (300 lines)
│   ├── ProviderSettings.tsx (250 lines)
│   └── ProviderTests.tsx (400 lines)
├── hooks/
│   ├── useProviderData.ts (200 lines)
│   └── useProviderActions.ts (150 lines)
└── types/
    └── provider.ts (100 lines)
```

**Success Criteria**: No file > 500 lines

---

### Task 8: Extract Duplicated Code (12-16 hours)

**Pattern**: Similar OAuth integration logic in multiple files

**Create shared utilities**:

```typescript
// lib/integration-utils.ts
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export function getOAuthUrl(provider: 'confluence' | 'sharepoint' | 'github', config: OAuthConfig): string {
  // Shared OAuth URL generation
}

export function handleOAuthCallback(code: string, provider: string): Promise<{ token: string }> {
  // Shared callback handling
}
```

**Create shared hooks**:

```typescript
// hooks/use-integration.ts
export function useIntegration(provider: string) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const connect = useCallback(async () => {
    // Shared connection logic
  }, [provider]);
  
  const disconnect = useCallback(async () => {
    // Shared disconnection logic
  }, [provider]);
  
  return { connected, loading, connect, disconnect };
}
```

**Files to refactor**:
- `app/integrations/confluence/page.tsx`
- `app/integrations/sharepoint/page.tsx`
- `app/integrations/github/page.tsx`

**Success Criteria**: <30% code duplication between integration pages

---

### Task 9: Add Component Tests (16-20 hours)

**Test coverage priorities**:

1. **Dashboard Components** (4 hours)
   - `app/(dashboard)/components/AIProviderStatusWidget.tsx`
   - `app/(dashboard)/components/PipelineStatusWidget.tsx`
   - Test rendering, data fetching, user interactions

2. **Integration Pages** (8 hours)
   - OAuth flow tests
   - Connection/disconnection tests
   - Error handling tests

3. **AI Provider Management** (8 hours)
   - Provider CRUD operations
   - Testing suite functionality
   - Health metrics calculation

**Example test structure**:
```typescript
// __tests__/components/AIProviderStatusWidget.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { AIProviderStatusWidget } from '@/app/(dashboard)/components/AIProviderStatusWidget';

describe('AIProviderStatusWidget', () => {
  it('renders provider status correctly', async () => {
    render(<AIProviderStatusWidget />);
    await waitFor(() => {
      expect(screen.getByText(/AI Provider Status/i)).toBeInTheDocument();
    });
  });
});
```

**Success Criteria**: >70% test coverage for new components

---

## Low Priority Tasks

### Task 10: Fix Accessibility Issues (4-6 hours)

**Fix unescaped entities** (45 instances):

```typescript
// ❌ Before
<p>Don't use this pattern</p>

// ✅ After
<p>Don&apos;t use this pattern</p>
// or
<p>{"Don't use this pattern"}</p>
```

**Add ARIA labels**:
```typescript
// ✅ Good
<button aria-label="Close dialog" onClick={onClose}>
  <X />
</button>
```

---

### Task 11: Add Documentation (8-12 hours)

**JSDoc comments for complex functions**:

```typescript
/**
 * Fetches AI provider health metrics and calculates overall health score
 * @param providerId - Unique identifier for the AI provider
 * @param options - Optional configuration for health check
 * @returns Promise resolving to health metrics with recommendations
 * @throws {Error} When provider is not found or API request fails
 */
async function checkProviderHealth(
  providerId: string,
  options?: HealthCheckOptions
): Promise<HealthMetric> {
  // ...
}
```

**Component prop documentation**:

```typescript
interface AIProviderStatusWidgetProps {
  /** Optional custom CSS classes */
  className?: string;
  /** Refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;
  /** Whether to show detailed metrics */
  showDetails?: boolean;
}
```

---

## Progress Tracking

Use this checklist to track progress:

### Critical Priority
- [ ] Task 1: Fix failing database tests
- [ ] Task 2: Fix security vulnerabilities
- [ ] Task 3: Remove unused imports

### High Priority
- [ ] Task 4: Create TypeScript interfaces
- [ ] Task 5: Fix React hooks dependencies
- [ ] Task 6: Improve error handling

### Medium Priority
- [ ] Task 7: Refactor large files
- [ ] Task 8: Extract duplicated code
- [ ] Task 9: Add component tests

### Low Priority
- [ ] Task 10: Fix accessibility issues
- [ ] Task 11: Add documentation

---

## Estimated Timeline

| Priority | Tasks | Hours | Team Size | Duration |
|----------|-------|-------|-----------|----------|
| Critical | 3 | 8-12 | 1 dev | 1-2 days |
| High | 3 | 14-22 | 2 devs | 1-2 weeks |
| Medium | 3 | 44-60 | 2 devs | 2-3 weeks |
| Low | 2 | 12-18 | 1 dev | 1-2 weeks |
| **Total** | **11** | **78-112** | **2-3 devs** | **4-8 weeks** |

---

## Success Metrics

### Before (Current State)
- ❌ Linting: 618 errors, 31 warnings
- ❌ Tests: 16/18 passing (88.9%)
- ❌ Security: 3 vulnerabilities
- ❌ Type Safety: 300 `any` types

### After (Target State)
- ✅ Linting: <50 errors, 0 warnings
- ✅ Tests: 18/18 passing (100%) + new tests
- ✅ Security: 0 vulnerabilities
- ✅ Type Safety: <20 `any` types (only where necessary)
- ✅ Code Coverage: >70%
- ✅ Files: No file >500 lines

---

## Getting Started

**Recommended Order**:

1. Start with Quick Wins (auto-fix)
2. Fix Critical Priority in order (Tasks 1-3)
3. Tackle High Priority (Tasks 4-6)
4. Plan Medium Priority in sprints
5. Low Priority as time permits

**Team Assignment Suggestion**:
- **Dev 1**: Focus on TypeScript types and interfaces (Task 4)
- **Dev 2**: Focus on refactoring and code cleanup (Tasks 3, 7, 8)
- **Both**: Pair on critical tasks (Tasks 1, 2)

---

**Last Updated**: November 4, 2025
**Next Review**: After completing Critical Priority tasks
