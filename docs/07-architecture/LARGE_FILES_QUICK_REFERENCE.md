# Large Files Quick Reference

**Last Scanned**: October 26, 2025  
**Scan Threshold**: Files >500 lines

---

## 🔴 CRITICAL (>1,500 lines) - Refactor ASAP

### Frontend Pages
| Lines | File | Action Required |
|-------|------|-----------------|
| 2,422 | `app/process-flow/page.tsx` | Extract 7+ components |
| 1,988 | `app/page.tsx` | Extract dashboard widgets |
| 1,822 | `app/projects/page.tsx` | Extract tab components |
| 1,512 | `app/ai-providers/page.tsx` | Split provider sections |

### Backend Services
| Lines | File | Action Required |
|-------|------|-----------------|
| 1,889 | `server/src/routes/ai-models.ts` | Split by provider |
| 1,851 | `server/src/services/processFlowService.ts` | Service decomposition |
| 1,795 | `server/src/.../qualityAssuranceStage.ts` | Extract validators |
| 1,792 | `server/src/.../contextInjectionStage.ts` | Extract injectors |
| 1,707 | `server/src/services/contextInjectionEngine.ts` | Service decomposition |

---

## 🟠 HIGH (1,000-1,500 lines) - Monitor & Plan

### Frontend
| Lines | File |
|-------|------|
| 1,465 | `app/jobs/page.tsx` |
| 1,391 | `app/process-flow/visual-pipeline/page.tsx` |
| 1,234 | `app/integrations/page.tsx` |
| 1,090 | `app/templates/page.tsx` |

### Backend
| Lines | File |
|-------|------|
| 1,477 | `server/src/services/multiFormatOutputEngine.ts` |
| 1,385 | `server/src/services/qualityAssessmentEngine.ts` |
| 1,248 | `server/src/services/personalizationEngine.ts` |
| 1,181 | `server/src/routes/ai.ts` |
| 1,135 | `server/src/services/documentRefinementEngine.ts` |
| 1,131 | `server/src/.../aiGenerationStage.ts` |
| 1,129 | `server/src/services/queueService.ts` |
| 1,128 | `server/src/routes/documents.ts` |
| 1,032 | `server/src/.../historicalAnalysisService.ts` |

---

## 🟡 MEDIUM (500-1,000 lines) - Monitor

### Frontend
| Lines | File |
|-------|------|
| 974 | `app/security/page.tsx` |
| 967 | `app/templates/builder/page.tsx` |
| 906 | `lib/api.ts` |
| 879 | `app/ai/page.tsx` |
| 876 | `app/integrations/confluence/page.tsx` |
| 792 | `app/users/page.tsx` |
| 785 | `app/ai-analytics/page.tsx` |
| 785 | `app/integrations/sharepoint/page.tsx` |
| 749 | `app/analytics/page.tsx` |
| 742 | `app/integrations/github/page.tsx` |
| 709 | `components/ui/sidebar.tsx` |
| 606 | `components/BaselineGanttChart.tsx` |
| 595 | `app/demo-document-viewer/page.tsx` |
| 554 | `app/ecs-ai/page.tsx` |
| 504 | `app/search/page.tsx` |

### Backend (500-1,000 lines)
59 files in this range - see full analysis document

---

## 📊 Statistics

### Frontend
```
Files >1,500 lines: 4
Files 1,000-1,500:  4
Files 500-1,000:    15
Total problematic:  23 files
```

### Backend
```
Files >1,500 lines: 5
Files 1,000-1,500:  8
Files 500-1,000:    59
Total problematic:  72 files
```

### Overall
```
Total files >1,500: 9 🔴
Total files >1,000: 21 🟠
Total files >500:   95 🟡

Largest file: app/process-flow/page.tsx (2,422 lines)
```

---

## 🎯 Priority Refactoring Order

Based on impact × usage frequency:

### Top 5 Most Urgent
1. **`app/projects/page.tsx`** (1,822 lines) - Used constantly
2. **`app/process-flow/page.tsx`** (2,422 lines) - Core feature
3. **`server/src/routes/ai-models.ts`** (1,889 lines) - API bottleneck
4. **`app/page.tsx`** (1,988 lines) - First impression
5. **`server/src/services/processFlowService.ts`** (1,851 lines) - Core logic

### Estimated Effort
- **Top 5 files**: 2-3 weeks
- **All critical (>1,500)**: 4-5 weeks
- **All high (>1,000)**: 8-10 weeks

---

## 🛡️ Prevention Strategy

### New File Checklist

Before creating a new component/service:
- [ ] Will this be >300 lines? → Split into multiple files
- [ ] Does similar code exist? → Extract shared component
- [ ] Multiple responsibilities? → Separate files from start
- [ ] Can this be tested in isolation? → If no, refactor

### Code Review Checklist
- [ ] No files added >500 lines
- [ ] Large files have refactoring plan
- [ ] Shared code extracted to components/utils
- [ ] Types defined separately

### Monthly Audit
- [ ] Run size analysis script
- [ ] Track trends (growing files)
- [ ] Plan refactoring sprints
- [ ] Update this document

---

## 📝 Quick Commands

### Scan for large files
```powershell
# Frontend files >500 lines
Get-ChildItem -Path app,components,lib -Recurse -Include *.tsx,*.ts -File | 
  Where-Object { (Get-Content $_.FullName | Measure-Object -Line).Lines -gt 500 } |
  ForEach-Object { "$((Get-Content $_.FullName | Measure-Object -Line).Lines) $($_.FullName)" } |
  Sort-Object -Descending

# Backend files >500 lines
Get-ChildItem -Path server/src -Recurse -Include *.ts -File |
  Where-Object { (Get-Content $_.FullName | Measure-Object -Line).Lines -gt 500 } |
  ForEach-Object { "$((Get-Content $_.FullName | Measure-Object -Line).Lines) $($_.FullName)" } |
  Sort-Object -Descending
```

### Find duplicate code
```bash
# Using jscpd (install: npm install -g jscpd)
jscpd app server/src --min-lines 10 --min-tokens 50
```

---

## 🔗 Related Documentation

- [CODE_SIZE_ANALYSIS_REFACTORING_PLAN.md](./CODE_SIZE_ANALYSIS_REFACTORING_PLAN.md) - Detailed refactoring plans
- [Component Guidelines](../03-development/component-guidelines.md)
- [Service Architecture](./service-architecture.md)

---

**Maintainer**: Architecture Team  
**Update Frequency**: Monthly  
**Next Scan**: November 26, 2025

