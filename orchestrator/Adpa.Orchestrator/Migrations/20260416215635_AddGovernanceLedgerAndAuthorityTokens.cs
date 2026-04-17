using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Adpa.Orchestrator.Migrations
{
    /// <inheritdoc />
    public partial class AddGovernanceLedgerAndAuthorityTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "authority_tokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RitualType = table.Column<string>(type: "text", nullable: false),
                    EntityId = table.Column<string>(type: "text", nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsConsumed = table.Column<bool>(type: "boolean", nullable: false),
                    AllowedPaths = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_authority_tokens", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "governance_ledger",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RitualType = table.Column<string>(type: "text", nullable: false),
                    InitiatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    IdeationJson = table.Column<string>(type: "text", nullable: true),
                    BusinessCaseJson = table.Column<string>(type: "text", nullable: true),
                    GovernorNotes = table.Column<string>(type: "text", nullable: true),
                    IsOverridden = table.Column<bool>(type: "boolean", nullable: false),
                    OverrideJustification = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_governance_ledger", x => x.Id);
                    table.CheckConstraint("CK_Ledger_Override", "(\"IsOverridden\" = false) OR (\"IsOverridden\" = true AND \"OverrideJustification\" IS NOT NULL AND \"OverrideJustification\" != '')");
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_BusinessCase_Status",
                table: "BusinessCases",
                sql: "\"ApprovalStatus\" IN ('PENDING', 'APPROVED', 'REJECTED')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "authority_tokens");

            migrationBuilder.DropTable(
                name: "governance_ledger");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BusinessCase_Status",
                table: "BusinessCases");
        }
    }
}
