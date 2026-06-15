using Aspire.Hosting;
using System.IO;

var builder = DistributedApplication.CreateBuilder(args);

// Resolve Core Attributes (G1-G4 Resilience)
var firebaseProjectId = builder.Configuration["FIREBASE_PROJECT_ID"] ?? "adpa-dev";

// 1. Data & Messaging Tier (Containerized Resources)
// ---------------------------------------------------------------------------

var dbPassword = builder.AddParameter("db-password", "adpa-governance-2026", secret: true);

var postgres = builder.AddPostgres("postgres-server")
    .WithImage("postgres", "17")
    .WithPassword(dbPassword)
    .WithDataVolume("adpa-ledger-vol");

// Explicitly add the database - Aspire will ensure it's created on the server
var governanceDb = postgres.AddDatabase("governance-ledger");

var messaging = builder.AddRabbitMQ("messaging");

// ---------------------------------------------------------------------------
// 2. Intelligence Tier (Python FastAPI Service)
// ---------------------------------------------------------------------------

/* 
// Temporarily disabled until AI-Foundry-Projects is migrated to ADPA
var pythonExecutable = File.Exists("../../../.venv/Scripts/python.exe")
    ? "../../../.venv/Scripts/python.exe"
    : "py";

var intelligence = builder.AddExecutable(
    "intelligence",
    pythonExecutable,
    "../../AI-Foundry-Projects/services/intelligence",
    "-m",
    "uvicorn",
    "main:app",
    "--host",
    "0.0.0.0",
    "--port",
    "8000")
    .WithHttpEndpoint(port: 8000, name: "api");
intelligence.WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"); // Connect back to Aspire Dashboard
intelligence.WithEnvironment("FIREBASE_PROJECT_ID", firebaseProjectId);
intelligence.WithReference(governanceDb);
intelligence.WithReference(messaging);
*/

// ---------------------------------------------------------------------------
// 3. Orchestration Tier (C# Web API - branded as 'apiservice')
// ---------------------------------------------------------------------------

var apiservice = builder.AddProject<Projects.Adpa_Orchestrator>("apiservice")
    .WithHttpEndpoint(port: 5002, name: "http")
    .WithEnvironment("FIREBASE_PROJECT_ID", firebaseProjectId)
    .WithEnvironment("AI_PROVIDER", "google"); // High-integrity default for RPAS stabilization

apiservice.WithReference(governanceDb);
apiservice.WithReference(messaging);
// apiservice.WithReference(intelligence.GetEndpoint("api")); // Using GetEndpoint to resolve generic variance in Aspire 13.x
// apiservice.WithEnvironment("INTELLIGENCE_URL", intelligence.GetEndpoint("api"));
// Local Aspire: orchestrator uses in-process governance fallback (no external RPAS.Governance.Api repo).
apiservice.WithEnvironment("Governance__SovereignApiRequired", "false");
apiservice.WithEnvironment("Governance__ApprovalsEnforced", "false");

// ---------------------------------------------------------------------------
// 4. Application Tier (Root Express Backend)
// ---------------------------------------------------------------------------

// Resolve Aspire OTLP/HTTP endpoint for local tracing (injected by Aspire dashboard).
// AddExecutable resources do not get OTEL vars auto-injected (unlike AddProject),
// so we forward the dashboard OTLP/HTTP endpoint explicitly.
// Key from launchSettings.json: ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL (HTTP/protobuf port 21335)
var otlpHttpEndpoint =
    builder.Configuration["ASPIRE_DASHBOARD_OTLP_HTTP_ENDPOINT_URL"]   // HTTP/protobuf (Node.js exporter)
    ?? builder.Configuration["DOTNET_DASHBOARD_OTLP_ENDPOINT_URL"]      // gRPC fallback
    ?? "http://localhost:21335"; // Aspire default OTLP/HTTP port

var backend = builder.AddExecutable("adpa-backend", "pnpm", "../../server", "run", "dev")
    .WithHttpEndpoint(env: "PORT", port: 5000, name: "http")
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", otlpHttpEndpoint)
    .WithEnvironment("OTEL_SERVICE_NAME", "adpa-backend")
    .WithEnvironment("TRACING_ENABLED", "true");

// ---------------------------------------------------------------------------
// 5. Experience Tier (Management Interface)
// ---------------------------------------------------------------------------

// launchSettings.json already defines http://localhost:5006 — do not add a second endpoint named "http".
var web = builder.AddProject<Projects.Adpa_Web>("webfrontend")
    .WithEnvironment("ASPNETCORE_HTTP_PORTS", "5008");
web.WithExternalHttpEndpoints();
web.WithReference(apiservice);

// ---------------------------------------------------------------------------
// 6. Experience Tier (Main Next.js Frontend)
// ---------------------------------------------------------------------------

var researcher = builder.AddExecutable("adpa-frontend", "pnpm", "../../", "run", "dev:aspire")
    .WithReference(apiservice)
    .WithHttpEndpoint(env: "PORT", port: 3000, name: "http")
    .WithEnvironment("BACKEND_URL", backend.GetEndpoint("http"))
    .WithEnvironment("NEXT_PUBLIC_API_URL", backend.GetEndpoint("http"))
    .WithEnvironment("ORCHESTRATOR_URL", apiservice.GetEndpoint("http"))
    .WithEnvironment("NEXT_PUBLIC_ORCHESTRATOR_URL", apiservice.GetEndpoint("http"))
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", otlpHttpEndpoint)
    .WithEnvironment("OTEL_SERVICE_NAME", "adpa-frontend");

builder.Build().Run();
