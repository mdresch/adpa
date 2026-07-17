using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Adpa.Orchestrator.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// ADR-005 Phase 5 (Action Item 6): tamper-evidence for governance_ledger, mirroring
    /// server/migrations/000_baseline.sql's audit_log_before_insert() pattern (SHA-256 over row
    /// content + prior hash). Confirmed before writing this migration: no in-repo code path writes to
    /// governance_ledger today (it's schema for RPAS.Governance.Api, an external service absent from
    /// this repo; the in-repo dev fallback mutates BusinessCases.ApprovalStatus directly instead) --
    /// a Postgres trigger is used specifically because it protects the table regardless of which
    /// writer (in-repo or external) eventually inserts into it, unlike an EF SaveChanges interceptor,
    /// which would only catch writes from this repo's own code.
    ///
    /// This repo's orchestrator connects to Postgres via a single Aspire-injected connection string for
    /// both migrations and runtime (Adpa.AppHost/Program.cs), the same single-role limitation
    /// server/migrations/435_module_activation_lifecycle.sql found on the Node side -- so, matching that
    /// precedent, this migration does NOT attempt a REVOKE-based write lockdown. Unlike the Node side,
    /// there is also no existing stored procedure/choke point here to gate a lockdown trigger through
    /// (no legitimate in-repo writer exists to carve an exception for) -- a write-lockdown trigger for
    /// governance_ledger is deliberately deferred, not part of this migration. See
    /// docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase5-design.md.
    ///
    /// Verification note: this migration was written and compiled (`dotnet build -c Release`) but could
    /// not be applied against a live governance-ledger Postgres in the authoring session (no reachable
    /// Docker/Aspire container). The SQL mirrors audit_log_before_insert()'s already-proven pattern,
    /// adapted for this table's PascalCase-quoted columns and Guid primary key.
    /// </remarks>
    public partial class AddGovernanceLedgerHashChain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrevHash",
                table: "governance_ledger",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Hash",
                table: "governance_ledger",
                type: "text",
                nullable: true);

            // pgcrypto (for digest()) is enabled defensively -- governance-ledger is a physically
            // separate Postgres database from server/'s adpa database, so Node's own extension-creation
            // in 000_baseline.sql does not apply here.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

            migrationBuilder.Sql(@"
CREATE OR REPLACE FUNCTION governance_ledger_before_insert()
RETURNS trigger LANGUAGE plpgsql AS $BODY$
DECLARE
  last_hash TEXT;
  payload TEXT;
BEGIN
  SELECT ""Hash"" INTO last_hash
  FROM governance_ledger
  ORDER BY ""InitiatedAt"" DESC, ""Id"" DESC
  LIMIT 1;

  NEW.""PrevHash"" := last_hash;

  payload := COALESCE(NEW.""Id""::text,'') || '|' || COALESCE(NEW.""RitualType"",'') || '|' ||
             COALESCE(NEW.""Status"",'') || '|' || COALESCE(NEW.""InitiatedAt""::text,'') || '|' ||
             COALESCE(NEW.""IsOverridden""::text,'') || '|' || COALESCE(NEW.""OverrideJustification"",'') || '|' ||
             COALESCE(NEW.""PrevHash"",'');

  NEW.""Hash"" := encode(digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$BODY$;

DROP TRIGGER IF EXISTS trg_governance_ledger_before_insert ON governance_ledger;
CREATE TRIGGER trg_governance_ledger_before_insert
BEFORE INSERT ON governance_ledger
FOR EACH ROW EXECUTE FUNCTION governance_ledger_before_insert();
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP TRIGGER IF EXISTS trg_governance_ledger_before_insert ON governance_ledger;
DROP FUNCTION IF EXISTS governance_ledger_before_insert();
");

            migrationBuilder.DropColumn(
                name: "Hash",
                table: "governance_ledger");

            migrationBuilder.DropColumn(
                name: "PrevHash",
                table: "governance_ledger");
        }
    }
}
