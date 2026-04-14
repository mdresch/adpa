using System;
using System.Collections.Generic;
using Adpa.Orchestrator.Models.Rituals;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Adpa.Orchestrator.Migrations
{
    /// <inheritdoc />
    public partial class AddMsrfPersistence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BenefitHypothesis",
                table: "IdeationSummaries");

            migrationBuilder.RenameColumn(
                name: "StrategicAlignment",
                table: "IdeationSummaries",
                newName: "SessionId");

            migrationBuilder.RenameColumn(
                name: "ExecutiveSummary",
                table: "IdeationSummaries",
                newName: "ApprovalStatus");

            migrationBuilder.AddColumn<string>(
                name: "Assumptions",
                table: "IdeationSummaries",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<List<Conflict>>(
                name: "Conflicts",
                table: "IdeationSummaries",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "IdeationSummaries",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Id",
                table: "IdeationSummaries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KeyGoals",
                table: "IdeationSummaries",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "IdeationSummaries",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "msrf_evaluations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ProjectId = table.Column<string>(type: "text", nullable: false),
                    OverallComplianceScore = table.Column<double>(type: "double precision", nullable: false),
                    PillarScores = table.Column<List<PillarScore>>(type: "jsonb", nullable: false),
                    StabilityScore = table.Column<double>(type: "double precision", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    RemediationInstructions = table.Column<string>(type: "jsonb", nullable: false),
                    IsMsrfValidated = table.Column<bool>(type: "boolean", nullable: false),
                    EvaluatedAt = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_msrf_evaluations", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "msrf_evaluations");

            migrationBuilder.DropColumn(
                name: "Assumptions",
                table: "IdeationSummaries");

            migrationBuilder.DropColumn(
                name: "Conflicts",
                table: "IdeationSummaries");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "IdeationSummaries");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "IdeationSummaries");

            migrationBuilder.DropColumn(
                name: "KeyGoals",
                table: "IdeationSummaries");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "IdeationSummaries");

            migrationBuilder.RenameColumn(
                name: "SessionId",
                table: "IdeationSummaries",
                newName: "StrategicAlignment");

            migrationBuilder.RenameColumn(
                name: "ApprovalStatus",
                table: "IdeationSummaries",
                newName: "ExecutiveSummary");

            migrationBuilder.AddColumn<string>(
                name: "BenefitHypothesis",
                table: "IdeationSummaries",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
