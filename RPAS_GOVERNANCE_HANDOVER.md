# Phase-3 Sovereign Extraction: Handover Document
**Target Workspace:** `RPAS-Governance`

## Context
We are executing **Phase-3 of the RPAS-CM architecture**. This phase represents the Sovereign Extraction of governance enforcement out of the `adpa` application and into its own dedicated authority repository. 

Phase-2 successfully proved the "Law as Code" structures (Domain-Driven Design and PostgreSQL CHECK constraints). We are now moving that law behind an explicit network boundary.

## Directives (From the Underwriter)
1. **Target Structure**: Build a pure sovereign Aspire `.NET 10` solution. No code from Next.js or Drizzle allowed.
2. **Connectivity**: Use a **Fixed Local URL** for cross-repo discovery initially. No distributed Aspire proxies yet.
3. **Write-Gates**: Do NOT enable write-gates yet.
4. **Law Mode**: Leave `RpasLawMode` strictly in `Advisory` for now.

## Your Task (Agent in the new `RPAS-Governance` workspace)
You must initialize the target structure perfectly. 

### 1. Scaffold the Solution Structure
```text
RPAS-Governance
 ├─ RPAS.Governance.sln
 ├─ Aspire.AppHost (Aspire App Host)
 ├─ RPAS.Governance.Api (ASP.NET Core Web API)
 ├─ RPAS.Governance.Core (Class library)
 └─ RPAS.Governance.Persistence (Class library)
```
*Wire them up so the API references Core and Persistence, and Persistence references Core.*

### 2. Scaffold the Boilerplate "Law" files
Replicate these specific entities with strict DDD (private setters and behavioral methods):
- `Models/Rituals/BusinessCase.cs`
- `Models/Governance/GovernanceLedgerEntry.cs`
- `Models/Exceptions/RpasLawViolationException.cs`
- `Models/Governance/RpasLawMode.cs` 

Replicate the Persistence logic:
- `Data/GovernanceDbContext.cs` (Must include PostgreSQL Fluent API `CHECK` constraints)
- `Data/RpasLawEnforcementInterceptor.cs` (Entity Framework `SaveChangesInterceptor` validating the laws)

### 3. Verification
Once the C# architecture is standing and compiling independently, we will synchronize via HTTP contract with the `adpa` repository (handled by the other agent).
