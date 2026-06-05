import assert from "node:assert/strict";
import test from "node:test";
import { listStoreAdapters, loadStoreAdapter } from "../src/storeAdapter.js";

test("store adapter registry exposes sqlite capabilities", () => {
  const adapters = listStoreAdapters();
  const sqlite = adapters.find((adapter) => adapter.id === "sqlite");
  assert.equal(sqlite.label, "SQLite");
  assert.equal(sqlite.capabilities.persistent, true);
  assert.equal(sqlite.capabilities.multi_instance, false);
});

test("store adapter loader rejects unsupported adapters", async () => {
  await assert.rejects(
    () => loadStoreAdapter("postgres"),
    /Unsupported DEE_STORE_ADAPTER: postgres/
  );
});
