using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MassTransit;
using Adpa.Orchestrator.Clients;
using Adpa.Orchestrator.Data;

using Adpa.Orchestrator.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// 1. Aspire Service Defaults (Observability / Resilience)
// ---------------------------------------------------------------------------

builder.AddServiceDefaults();

// ---------------------------------------------------------------------------
// 2. Data Persistence (PostgreSQL Governance Ledger)
// ---------------------------------------------------------------------------

builder.AddNpgsqlDbContext<GovernanceDbContext>("governance-ledger");

// ---------------------------------------------------------------------------
// 2. Authentication (Firebase JWT Validation)
// ---------------------------------------------------------------------------

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://securetoken.google.com/YOUR_FIREBASE_PROJECT_ID";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "https://securetoken.google.com/YOUR_FIREBASE_PROJECT_ID",
            ValidateAudience = true,
            ValidAudience = "YOUR_FIREBASE_PROJECT_ID",
            ValidateLifetime = true
        };
    });

// ---------------------------------------------------------------------------
// 3. Messaging (MassTransit + RabbitMQ)
// ---------------------------------------------------------------------------

builder.AddRabbitMQClient("messaging");
builder.Services.AddMassTransit(x =>
{
    // Ritial Consumers will be registered here
    // x.AddConsumer<DevelopProjectCharterConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(builder.Configuration.GetConnectionString("messaging"));
        cfg.ConfigureEndpoints(context);
    });
});

// ---------------------------------------------------------------------------
// 4. Intelligence Bridge (Typed HttpClient)
// ---------------------------------------------------------------------------

builder.Services.AddHttpClient<IntelligenceClient>(client => 
{
    client.BaseAddress = new Uri("http://intelligence"); // Aspire Service Discovery
});

// ---------------------------------------------------------------------------
// 5. Domain Services (Semantic RTM)
// ---------------------------------------------------------------------------

builder.Services.AddScoped<ISemanticRtmSeeder, SemanticRtmSeeder>();
builder.Services.AddScoped<IRtmExecutionService, RtmExecutionService>();

// ---------------------------------------------------------------------------
// 6. Controller Infrastructure
// ---------------------------------------------------------------------------

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ---------------------------------------------------------------------------
// 6. Startup Validation (Mechanical Integrity)
// ---------------------------------------------------------------------------

var configProvider = app.Services.GetRequiredService<IConfiguration>();
var aiProvider = configProvider["AI_PROVIDER"] ?? Environment.GetEnvironmentVariable("AI_PROVIDER");

var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("RPAS Stabilization: AI_PROVIDER resolved as: {Value}", aiProvider ?? "<NULL>");

app.Run();
