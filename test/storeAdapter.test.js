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
  assert.equal(postgres.status, "planned");
  assert.equal(postgres.capabilities.multi_instance, true);
});

test("store adapter loader rejects unsupported adapters", async () => {
  await assert.rejects(
    () => loadStoreAdapter("postgres"),
    /registered but not available/
  );
});
