using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Adpa.Web.Components;

var builder = WebApplication.CreateBuilder(args);

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
    client.BaseAddress = new Uri("http://apiservice"); // Aspire Service Discovery
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
