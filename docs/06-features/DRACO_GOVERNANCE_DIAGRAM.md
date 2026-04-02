# DRACO Governance Lifecycle Diagram

This diagram visualizes the end-to-end flow of the DRACO Governance framework, from document generation to final publication.

```mermaid
graph TD
    %% Roles
    U[User / Generator]
    DR[DRACO Board]
    H[Human Reviewer]
    DB[(Database / Audit)]

    %% Generation
    U -->|Generates Document| D{Document Draft}
    D -->|Convening Board| DR
    
    %% Deliberation
    subgraph "DRACO Board Deliberation"
        direction TB
        EV[Evidence Validator]
        GE[Governance Evaluator]
        CC[Counterfactual Challenger]
        SVA[Strategic Assessor]
    end
    
    DR --> EV
    DR --> GE
    DR --> CC
    DR --> SVA
    
    %% Outcomes
    EV & GE & CC & SVA -->|Aggregates Results| V{Verdict Engine}
    V -->|PASS / COND_PASS| AP[Advisable to Publish]
    V -->|REJECT| RB[Blocked - Governance Violation]
    
    %% Accountability Loop
    RB -->|Human Override Required| O{Human Override}
    O -->|Justification Logged| DB
    O -->|Lift Block| AP
    
    %% Publication
    AP -->|Create Approval Request| H
    H -->|Approved| P[Published / Baselined]
    H -->|Rejected| R[Re-generate / Fix]
    
    %% Improvement Feedback
    V -.->|Template Suggestions| TS[Template Improvement Engine]
    TS -.->|Optimize Prompts| U
    
    %% Visual Cues
    classDef highlight fill:#f9f,stroke:#333,stroke-width:2px;
    classDef governance fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    class O highlight;
    class V,EV,GE,CC,SVA governance;
```

## Lifecycle States

1.  **Draft**: Document is created from a template.
2.  **Deliberating**: Multi-agent board parallel analysis with progress streaming.
3.  **Verdict**: Final outcome determined by the Aggregator.
4.  **Blocked**: If verdict is REJECT and blocking mode is enabled.
5.  **Override**: Authorized human provides a reason for the deviation.
6.  **Approved**: Final publication or baseline update.
