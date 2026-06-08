import assert from "node:assert/strict";
import test from "node:test";
import { listStoreAdapters, loadStoreAdapter } from "../src/storeAdapter.js";

test("store adapter registry exposes sqlite capabilities", () => {
  const adapters = listStoreAdapters();
  const sqlite = adapters.find((adapter) => adapter.id === "sqlite");
  assert.equal(sqlite.label, "SQLite");
  assert.equal(sqlite.available, true);
  assert.equal(sqlite.capabilities.persistent, true);
  assert.equal(sqlite.capabilities.multi_instance, false);
  const postgres = adapters.find((adapter) => adapter.id === "postgres");
  assert.equal(postgres.available, false);
  assert.equal(postgres.status, "configuration_required");
  assert.equal(postgres.capabilities.managed_database, true);
  assert.equal(postgres.capabilities.snapshot_persistence, true);
  assert.equal(postgres.capabilities.native_row_store, false);
  const postgresNative = adapters.find((adapter) => adapter.id === "postgres_native");
  assert.equal(postgresNative.available, false);
  assert.equal(postgresNative.status, "configuration_required");
  assert.equal(postgresNative.capabilities.multi_instance, true);
  assert.equal(postgresNative.capabilities.native_row_store, true);
  assert.deepEqual(postgresNative.requirements, ["DEE_DATABASE_URL", "pg package"]);
});

test("store adapter loader rejects unsupported adapters", async () => {
  await assert.rejects(
    () => loadStoreAdapter("postgres"),
    /requires DEE_DATABASE_URL/
  );
  await assert.rejects(
    () => loadStoreAdapter("postgres_native"),
    /requires DEE_DATABASE_URL/
  );
  await assert.rejects(
    () => loadStoreAdapter("oracle"),
    /Unsupported DEE_STORE_ADAPTER/
  );
});
