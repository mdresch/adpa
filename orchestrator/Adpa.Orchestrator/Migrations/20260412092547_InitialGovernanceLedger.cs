using System;
using System.Collections.Generic;
using Adpa.Orchestrator.Models.Rituals;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Adpa.Orchestrator.Migrations
{
    /// <inheritdoc />
    public partial class InitialGovernanceLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BusinessCases",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    IdeationSummaryId = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    ExecutiveSummary = table.Column<string>(type: "text", nullable: false),
                    ProblemStatement = table.Column<string>(type: "text", nullable: false),
                    ProposedSolution = table.Column<string>(type: "text", nullable: false),
                    ExpectedBenefits = table.Column<string>(type: "jsonb", nullable: false),
                    EstimatedCosts = table.Column<List<CostItem>>(type: "jsonb", nullable: false),
                    KeyRisks = table.Column<string>(type: "jsonb", nullable: false),
                    CoreRequirements = table.Column<string>(type: "jsonb", nullable: false),
                    Recommendation = table.Column<string>(type: "text", nullable: false),
                    Placeholders = table.Column<string>(type: "jsonb", nullable: false),
                    ApprovalStatus = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessCases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IdeationSummaries",
                columns: table => new
                {
                    Title = table.Column<string>(type: "text", nullable: false),
                    ExecutiveSummary = table.Column<string>(type: "text", nullable: false),
                    ProblemStatement = table.Column<string>(type: "text", nullable: false),
                    ProposedSolution = table.Column<string>(type: "text", nullable: false),
                    BenefitHypothesis = table.Column<string>(type: "text", nullable: false),
                    Constraints = table.Column<string>(type: "jsonb", nullable: false),
                    StrategicAlignment = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IdeationSummaries", x => x.Title);
                });

            migrationBuilder.CreateTable(
                name: "requirements_traceability_matrix",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    BusinessCaseId = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Domain = table.Column<string>(type: "text", nullable: false),
                    Priority = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    SourceVersion = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AmendmentId = table.Column<string>(type: "text", nullable: true),
                    CsrVersion = table.Column<string>(type: "text", nullable: true),
                    ExecutedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_requirements_traceability_matrix", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "rtm_amendments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    TargetRequirementId = table.Column<string>(type: "text", nullable: false),
                    OriginalDescription = table.Column<string>(type: "text", nullable: false),
                    ProposedDescription = table.Column<string>(type: "text", nullable: false),
                    Justification = table.Column<string>(type: "text", nullable: false),
                    Requester = table.Column<string>(type: "text", nullable: false),
                    ApprovalStatus = table.Column<string>(type: "text", nullable: false),
                    AmendmentType = table.Column<string>(type: "text", nullable: false),
                    AmendmentSubType = table.Column<string>(type: "text", nullable: false),
                    SourceVersion = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DecidedBy = table.Column<string>(type: "text", nullable: true),
                    DecidedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DecisionNotes = table.Column<string>(type: "text", nullable: true),
                    AppliedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AppliedBy = table.Column<string>(type: "text", nullable: true),
                    ResultingRequirementId = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rtm_amendments", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BusinessCases");

            migrationBuilder.DropTable(
                name: "IdeationSummaries");

            migrationBuilder.DropTable(
                name: "requirements_traceability_matrix");

            migrationBuilder.DropTable(
                name: "rtm_amendments");
        }
    }
}
