using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Adpa.Orchestrator.Data;

/// <summary>
/// Design-time factory so <c>dotnet ef</c> does not execute <see cref="Program"/> startup.
/// </summary>
public sealed class GovernanceDbContextFactory : IDesignTimeDbContextFactory<GovernanceDbContext>
{
    public GovernanceDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable("ConnectionStrings__governance-ledger")
            ?? "Host=127.0.0.1;Port=5432;Database=postgres;Username=postgres;Password=postgres";
        var options = new DbContextOptionsBuilder<GovernanceDbContext>()
            .UseNpgsql(cs)
            .Options;
        return new GovernanceDbContext(options);
    }
}
