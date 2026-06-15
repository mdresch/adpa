# Design Spec: Knowledge Graph (Pillar 3)

## Overview
This specification details the extraction and processing of inline H8 JSON tags, and the enforcement of atomic commit boundaries across relational and graph databases.

## Key Requirements
- `REQ-KNG-001`: Inline H8 Parser accurately extracts JSON.
- `REQ-KNG-002`: DualStoreTransactionManager ensures PostgreSQL and Neo4j remain atomic upon write failures.
