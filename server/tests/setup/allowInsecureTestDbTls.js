// Test-only: disables TLS certificate validation for the disposable Azure
// test DB (see integration-setup.js's testDbUrl), never production --
// run-migrations.ts sets this same flag for the same cert-chain reason.
// Isolated in its own file so this one narrow, deliberate statement is easy
// to review in isolation from the rest of the test harness.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
