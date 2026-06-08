using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Adpa.Web.Components;

var builder = WebApplication.CreateBuilder(args);

// Kestrel defaults to :5000, which conflicts with adpa-backend under Aspire AppHost.
// Aspire injects ASPNETCORE_HTTP_PORTS; when absent, bind the AppHost-assigned port.
if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS"))
    && string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    builder.WebHost.UseUrls("http://127.0.0.1:5006");
}

// ---------------------------------------------------------------------------
// 1. Aspire Service Defaults & Observability
// ---------------------------------------------------------------------------

builder.AddServiceDefaults();

// ---------------------------------------------------------------------------
// 2. Authentication (Governor Management Identity)
// ---------------------------------------------------------------------------

builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = IdentityConstants.ApplicationScheme;
        options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
    })
    .AddIdentityCookies();

builder.Services.AddIdentityCore<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddEntityFrameworkStores<DbContext>() // This would be the GovernanceDbContext
    .AddSignInManager()
    .AddDefaultTokenProviders();

// ---------------------------------------------------------------------------
// 3. ApiService Bridge (Orchestrator Client)
// ---------------------------------------------------------------------------

builder.Services.AddHttpClient("api", client => 
{
    var apiServiceBaseUrl = builder.Configuration["ApiService:BaseUrl"] ?? "http://apiservice";
    client.BaseAddress = new Uri(apiServiceBaseUrl, UriKind.Absolute); // Aspire Service Discovery
});

// ---------------------------------------------------------------------------
// 4. Web Interface Infrastructure (Blazor)
// ---------------------------------------------------------------------------

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var app = builder.Build();

// ---------------------------------------------------------------------------
// 5. Middleware & Endpoints
// ---------------------------------------------------------------------------

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.UseWebAssemblyDebugging();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAntiforgery();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
