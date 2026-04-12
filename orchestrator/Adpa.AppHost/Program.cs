using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// 1. Data & Messaging Tier (Containerized Resources)
// ---------------------------------------------------------------------------

var postgres = builder.AddPostgres("postgres-server")
    .WithDataVolume();

var governanceDb = postgres.AddDatabase("governance-ledger");

var messaging = builder.AddRabbitMQ("messaging");

// ---------------------------------------------------------------------------
// 2. Intelligence Tier (Python FastAPI Service)
// ---------------------------------------------------------------------------

var intelligence = builder.AddExecutable("intelligence", "py", "../../AI-Foundry-Projects/services/intelligence", "main.py");
intelligence.WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"); // Connect back to Aspire Dashboard
intelligence.WithHttpEndpoint(port: 8000, name: "api");
intelligence.WithReference(governanceDb);
intelligence.WithReference(messaging);

// ---------------------------------------------------------------------------
// 3. Orchestration Tier (C# Web API - branded as 'apiservice')
// ---------------------------------------------------------------------------

var apiservice = builder.AddProject<Projects.Adpa_Orchestrator>("apiservice")
    .WithHttpEndpoint(port: 5002, name: "http")
    .WithEnvironment("AI_PROVIDER", "google"); // High-integrity default for RPAS stabilization

apiservice.WithReference(governanceDb);
apiservice.WithReference(messaging);
apiservice.WithReference(intelligence.GetEndpoint("api")); // Using GetEndpoint to resolve generic variance in Aspire 13.x

// ---------------------------------------------------------------------------
// 4. Experience Tier (Management Interface)
// ---------------------------------------------------------------------------

var web = builder.AddProject<Projects.Adpa_Web>("webfrontend");
web.WithExternalHttpEndpoints();
web.WithReference(apiservice);

// ---------------------------------------------------------------------------
// 5. Experience Tier (Next.js Researcher Dashboard)
// ---------------------------------------------------------------------------

var researcher = builder.AddNpmApp("researcher-dashboard", "../../", "dev")
    .WithReference(apiservice)
    .WithHttpEndpoint(port: 3005, name: "http")
    .WithEnvironment("NEXT_PUBLIC_API_URL", apiservice.GetEndpoint("http"))
    .WithEnvironment("PORT", "3005") // Ensure Next.js respects the Aspire port
    .PublishAsDockerFile();

builder.Build().Run();
