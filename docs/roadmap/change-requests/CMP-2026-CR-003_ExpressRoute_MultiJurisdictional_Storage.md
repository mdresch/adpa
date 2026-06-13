# Change Request: ExpressRoute Connectivity and Cryptographically Partitioned Multi-Jurisdictional Data Storage

**CR ID:** CMP-2026-CR-003  
**Version:** 1.0  
**Date:** 2026-06-05  
**Status:** ✅ Approved by Change Control Board  
**Execution Date:** 2026-06-05  
**Tracking Baseline ID:** PRJ-2026-ICT-GOV-CMP-v4.0  

---

## Executive Summary

**What:** Implement ExpressRoute private virtual network peering and cryptographically partitioned multi-jurisdictional data storage using a $(2, 3)$ Threshold Shamir's Secret Sharing Scheme.

**Why:** Minimize risk exposure from the public internet, ensure zero-latency telemetry ingestion below the 100ms SLA limit, and guarantee that no single geographic region can unilaterally reconstruct compliance trails or user preference data.

**Value:** Full GDPR/HIPAA compliance, mathematical safeguards against sovereign data coercion or localized breach exposure, and predictable 10 Gbps private pipeline throughput.

---

## Change Request Details

### 3. Communication Channels and Methods (Amended)

#### 3.6 Dedicated Network Topology: ExpressRoute Connectivity
To minimize risk exposure from the public internet and guarantee a predictable, zero-latency ingestion pipeline for high-volume data streams, the enterprise enforces a non-negotiable Private Virtual Network Peering Strategy (Jebasingh, 2026).

```
[On-Premises Core Infrastructure]
         │
         ▼
[Customer Edge Routers]
         │
   (QoS Tagging: COS 5 / DSCP EF)
         │
         ▼
[Primary Partner Meet-Me Site]
         │
   ┌─────┴──────────────────────────────────────────────────────┐
   │ Dual Private BGP Peering Pathways (ExpressRoute / Direct) │
   └─────┬──────────────────────────────────────────────────────┘
         │
         ├──► Pathway A: Primary Circuit (10 Gbps Active Line)
         └──► Pathway B: Georedundant Secondary Circuit (10 Gbps Failover)
         │
         ▼
[Global Azure Central Cloud Exchange / VNet Gateways]
```

##### 3.6.1 Traffic Ingestion Guardrails
*   **Dedicated Bandwidth Provisioning:** The network team will provision twin, geographically isolated 10 Gbps ExpressRoute Circuits via independent telecommunication providers. This ensures complete network pathway redundancy and maintains a predictable, zero-latency throughput state under continuous peak load traffic conditions.
*   **Strict Quality of Service (QoS) Controls:** Edge routers will stamp all incoming real-time telemetry packets with explicit Class of Service (CoS 5) and Differentiated Services Code Point (DSCP EF / Expedited Forwarding) flags. This prioritizes the governance stream over generic network data packets, keeping ingestion latency below the 100ms SLA limit.
*   **Private BGP Peering Architecture:** The system establishes secure, private Border Gateway Protocol (BGP) routing sessions directly from on-premises edge systems into the private cloud virtual networks. Telemetry streams and generated document payloads route completely out-of-band, bypassing the public internet, which directly isolates data flows from interception vectors.

---

### 5. Constraints and Communication Procedures (Amended)

#### 5.6 Non-Reproduction Cryptographic Safeguards (Multi-Region Secret Sharing)
To safeguard user privacy and prevent data coercion or single-region systemic breaches, the system adopts a Cryptographically Split Data Ingestion Architecture (Jebasingh, 2026; Juliussen et al., 2023). The system implements a $(k, n)$ Threshold Secret Sharing Scheme (specifically a $2 \text{ out of } 3$ configuration) to ensure no single geographic location holds enough data assets to reconstruct the master compliance trail or personal user datasets independently.

```
       [Raw Ingestion Payloads / Immutable Audit Trails]
                             │
                             ▼
              [Zero-Trust Cryptographic Core]
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
(Secret Share 1)      (Secret Share 2)      (Secret Share 3)
       │                     │                     │
       ▼                     ▼                     ▼
[Region A: EU North]  [Region B: US West]   [Region C: APAC Southeast]
 (AWS Stockholm)       (Azure Oregon)        (AWS Sydney)
```

##### 5.6.1 Decentralized Key Fragmentation & Splitting Mechanics
*   **Asymmetric Key Splitting:** The system encrypts raw logs and immutable audit trails using a master data encryption key (DEK). The system then processes this DEK through a Shamir's Secret Sharing routine, splitting it into three unique cryptographic key fragments stored across independent geographic locations: Region A (EU North - Stockholm), Region B (US West - Oregon), and Region C (APAC Southeast - Sydney).
*   **The 2-of-3 Threshold Mandate:** A single regional cloud enclave can neither decrypt the key fragment nor reconstruct the master DEK on its own. Reconstituting cleartext information or tracing user preference histories requires the simultaneous, authenticated cooperation of at least two out of the three isolated geographic storage clusters.
*   **Immutable Hash Chaining via PostgreSQL:** Each region computes localized cryptographic block hashes of incoming telemetry using a running chain mechanism. To guarantee non-repudiation, the system broadcasts these hashes across the global ExpressRoute pipeline. If any single jurisdiction or bad actor alters historical records within its borders, the hash values will fail validation against the other regions, preserving the audit trail's integrity.

