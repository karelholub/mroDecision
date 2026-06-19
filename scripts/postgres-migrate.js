#!/usr/bin/env node
import { config } from "../src/config.js";
import { nativePostgresMigrationVersion, nativePostgresSchemaSql, nativePostgresSchemaSummary } from "../src/storePostgresNativeSchema.js";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const status = args.has("--status");
const print = args.has("--print") || (!apply && !status);

if (args.has("--help")) {
  console.log([
    "Usage:",
    "  npm run postgres:migrate -- --print",
    "  DEE_DATABASE_URL=postgres://... npm run postgres:migrate -- --apply",
    "  DEE_DATABASE_URL=postgres://... npm run postgres:migrate -- --status",
    "",
    "Options:",
    "  --print  Print the native Postgres migration SQL without connecting to a database.",
    "  --apply  Apply the migration SQL to DEE_DATABASE_URL in one transaction.",
    "  --status Read dee_migrations from DEE_DATABASE_URL and report current schema state."
  ].join("\n"));
  process.exit(0);
}

if (apply && status) {
  throw new Error("Use only one of --apply or --status.");
}

const statements = nativePostgresSchemaSql();

if (print) {
  console.log(`-- Meiro DEE native Postgres schema v${nativePostgresMigrationVersion}`);
  console.log(`-- ${JSON.stringify(nativePostgresSchemaSummary())}`);
  console.log(`${statements.join(";\n\n")};`);
}

if (apply) {
  if (!config.databaseUrl) {
    throw new Error("DEE_DATABASE_URL is required when applying native Postgres migrations.");
  }
  const { Pool } = await loadPg();
  const pool = createPool(Pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query("COMMIT");
    console.log(`Applied native Postgres schema v${nativePostgresMigrationVersion}.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (status) {
  if (!config.databaseUrl) {
    throw new Error("DEE_DATABASE_URL is required when checking native Postgres migration status.");
  }
  const { Pool } = await loadPg();
  const pool = createPool(Pool);
  try {
    const tableExists = await pool.query("SELECT to_regclass('public.dee_migrations') AS table_name");
    if (!tableExists.rows[0]?.table_name) {
      console.log(JSON.stringify({
        ok: false,
        expected_version: nativePostgresMigrationVersion,
        current_version: 0,
        status: "not_initialized",
        migrations: []
      }, null, 2));
      process.exitCode = 1;
    } else {
      const result = await pool.query("SELECT id, version, applied_at, metadata_json FROM dee_migrations ORDER BY version DESC, applied_at DESC");
      const migrations = result.rows.map((row) => ({
        id: row.id,
        version: Number(row.version || 0),
        applied_at: row.applied_at instanceof Date ? row.applied_at.toISOString() : row.applied_at,
        metadata: row.metadata_json || {}
      }));
      const currentVersion = migrations.reduce((max, item) => Math.max(max, item.version), 0);
      const ok = currentVersion >= nativePostgresMigrationVersion;
      console.log(JSON.stringify({
        ok,
        expected_version: nativePostgresMigrationVersion,
        current_version: currentVersion,
        status: ok ? "ready" : "behind",
        migrations
      }, null, 2));
      if (!ok) process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

function createPool(Pool) {
  return new Pool({
    connectionString: config.databaseUrl,
    max: config.postgresPoolMax,
    idleTimeoutMillis: config.postgresIdleTimeoutMs,
    connectionTimeoutMillis: config.postgresConnectionTimeoutMs,
    statement_timeout: config.postgresStatementTimeoutMs
  });
}

async function loadPg() {
  try {
    return await import("pg");
  } catch (error) {
    throw new Error(`Applying migrations requires the optional pg package. Run npm install first. (${error.message})`);
  }
}
