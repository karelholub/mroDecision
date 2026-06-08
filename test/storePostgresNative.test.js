import assert from "node:assert/strict";
import test from "node:test";
import { PostgresNativeReadStore } from "../src/storePostgresNative.js";

test("native postgres read store maps rule sets and versions", async () => {
  const calls = [];
  const client = fakeClient(calls, {
    "FROM rule_sets rs": [
      {
        decision_key: "next_best_offer",
        name: "Next Best Offer",
        description: "",
        input_schema_json: { attributes: ["lead_score"] },
        output_schema_json: "{}",
        type: "decision",
        priority: 50,
        surface: "homepage",
        cache_policy_json: { client_ttl: 60 },
        metadata_json: { owner: "growth" },
        author: "tester",
        status: "published",
        tags_json: ["nbo"],
        draft_json: { fallback: { result: "eligible" } },
        created_at: new Date("2026-06-01T10:00:00.000Z"),
        updated_at: new Date("2026-06-01T11:00:00.000Z"),
        latest_version: 2,
        last_published_at: new Date("2026-06-01T12:00:00.000Z")
      }
    ],
    "SELECT * FROM rule_sets WHERE decision_key": [
      {
        decision_key: "next_best_offer",
        name: "Next Best Offer",
        description: "",
        input_schema_json: "{}",
        output_schema_json: "{}",
        type: "decision",
        priority: 50,
        surface: "homepage",
        cache_policy_json: "{}",
        metadata_json: "{}",
        author: "tester",
        status: "published",
        tags_json: "[]",
        draft_json: "{}",
        created_at: "2026-06-01T10:00:00.000Z",
        updated_at: "2026-06-01T11:00:00.000Z"
      }
    ],
    "FROM rule_versions": [
      {
        version: 1,
        published_at: "2026-06-01T12:00:00.000Z",
        author: "publisher",
        definition_json: { branches: [] },
        metadata_json: "{}"
      }
    ]
  });
  const store = new PostgresNativeReadStore(client);

  const rules = await store.listRuleSets();
  const rule = await store.getRuleSet("next_best_offer");

  assert.equal(rules[0].decision_key, "next_best_offer");
  assert.equal(rules[0].version, 2);
  assert.equal(rules[0].updated_at, "2026-06-01T11:00:00.000Z");
  assert.deepEqual(rules[0].input_schema, { attributes: ["lead_score"] });
  assert.deepEqual(rules[0].cache_policy, { client_ttl: 60 });
  assert.equal(rule.versions[0].version, 1);
  assert.deepEqual(rule.versions[0].definition, { branches: [] });
  assert.deepEqual(calls.find((call) => call.sql.includes("WHERE decision_key")).params, ["next_best_offer"]);
});

test("native postgres read store maps catalogs and filtered reads", async () => {
  const calls = [];
  const client = fakeClient(calls, {
    "FROM lookup_tables": [
      { id: "offers", name: "Offers", key_column: "key", rows_json: [{ key: "a" }], metadata_json: {}, updated_at: "2026-06-01", author: "tester", version: 1 }
    ],
    "FROM messages": [
      { id: "banner", name: "Banner", surface: "homepage", status: "active", content_schema_json: {}, default_content_json: { title: "Hi" }, metadata_json: {}, updated_at: "2026-06-01", author: "tester", version: 3 }
    ],
    "FROM condition_blocks": [
      { id: "high_intent", name: "High intent", description: "", conditions_json: [], tags_json: ["intent"], metadata_json: {}, updated_at: "2026-06-01", author: "tester" }
    ],
    "FROM schema_items": [
      { kind: "attribute", name: "lead_score", type: "number", dimension: "", source: "meiro", raw_json: { id: "lead_score" }, updated_at: "2026-06-01", author: "system" }
    ],
    "FROM settings": [
      { key: "environment_label", value_json: "production" }
    ]
  });
  const store = new PostgresNativeReadStore(client);

  assert.equal((await store.listLookupTables())[0].rows.length, 1);
  assert.equal((await store.listMessages({ status: "active", surface: "homepage" }))[0].version, 3);
  assert.equal((await store.listConditionBlocks())[0].tags[0], "intent");
  assert.equal((await store.listSchemaItems({ kind: "attribute" }))[0].raw.id, "lead_score");
  assert.equal((await store.getSettings()).environment_label, "production");
  assert.deepEqual(calls.find((call) => call.sql.includes("FROM messages")).params, ["active", "homepage"]);
  assert.deepEqual(calls.find((call) => call.sql.includes("FROM schema_items")).params, ["attribute"]);
});

test("native postgres read store reports health probe status", async () => {
  const okStore = new PostgresNativeReadStore(fakeClient([], { "SELECT 1 AS ok": [{ ok: 1 }] }));
  assert.equal((await okStore.health()).ok, true);

  const failingStore = new PostgresNativeReadStore({
    async query() {
      throw new Error("connection refused");
    }
  });
  const health = await failingStore.health();
  assert.equal(health.ok, false);
  assert.match(health.error, /connection refused/);
});

function fakeClient(calls, responses) {
  return {
    async query(sql, params = []) {
      calls.push({ sql, params });
      const match = Object.entries(responses).find(([key]) => sql.includes(key));
      return { rows: match ? match[1] : [] };
    }
  };
}
