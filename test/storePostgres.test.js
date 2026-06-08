import assert from "node:assert/strict";
import test from "node:test";
import { postgresSnapshotInternals } from "../src/storePostgres.js";

test("postgres snapshot write uses optimistic revision protection", async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rowCount: 1 };
    }
  };

  const result = await postgresSnapshotInternals.writeSnapshot(pool, "dee_store_snapshots", { kind: "snapshot" }, 4);

  assert.equal(result.revision, 5);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /WHERE dee_store_snapshots\.revision = \$5/);
  assert.equal(calls[0].params[4], 4);
});

test("postgres snapshot write reports stale writer conflicts", async () => {
  const pool = {
    async query() {
      return { rowCount: 0 };
    }
  };

  await assert.rejects(
    () => postgresSnapshotInternals.writeSnapshot(pool, "dee_store_snapshots", { kind: "snapshot" }, 4),
    /revision conflict/
  );
});
