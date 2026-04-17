using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MassTransit;
using Adpa.Orchestrator.Clients;
using Adpa.Orchestrator.Data;
using Microsoft.EntityFrameworkCore;
using Adpa.Orchestrator.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// 1. Aspire Service Defaults (Observability / Resilience)
// ---------------------------------------------------------------------------

builder.AddServiceDefaults();

// ---------------------------------------------------------------------------
// 2. Data Persistence (PostgreSQL governance ledger — shared with RPAS.Governance.Api)
// ---------------------------------------------------------------------------

builder.AddNpgsqlDbContext<GovernanceDbContext>("governance-ledger");

// ---------------------------------------------------------------------------
// 2a. Sovereign governance API (singular write authority for law-bound transitions)
// ---------------------------------------------------------------------------

builder.Services.AddHttpClient<GovernanceApiClient>(client =>
{
    var govUrl = builder.Configuration["RPAS_GOVERNANCE_URL"] ?? "http://governance-api";
    if (builder.Environment.IsDevelopment() && govUrl == "http://governance-api")
    {
        govUrl = "http://localhost:5005";
    }

    client.BaseAddress = new Uri(govUrl);
});

// ---------------------------------------------------------------------------
// 2. Authentication (Firebase JWT Validation)
// ---------------------------------------------------------------------------

var firebaseProjectId = builder.Configuration["FIREBASE_PROJECT_ID"] 
    ?? throw new InvalidOperationException("Missing FIREBASE_PROJECT_ID environment variable. Required for RPAS-CM Experience Tier authentication.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://securetoken.google.com/{firebaseProjectId}";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://securetoken.google.com/{firebaseProjectId}",
            ValidateAudience = true,
            ValidAudience = firebaseProjectId,
            ValidateLifetime = true
        };
    });

// ---------------------------------------------------------------------------
// 2b. Experience Tier Security (CORS for Vercel)
// ---------------------------------------------------------------------------

builder.Services.AddCors(options =>
{
    options.AddPolicy("ExperienceTierPolicy",
        policy =>
        {
            // Allow Vercel and Local Debugging
            policy.WithOrigins("https://adpa-researcher.vercel.app", "http://localhost:3000", "http://localhost:3005")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// ---------------------------------------------------------------------------
// 3. Messaging (MassTransit + RabbitMQ)
// ---------------------------------------------------------------------------

builder.AddRabbitMQClient("messaging");
builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        var connectionString = builder.Configuration.GetConnectionString("messaging");
        if (!string.IsNullOrEmpty(connectionString))
        {
            cfg.Host(connectionString);
        }
        else
        {
            // Fallback for Aspire service discovery
            cfg.Host("messaging");
        }
        cfg.ConfigureEndpoints(context);
    });
});

// ---------------------------------------------------------------------------
// 4. Intelligence Bridge (Typed HttpClient)
// ---------------------------------------------------------------------------

builder.Services.AddHttpClient<IntelligenceClient>(client => 
{
    var intelUrl = builder.Configuration["INTELLIGENCE_URL"] ?? "http://intelligence";
    // Fallback for local debugging without service discovery
    if (builder.Environment.IsDevelopment() && intelUrl == "http://intelligence")
    {
        intelUrl = "http://localhost:8000";
    }
    client.BaseAddress = new Uri(intelUrl);
});

// ---------------------------------------------------------------------------
// 5. Domain Services (Semantic RTM)
// ---------------------------------------------------------------------------

builder.Services.AddScoped<ISemanticRtmSeeder, SemanticRtmSeeder>();
builder.Services.AddScoped<IRtmExecutionService, RtmExecutionService>();
builder.Services.AddSingleton<ITaskApprovalGate, TaskApprovalGate>();

// ---------------------------------------------------------------------------
// 6. Controller Infrastructure
// ---------------------------------------------------------------------------

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

TaskApprovalGate.ValidateConfigurationAtStartup(app.Configuration);

// ---------------------------------------------------------------------------
// 6. Middleware & Endpoints
// ---------------------------------------------------------------------------

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("ExperienceTierPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ---------------------------------------------------------------------------
// 7. Automatic Data Migration (G2 - Lifecycle Integrity)
// ---------------------------------------------------------------------------

if (app.Environment.IsDevelopment())
{
    var loggerSvc = app.Services.GetRequiredService<ILogger<Program>>();
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<GovernanceDbContext>();
    
    int maxRetries = 10;
    int retryCount = 0;
    while (retryCount < maxRetries)
    {
        try 
        {
            loggerSvc.LogInformation("RPAS-CM: Synchronizing Governance Ledger (Attempt {Count}/{Max})...", retryCount + 1, maxRetries);
            
            // Log connection string info (safely)
            var connectionString = app.Configuration.GetConnectionString("governance-ledger");
            loggerSvc.LogInformation("RPAS-CM: Using connection: {Conn}", connectionString?.Split(';')[0]);

            // Apply migrations to create database and tables if missing
            loggerSvc.LogInformation("RPAS-CM: Running MigrateAsync...");
            await context.Database.MigrateAsync();
            
            // Check if tables actually exist, fallback if not
            try {
                var canConnect = await context.Database.CanConnectAsync();
                loggerSvc.LogInformation("RPAS-CM: Database connection verified: {CanConnect}", canConnect);
            } catch (Exception ex) {
                loggerSvc.LogWarning("RPAS-CM: Migration verify check failed: {Msg}", ex.Message);
                // Last resort
                await context.Database.EnsureCreatedAsync();
            }

            loggerSvc.LogInformation("RPAS-CM: Governance Ledger synchronized successfully.");
            break;
        }
        catch (Exception ex)
        {
            retryCount++;
            if (retryCount >= maxRetries) 
            {
                loggerSvc.LogCritical(ex, "RPAS-CM: FINAL INITIALIZATION FAILURE. Governance Center is OFFLINE.");
                break; 
            }
            
            loggerSvc.LogWarning("RPAS-CM: Ledger initialization failed (Auth/Connectivity). Retrying in 10s... [{Error}]", ex.Message);
            await Task.Delay(10000);
        }
    }
}

// ---------------------------------------------------------------------------
// 6. Startup Validation (Mechanical Integrity)
// ---------------------------------------------------------------------------

var configProvider = app.Services.GetRequiredService<IConfiguration>();
var aiProvider = configProvider["AI_PROVIDER"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER");

var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("RPAS Stabilization: AI_PROVIDER resolved as: {Value}", aiProvider ?? "<NULL>");

app.Run();
