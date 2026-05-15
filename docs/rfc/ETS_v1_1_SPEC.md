# Execution Truth System Spec v1.1 (RFC)

## 1. Abstract & Introduction
The Execution Truth System (ETS) is a deterministic, append-only, cryptographically verifiable execution pipeline designed to replace traditional mutable databases. It shifts the paradigm from "mutable state" to "verifiable execution history," ensuring that system state is the deterministic result of verifiable events. ETS defines how any system can prove that its state, decisions, and history are correct.

## 2. Core Architecture & Zero-Trust Flow
ETS enforces a 5-step zero-trust signing flow:
1. **Payload Generation**: Actor creates the payload and specifies the schema version.
2. **Canonical Serialization**: Enforces UTF-8 normalization, sorted JSON keys, and IEEE 754 float normalization to guarantee determinism.
3. **Hash & Sign**: SHA-256 hash of the canonical payload + previous hash, signed via Ed25519.
4. **API Submission**: Payload, signature, and public key are submitted.
5. **Server Verification**: The server independently verifies the signature, schema, and authority before appending.

**Determinism Constraint**: All operations must produce identical hashes across environments given identical inputs.

## 3. Data Model & Schema Evolution
The core data model relies on an immutable ledger.

```prisma
model LedgerEvent {
  event_id      String   @id // UUID v7
  payload       Json
  schema_version String
  previous_hash String
  current_hash  String
  signature     String
  timestamp     DateTime @default(now())
}
```

**Schema Evolution Integrity**: Backward compatibility is mandatory. No type changes are allowed that break historical validation. Events are validated using their original schema version, and schema migrations must not invalidate historical verification.

## 4. Merkle Forest Implementation
Instead of a single Merkle tree, ETS uses a domain-isolated Merkle Forest (e.g., Decisions, Agents, Context, Audit) to allow parallel computation and domain isolation.

**Meta-Root Definition**: All domain roots are hashed into a single global root:
`MetaRoot = SHA256(domain_roots + timestamp + version)`
This global root is used for external anchoring and formalizes cross-domain trust.

## 5. Semantic Validation Layer
"Integrity of Interpretation" guarantees that identical operations produce identical semantic outcomes. No event may be committed if it is cryptographically valid but semantically invalid. This is enforced via Zod schemas and business rules.

## 6. Continuous Verification & External Anchoring
- **Real-time**: Chain validation on insert.
- **15-min**: Merkle rebuild.
- **Daily**: Full deterministic replay.
- **External Anchoring**: Publishing the Meta-Root to an external transparency log, notary service, or blockchain to provide external proof of integrity.

## 7. Threat Model & Attack Vectors
- **Internal Tampering**: Detected immediately by hash and signature mismatch.
- **DB Compromise**: Detected within 15 minutes via Merkle mismatch.
- **System Compromise**: Detected within 24 hours via external anchors and state divergence.

## 8. API Contracts
- `POST /api/ledger/event`: Append new event.
- `GET /api/ledger/event/:id`: Retrieve event.
- `POST /api/ledger/verify`: Verify event integrity.
- `GET /api/merkle/proof/:event_id`: Generate cryptographic proof.
- `GET /api/ledger/replay`: Deterministic state reconstruction.