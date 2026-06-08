using Aspire.Hosting;
using System.IO;

var builder = DistributedApplication.CreateBuilder(args);

// Resolve Core Attributes (G1-G4 Resilience)
var firebaseProjectId = builder.Configuration["FIREBASE_PROJECT_ID"] ?? "adpa-dev";

// 1. Data & Messaging Tier (Containerized Resources)
// ---------------------------------------------------------------------------

var dbPassword = builder.AddParameter("db-password", "adpa-governance-2026", secret: true);

var postgres = builder.AddPostgres("postgres-server")
    .WithPassword(dbPassword)
    .WithDataVolume("adpa-ledger-vol");

// Explicitly add the database - Aspire will ensure it's created on the server
var governanceDb = postgres.AddDatabase("governance-ledger");

var governanceApi = builder.AddProject("governance-api", "../../rpas-governance/RPAS.Governance.Api/RPAS.Governance.Api.csproj")
    .WithReference(governanceDb)
    .WithEndpoint("http", endpoint => endpoint.Port = 5005)
    .WithEnvironment("Governance__SkipEfMigrations", "true")
    .WithEnvironment("Governance__RpasLawMode", "Enforced");

var messaging = builder.AddRabbitMQ("messaging");

// ---------------------------------------------------------------------------
// 2. Intelligence Tier (Python FastAPI Service)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 3. Orchestration Tier (C# Web API - branded as 'apiservice')
// ---------------------------------------------------------------------------

var apiservice = builder.AddProject<Projects.Adpa_Orchestrator>("apiservice")
    .WithHttpEndpoint(port: 5002, name: "http")
    .WithEnvironment("FIREBASE_PROJECT_ID", firebaseProjectId)
    .WithEnvironment("AI_PROVIDER", "google"); // High-integrity default for RPAS stabilization

apiservice.WithReference(governanceDb);
apiservice.WithReference(messaging);
apiservice.WithReference(intelligence.GetEndpoint("api")); // Using GetEndpoint to resolve generic variance in Aspire 13.x
apiservice.WithEnvironment("INTELLIGENCE_URL", intelligence.GetEndpoint("api"));
apiservice.WithReference(governanceApi);
apiservice.WithEnvironment("Governance__SovereignApiRequired", "true");
apiservice.WithEnvironment("Governance__ApprovalsEnforced", "true");
apiservice.WithEnvironment("RPAS_GOVERNANCE_URL", governanceApi.GetEndpoint("http"));

// ---------------------------------------------------------------------------
// 4. Application Tier (Root Express Backend)
// ---------------------------------------------------------------------------

var backend = builder.AddNpmApp("adpa-backend", "../../server", "dev")
    .WithHttpEndpoint(port: 5000, name: "http")
    .WithEnvironment("PORT", "5000");

// ---------------------------------------------------------------------------
// 5. Experience Tier (Management Interface)
// ---------------------------------------------------------------------------

var web = builder.AddProject<Projects.Adpa_Web>("webfrontend")
    .WithHttpEndpoint(port: 5006, name: "http")
    .WithEnvironment("ASPNETCORE_HTTP_PORTS", "5006");
web.WithExternalHttpEndpoints();
web.WithReference(apiservice);

// ---------------------------------------------------------------------------
// 6. Experience Tier (Main Next.js Frontend)
// ---------------------------------------------------------------------------

var researcher = builder.AddNpmApp("adpa-frontend", "../../", "dev")
    .WithReference(apiservice)
    .WithReference(backend)
    .WithHttpEndpoint(port: 3000, name: "http")
    .WithEnvironment("BACKEND_URL", backend.GetEndpoint("http"))
    .WithEnvironment("NEXT_PUBLIC_API_URL", backend.GetEndpoint("http"))
    .WithEnvironment("ORCHESTRATOR_URL", apiservice.GetEndpoint("http"))
    .WithEnvironment("NEXT_PUBLIC_ORCHESTRATOR_URL", apiservice.GetEndpoint("http"))
    .WithEnvironment("PORT", "3000"); // Ensure Next.js respects the main frontend port

builder.Build().Run();
