using Adpa.Web.Components;
using Adpa.Web.Services;
using Microsoft.AspNetCore.Authentication.Cookies;

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
// 2. ApiService Bridge (Orchestrator Client)
// ---------------------------------------------------------------------------

builder.Services.AddHttpContextAccessor();
builder.Services.AddTransient<FirebaseBearerTokenHandler>();

builder.Services.AddHttpClient("api", client =>
{
    var apiServiceBaseUrl = builder.Configuration["ApiService:BaseUrl"] ?? "http://apiservice";
    client.BaseAddress = new Uri(apiServiceBaseUrl, UriKind.Absolute); // Aspire Service Discovery
})
    // ADR-009: attaches the signed-in user's Firebase ID token to every call this
    // client makes -- see FirebaseBearerTokenHandler's own docs.
    .AddHttpMessageHandler<FirebaseBearerTokenHandler>();

// ---------------------------------------------------------------------------
// 2a. Authentication (ADR-009: server-side Firebase sign-in for the Governor Portal)
// ---------------------------------------------------------------------------

builder.Services.AddHttpClient<FirebaseAuthService>();
builder.Services.AddScoped<FirebaseCookieEvents>();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/login";
        options.Cookie.Name = "adpa_governor_session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        // The cookie itself is a bounded session lifetime; the Firebase ID token inside
        // it is refreshed independently and far more often (see FirebaseCookieEvents) --
        // this is the outer "how long can this session exist at all" bound.
        options.ExpireTimeSpan = TimeSpan.FromDays(14);
        options.SlidingExpiration = true;
        options.EventsType = typeof(FirebaseCookieEvents);
    });
builder.Services.AddAuthorization();
builder.Services.AddCascadingAuthenticationState();

// ---------------------------------------------------------------------------
// 3. Web Interface Infrastructure (Blazor)
// ---------------------------------------------------------------------------

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var app = builder.Build();

// ---------------------------------------------------------------------------
// 4. Middleware & Endpoints
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

app.UseAuthentication();
app.UseAuthorization();

app.UseAntiforgery();

app.MapFirebaseAuthEndpoints();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
