import assert from "node:assert/strict";
import test from "node:test";
import {
  nativePostgresAdapterInfo,
  nativePostgresIndexSql,
  nativePostgresSchemaSql,
  nativePostgresSchemaSummary
} from "../src/storePostgresNativeSchema.js";

test("native postgres schema covers core DEE tables", () => {
  const sql = nativePostgresSchemaSql().join("\n");
  const summary = nativePostgresSchemaSummary();

  assert.equal(nativePostgresAdapterInfo.capabilities.native_row_store, true);
  assert.equal(nativePostgresAdapterInfo.capabilities.multi_instance, true);
  assert.ok(summary.table_count >= 20);
  assert.ok(summary.index_count >= 20);
  for (const table of [
    "rule_sets",
    "rule_versions",
    "audit_log",
    "client_events",
    "precompute_runs",
    "experiment_assignments",
    "api_tokens",
    "settings",
    "runtime_state",
    "runtime_rate_limits",
    "schema_items"
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
});

test("native postgres schema uses postgres-native data types and indexes", () => {
  const sql = nativePostgresSchemaSql().join("\n");
  const indexSql = nativePostgresIndexSql().join("\n");

  assert.match(sql, /JSONB NOT NULL DEFAULT/);
  assert.match(sql, /BIGSERIAL PRIMARY KEY/);
  assert.match(sql, /TIMESTAMPTZ NOT NULL/);
  assert.match(sql, /ok BOOLEAN NOT NULL DEFAULT false/);
  assert.match(sql, /INSERT INTO dee_migrations/);
  assert.match(indexSql, /idx_client_events_decision_time/);
  assert.match(indexSql, /idx_runtime_state_expires/);
  assert.match(indexSql, /idx_runtime_rate_limits_reset/);
  assert.match(indexSql, /idx_assistant_provider_plan_events_time/);
});
