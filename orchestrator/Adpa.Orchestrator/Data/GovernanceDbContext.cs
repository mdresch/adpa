using Microsoft.EntityFrameworkCore;
using Adpa.Orchestrator.Models.Rituals;

namespace Adpa.Orchestrator.Data;

public class GovernanceDbContext(DbContextOptions<GovernanceDbContext> options) : DbContext(options)
{
    public DbSet<IdeationSummary> IdeationSummaries => Set<IdeationSummary>();
    public DbSet<BusinessCase> BusinessCases => Set<BusinessCase>();
    public DbSet<RtmRequirement> RequirementsTraceabilityMatrix => Set<RtmRequirement>();
    public DbSet<RtmAmendment> RtmAmendments => Set<RtmAmendment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map the IdeationSummary
        modelBuilder.Entity<IdeationSummary>(entity =>
        {
            entity.HasKey(e => e.Title); // Using Title as a primary handle for this phase
            
            // Map lists as JSONB for Postgres
            entity.Property(e => e.Constraints).HasColumnType("jsonb");
        });

        // Map the BusinessCase
        modelBuilder.Entity<BusinessCase>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            // Map complex lists as JSONB for Postgres
            entity.Property(e => e.ExpectedBenefits).HasColumnType("jsonb");
            entity.Property(e => e.EstimatedCosts).HasColumnType("jsonb");
            entity.Property(e => e.KeyRisks).HasColumnType("jsonb");
            entity.Property(e => e.Placeholders).HasColumnType("jsonb");
            entity.Property(e => e.CoreRequirements).HasColumnType("jsonb");
        });

        // Map the RtmRequirement
        modelBuilder.Entity<RtmRequirement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("requirements_traceability_matrix");
        });

        // Map the RtmAmendment
        modelBuilder.Entity<RtmAmendment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("rtm_amendments");
        });
    }
}
