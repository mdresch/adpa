# PMBOK 7th Edition Quick Reference

**Last Updated**: 2026-02-02  
**Status**: ✅ Database Layer Complete  
**Overall Compliance**: 79% (🟢 Strong)

---

## Quick Links

- **Full Review**: [PMBOK7_COMPLIANCE_REVIEW.md](./PMBOK7_COMPLIANCE_REVIEW.md)
- **Implementation Details**: [PMBOK7_IMPLEMENTATION_SUMMARY.md](./PMBOK7_IMPLEMENTATION_SUMMARY.md)
- **Database Migration**: `server/migrations/674_pmbok7_principles_and_domains.sql`
- **Jira Work Item**: [ADPA-13](https://cba-hr.atlassian.net/browse/ADPA-13)

---

## What's Implemented ✅

### Database Tables (6 tables)
1. `pmbok7_principles` - 12 principles with descriptions
2. `pmbok7_performance_domains` - 8 domains with outcomes
3. `project_pmbok7_principles` - Project-principle alignment tracking
4. `project_pmbok7_domains` - Project-domain maturity assessment
5. `document_pmbok7_principle_refs` - Document principle references
6. `pmbok6_to_pmbok7_principle_mapping` - Cross-edition mapping

### Features
- ✅ Alignment scoring (0-100 scale)
- ✅ Maturity levels (5-level scale)
- ✅ Evidence tracking
- ✅ Assessment tracking (who, when)
- ✅ Cross-edition mapping support
- ✅ JSON support for flexible data

---

## What's Pending ⚠️

### Priority 1: API Layer
- REST endpoints for principles
- REST endpoints for domains
- Compliance scoring API
- Cross-edition mapping API

### Priority 2: UI Components
- PMBOK 7 principles dashboard
- Domain maturity visualization
- Compliance scoring widget

### Priority 3: Business Logic
- Automated compliance scoring
- AI-powered principle detection
- Maturity progression rules

---

## 12 PMBOK 7 Principles

| # | Code | Principle |
|---|------|-----------|
| 1 | STEWARDSHIP | Be a diligent, respectful, and caring steward |
| 2 | TEAM | Create a collaborative project team environment |
| 3 | STAKEHOLDERS | Effectively engage with stakeholders |
| 4 | VALUE | Focus on value |
| 5 | SYSTEMS_THINKING | Recognize, evaluate, and respond to system interactions |
| 6 | LEADERSHIP | Demonstrate leadership behaviors |
| 7 | TAILORING | Tailor based on context |
| 8 | QUALITY | Build quality into processes and deliverables |
| 9 | COMPLEXITY | Navigate complexity |
| 10 | RISK | Optimize risk responses |
| 11 | ADAPTABILITY | Embrace adaptability and resiliency |
| 12 | CHANGE | Enable change to achieve the envisioned future state |

---

## 8 PMBOK 7 Performance Domains

| # | Code | Domain |
|---|------|--------|
| 1 | STAKEHOLDERS | Stakeholders |
| 2 | TEAM | Team |
| 3 | DEVELOPMENT_APPROACH | Development Approach and Life Cycle |
| 4 | PLANNING | Planning |
| 5 | PROJECT_WORK | Project Work |
| 6 | DELIVERY | Delivery |
| 7 | MEASUREMENT | Measurement |
| 8 | UNCERTAINTY | Uncertainty |

---

## Sample Queries

### Get Project's Principle Compliance
```sql
SELECT 
  pr.code,
  pr.name,
  ppp.alignment_level,
  ppp.alignment_score
FROM project_pmbok7_principles ppp
JOIN pmbok7_principles pr ON ppp.principle_id = pr.id
WHERE ppp.project_id = 'YOUR-PROJECT-ID'
ORDER BY pr.display_order;
```

### Get Project's Domain Maturity
```sql
SELECT 
  pd.code,
  pd.name,
  ppd.maturity_level,
  ppd.maturity_score
FROM project_pmbok7_domains ppd
JOIN pmbok7_performance_domains pd ON ppd.domain_id = pd.id
WHERE ppd.project_id = 'YOUR-PROJECT-ID'
ORDER BY pd.display_order;
```

### Find Principles Referenced in Document
```sql
SELECT 
  pr.code,
  pr.name,
  dpr.reference_type,
  dpr.section_reference
FROM document_pmbok7_principle_refs dpr
JOIN pmbok7_principles pr ON dpr.principle_id = pr.id
WHERE dpr.document_id = 'YOUR-DOCUMENT-ID'
ORDER BY pr.display_order;
```

---

## Compliance Score Breakdown

| Category | Score | Status |
|----------|-------|--------|
| Principles Database | 100% | ✅ Complete |
| Performance Domains | 100% | ✅ Complete |
| Documentation | 85% | ✅ Good |
| Database Support | 100% | ✅ Complete |
| API Support | 40% | ⚠️ Pending |
| UI/UX | 50% | ⚠️ Pending |
| **Overall** | **79%** | 🟢 Strong |

**Progress**: 67% → 79% (+12 points after implementation)

---

## Next Actions

1. **Immediate**: Review implementation with stakeholders
2. **Short Term**: Create API endpoints (Priority 1)
3. **Medium Term**: Build UI components (Priority 2)
4. **Long Term**: Implement business logic (Priority 3)

---

## Files Modified/Created

### Created
- `docs/compliance/PMBOK7_COMPLIANCE_REVIEW.md` (Full review)
- `docs/compliance/PMBOK7_IMPLEMENTATION_SUMMARY.md` (Implementation details)
- `docs/compliance/PMBOK7_QUICK_REFERENCE.md` (This file)
- `server/migrations/674_pmbok7_principles_and_domains.sql` (Database schema)

### Modified
- None (all new files)

---

**For More Information**: See full compliance review document
