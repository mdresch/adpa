# Ingestion Jobs - Extractors

Placeholders and scaffolding for entity extraction jobs. Each extractor implements the `Extractor` interface and exposes a `run()` method.

How to use:
- Implement parsing, normalization and persistence logic inside each extractor's `run()`.
- Register new extractors in `index.ts` and invoke via a job runner or CLI.

Files:
- `extractor.ts` - extractor interface definition.
- `<entity>.ts` - scaffolds for each prioritized entity.
- `index.ts` - helper to run registered extractors.
