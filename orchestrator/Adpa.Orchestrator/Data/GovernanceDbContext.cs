using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Adpa.Orchestrator.Models.Governance;
using Adpa.Orchestrator.Models.Rituals;

namespace Adpa.Orchestrator.Data;

public class GovernanceDbContext(DbContextOptions<GovernanceDbContext> options) : DbContext(options)
{
    public DbSet<IdeationSummary> IdeationSummaries => Set<IdeationSummary>();
    public DbSet<BusinessCase> BusinessCases => Set<BusinessCase>();
    public DbSet<RtmRequirement> RequirementsTraceabilityMatrix => Set<RtmRequirement>();
    public DbSet<RtmAmendment> RtmAmendments => Set<RtmAmendment>();
    public DbSet<MsrfEvaluation> MsrfEvaluations => Set<MsrfEvaluation>();
    public DbSet<GovernanceLedgerRow> GovernanceLedgerRows => Set<GovernanceLedgerRow>();
    public DbSet<AuthorityTokenRow> AuthorityTokenRows => Set<AuthorityTokenRow>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map the IdeationSummary
        modelBuilder.Entity<IdeationSummary>(entity =>
        {
            entity.HasKey(e => e.Title); // Using Title as a primary handle for this phase
            
            // Map lists as JSONB for Postgres
            entity.Property(e => e.Constraints).HasColumnType("jsonb");
            entity.Property(e => e.KeyGoals).HasColumnType("jsonb");
            entity.Property(e => e.Assumptions).HasColumnType("jsonb");
            entity.Property(e => e.Conflicts)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<Conflict>>(v, (JsonSerializerOptions?)null) ?? new List<Conflict>())
                .HasColumnType("jsonb");
        });

        // Map the BusinessCase
        modelBuilder.Entity<BusinessCase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("BusinessCases", t =>
                t.HasCheckConstraint("CK_BusinessCase_Status", "\"ApprovalStatus\" IN ('PENDING', 'APPROVED', 'REJECTED')"));

            // Map complex lists as JSONB for Postgres
            entity.Property(e => e.ExpectedBenefits).HasColumnType("jsonb");
            entity.Property(e => e.EstimatedCosts).HasColumnType("jsonb");
            entity.Property(e => e.KeyRisks).HasColumnType("jsonb");
            entity.Property(e => e.Placeholders).HasColumnType("jsonb");
            entity.Property(e => e.CoreRequirements).HasColumnType("jsonb");
        });

        modelBuilder.Entity<GovernanceLedgerRow>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("governance_ledger", t =>
                t.HasCheckConstraint("CK_Ledger_Override",
                    "(\"IsOverridden\" = false) OR (\"IsOverridden\" = true AND \"OverrideJustification\" IS NOT NULL AND \"OverrideJustification\" != '')"));
        });

        modelBuilder.Entity<AuthorityTokenRow>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AllowedPaths)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("jsonb");
            entity.ToTable("authority_tokens");
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

        // Map the MsrfEvaluation
        modelBuilder.Entity<MsrfEvaluation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("msrf_evaluations");

            // Map lists as JSONB for Postgres
            entity.Property(e => e.PillarScores).HasColumnType("jsonb");
            entity.Property(e => e.RemediationInstructions).HasColumnType("jsonb");
        });
    }
}