##### 5.6.2 Jurisdictional Data Segregation Profile

| Geographic Location | Hosted Data Partition Element | Cryptographic State | Regional Authority Scope |
| :--- | :--- | :--- | :--- |
| **Region A: EU North (Stockholm)** | Hashed Telemetry Event Stream + Key Fragment Alpha | Pseudonymized HMAC Text blocks; Key slice unreadable without Beta/Gamma additions. | Can only log incoming European events; cannot reconstruct global user profiles. |
| **Region B: US West (Oregon)** | Anonymized User Preference Hashes + Key Fragment Beta | Absolute encrypted field blocks; cannot reproduce matching user profiles alone. | Manages secondary failover computations; cannot unilaterally decrypt the audit trail database. |
| **Region C: APAC Southeast (Sydney)** | Cryptographic Block Verification Chains + Key Fragment Gamma | Immutable hash blocks; requires explicit consensus to initialize key reconstruction keys. | Controls edge ingestion channels for regional endpoints; isolated from accessing raw Western data profiles. |

##### 5.6.3 Localized Off-Peak Workload Orchestration (Temporal Shifting)
To minimize energy cost volatility and ease regional grid congestion, delay-tolerant processes (e.g., background document compliance auditing, PostgreSQL hash ledger verification, and scheduled key fragment rotations) are deferred to execute exclusively during off-peak hours within each regional jurisdiction (typically between 10:00 PM and 6:00 AM local time).

###### Regional Execution Schedules:
*   **Region A: EU North (Stockholm)**
    *   *Time Zone:* Central European Time (CET/CEST - UTC+1/UTC+2)
    *   *Off-Peak Window:* 22:00 – 06:00 CET/CEST
*   **Region B: US West (Oregon)**
    *   *Time Zone:* Pacific Time (PST/PDT - UTC-8/UTC-7)
    *   *Off-Peak Window:* 22:00 – 06:00 PST/PDT
*   **Region C: APAC Southeast (Sydney)**
    *   *Time Zone:* Australian Eastern Time (AEST/AEDT - UTC+10/UTC+11)
    *   *Off-Peak Window:* 22:00 – 06:00 AEST/AEDT

###### Queue-Based Deferred Execution Mechanics:
*   **Timezone-Aware Queue Scheduling:** The background queue manager (`SaveInlineEntitiesJobService` / `AIGenerationJobService`) evaluates the target region's local time zone prior to processing deferred jobs. If the current time is outside the designated off-peak window, the job is automatically re-enqueued with a visibility timeout delaying its execution to the start of the regional off-peak window.
*   **Grid Congestion & Spot Instances Integration:** In addition to time-shifting, background workers utilize Spot/Preemptible virtual instances during these off-peak windows, yielding up to a 90% compute cost reduction while operating safely under the scheme's fault-tolerant, state-replicated design.

#### 5.7 Autonomous Nighttime Regeneration and Cascading Review Workflow
To maximize the utilization of off-peak compute rates and clean grid periods, the system supports autonomous event-driven document regeneration triggered by strategic baseline updates (such as approved Change Requests or verified Intellectual Property/patent advancements):

*   **Trigger Events:**
    *   *Change Request Approval:* When a Change Request receives official approval from the Change Control Board (CCB), it updates the target baselines.
    *   *IP/Patent Advancements:* When the drift detection engine flags a novel technical approach that is verified as patentable, it registers the advancement in the technical asset directory.
*   **Traceability-Driven Dependency Resolution:** The dependency resolution engine uses the system's active **Traceability & Lineage Graph** (which tracks semantic links between requirements, templates, registries, and generated artifacts) to dynamically construct the cascading workload. If a parent baseline is altered, the system traces the graph to identify and flag all child documents requiring updates, guaranteeing complete semantic alignment across the project portfolio.
*   **Off-Peak Batch Scheduling:** Upon detecting a trigger event, the queue manager scans for all dependent documents identified via the Traceability Graph and schedules them for regeneration. The tasks are automatically queued to execute exclusively during the local regional off-peak window (22:00 – 06:00 local time).
*   **Cascading Review Gate:** To ensure governance compliance, regenerated documents are not automatically published. Instead, they are placed in `PENDING_HUMAN_APPROVAL` status, and the system triggers a cascading approval workflow. Stakeholders and Project Managers are notified and can review the clean diffs and sign off on updates when they log in the following morning.

---

## References

*   Jebasingh, D. (2026). *Satisfying GDPR, HIPAA, and Data Sovereignty Simultaneously: Federated Learning and Threshold Cryptography as a Legal-Technical Pathway for Cross-Border Systems Intelligence*. International Journal of Engineering Technology and Computer Science Innovation, 2(1), 1–15.
*   Juliussen, B. A., Kozyri, E., Johansen, D., & Rui, J. P. (2023). *The third country problem under the GDPR: enhancing protection of data transfers with technology*. International Data Privacy Law, 13(3), 225-243. https://doi.org/10.1093/idpl/ipad013
