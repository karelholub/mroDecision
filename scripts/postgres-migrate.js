#!/usr/bin/env node
import { config } from "../src/config.js";
import { nativePostgresMigrationVersion, nativePostgresSchemaSql, nativePostgresSchemaSummary } from "../src/storePostgresNativeSchema.js";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const print = args.has("--print") || !apply;

if (args.has("--help")) {
  console.log([
    "Usage:",
    "  npm run postgres:migrate -- --print",
    "  DEE_DATABASE_URL=postgres://... npm run postgres:migrate -- --apply",
    "",
    "Options:",
    "  --print  Print the native Postgres migration SQL without connecting to a database.",
    "  --apply  Apply the migration SQL to DEE_DATABASE_URL in one transaction."
  ].join("\n"));
  process.exit(0);
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
  const pool = new Pool({ connectionString: config.databaseUrl });
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

async function loadPg() {
  try {
    return await import("pg");
  } catch (error) {
    throw new Error(`Applying migrations requires the optional pg package. Run npm install first. (${error.message})`);
  }
}
