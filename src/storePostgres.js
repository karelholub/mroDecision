import { config } from "./config.js";
import { Store } from "./store.js";

export const postgresAdapterInfo = {
  id: "postgres",
  label: "Postgres Snapshot",
  production_notes: "Managed Postgres JSONB snapshot store. Use for managed persistence; keep one active writer until the native row-level Postgres adapter lands.",
  capabilities: {
    persistent: true,
    multi_instance: false,
    managed_database: true,
    transactions: "sqlite-memory+postgres-snapshot",
    online_migrations: true,
    recommended_max_replicas: 1,
    backup_mode: "managed_database",
    snapshot_persistence: true,
    native_row_store: false
  }
};

export async function loadPostgresStore() {
  if (!config.databaseUrl) {
    throw new Error("DEE_STORE_ADAPTER=postgres requires DEE_DATABASE_URL.");
  }
  const { Pool } = await loadPg();
  const table = safeSnapshotTableName(config.postgresSnapshotTable);
  const pool = new Pool({ connectionString: config.databaseUrl });
  let latest = null;
  try {
    await ensureSnapshotTable(pool, table);
    latest = await readSnapshot(pool, table);
    const store = await Store.loadInMemory({
      adapter: "postgres",
      adapterInfo: postgresAdapterInfo
    });
    if (latest?.snapshot) store.importSnapshot(latest.snapshot);
    store.adapter = "postgres";
    store.adapterInfo = postgresAdapterInfo;
    store.save = async () => {
      latest = await writeSnapshot(pool, table, store.exportSnapshot(), latest?.revision || 0);
    };
    const sqliteClose = store.close.bind(store);
    store.close = async () => {
      sqliteClose();
      await pool.end();
    };
    store.health = () => ({
      ok: true,
      adapter: "postgres",
      adapter_info: postgresAdapterInfo,
      deployment: snapshotDeploymentReadiness(),
      postgres: {
        table,
        mode: "snapshot",
        revision: latest?.revision || 0,
        saved_at: latest?.saved_at || null,
        database_url_configured: true
      }
    });
    return store;
  } catch (error) {
    await pool.end().catch(() => {});
    throw error;
  }
}

async function loadPg() {
  try {
    return await import("pg");
  } catch (error) {
    throw new Error(`DEE_STORE_ADAPTER=postgres requires the optional pg package. Run npm install before using this adapter. (${error.message})`);
  }
}

async function ensureSnapshotTable(pool, table) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id TEXT PRIMARY KEY,
      revision BIGINT NOT NULL DEFAULT 0,
      saved_at TIMESTAMPTZ NOT NULL,
      snapshot_json JSONB NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS ${table}_saved_at_idx ON ${table} (saved_at DESC)`);
}

async function readSnapshot(pool, table) {
  const result = await pool.query(`SELECT revision, saved_at, snapshot_json FROM ${table} WHERE id = $1`, ["singleton"]);
  const row = result.rows[0];
  if (!row) return { revision: 0, saved_at: null, snapshot: null };
  return {
    revision: Number(row.revision || 0),
    saved_at: row.saved_at ? new Date(row.saved_at).toISOString() : null,
    snapshot: row.snapshot_json
  };
}

async function writeSnapshot(pool, table, snapshot, previousRevision) {
  const revision = Number(previousRevision || 0) + 1;
  const savedAt = new Date().toISOString();
  await pool.query(
    `
      INSERT INTO ${table} (id, revision, saved_at, snapshot_json)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        revision = EXCLUDED.revision,
        saved_at = EXCLUDED.saved_at,
        snapshot_json = EXCLUDED.snapshot_json
    `,
    ["singleton", revision, savedAt, JSON.stringify(snapshot)]
  );
  return { revision, saved_at: savedAt, snapshot };
}

function safeSnapshotTableName(value) {
  const table = String(value || "dee_store_snapshots").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    throw new Error("DEE_POSTGRES_SNAPSHOT_TABLE must be a simple SQL identifier.");
  }
  return table;
}

function snapshotDeploymentReadiness() {
  return [
    {
      key: "database_connection",
      ok: true,
      level: "ok",
      label: "Database connection",
      detail: "Postgres connection was verified when the adapter loaded."
    },
    {
      key: "persistent_storage",
      ok: true,
      level: "ok",
      label: "Persistent storage",
      detail: "DEE snapshots are persisted to managed Postgres JSONB."
    },
    {
      key: "multi_instance",
      ok: false,
      level: "warn",
      label: "Multiple service replicas",
      detail: "Snapshot mode is intended for one active writer. Use a native row-level adapter before horizontal write scaling."
    },
    {
      key: "online_migrations",
      ok: true,
      level: "ok",
      label: "Online migrations",
      detail: "The adapter maintains its own snapshot table without changing DEE domain tables."
    },
    {
      key: "managed_database",
      ok: true,
      level: "ok",
      label: "Managed database",
      detail: "Backups and point-in-time recovery should be handled by the Postgres provider."
    }
  ];
}
