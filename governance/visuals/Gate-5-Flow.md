# ✅ **RPAS‑CM Gate 5 Control‑Flow (DRACO)**

The following diagram illustrates the **Semantic Integrity** validation flow during the RPAS lifecycle, including the newly integrated **Collaborative PR Governance** and **Redaction Layer**.

```mermaid
graph TD
    Start([Initiate RPAS Validation]) --> Trigger{Trigger Source?}
    
    Trigger -- Local --> GetContext[Load Context: git diff + attestation]
    Trigger -- GitHub PR --> PRContext[Extract PR Diff + Attestation]
    
    GetContext & PRContext --> PhaseCheck{Ritual Phase?}
    
    PhaseCheck -- "1 (Propose) or 2 (Decide)" --> SetAdvisory[Set Mode: ADVISORY]
    PhaseCheck -- "3 (Orchestrate) or PR Audit" --> SetBlocking[Set Mode: BLOCKING]
    
    SetAdvisory --> DRACO
    SetBlocking --> DRACO
    
    subgraph DRACO Board ["DRACO Review Board (Gate 5)"]
        direction TB
        EV[Evidence Validator: grounding check]
        GE[Governance Evaluator: policy check]
        CC[Counterfactual Challenger: Mythos check]
    end
    
    DRACO --> EV
    DRACO --> GE
    DRACO --> CC
    
    EV & GE & CC --> Redaction[🛡️ Redaction Layer: Secret Scrubbing]
    
    Redaction --> Consolidate[Consolidate Board Verdict]
    
    Consolidate --> GateCheck{Verdict: Pass?}
    
    GateCheck -- Yes --> PassGate[✅ Gate 5 Passed]
    GateCheck -- No --> ModeCheck{Enforcement Mode?}
    
    ModeCheck -- Advisory --> Warn[⚠️ Warning: Semantic Risks Detected]
    Warn --> PassGate
    
    ModeCheck -- Blocking --> FailGate[❌ Gate 5 Failed: Critical Semantic Risk]
    
    PassGate --> Continue[Continue AEV Pipeline / Post PR Comment]
    FailGate --> Halt[🛑 HALT Execution / Block PR Merge]

    style SetBlocking fill:#f96,stroke:#333,stroke-width:2px
    style FailGate fill:#ff9999,stroke:#c00,stroke-width:2px
    style DRACO Board fill:#f0f7ff,stroke:#005bb7
    style Redaction fill:#e1f5fe,stroke:#01579b
```

---

## **Key Governance Invariants**

1.  **Authority Sovereignty**: AI cannot block human decisions (Gate 5 = Advisory during Phase 2).
2.  **Execution Immunity**: AI cannot execute ambiguous or unauthorized logic (Gate 5 = Blocking during Phase 3).
3.  **Mythos Prevention**: The Counterfactual Challenger specifically audits for "Shadow Initiative" that was NOT requested in the attestation.
4.  **Semantic Security (Redaction)**: All findings surfaced to collaborative environments (GitHub PRs) are automatically redacted of sensitive tokens and identifiers.

---
**Baseline**: RPAS-CM v2.4.0 (CSR-43)
**Owner**: DRACO AI Review Board
