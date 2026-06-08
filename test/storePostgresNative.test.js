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

test("native postgres write store updates settings and records assistant config changes", async () => {
  const calls = [];
  const settings = new Map([
    ["environment_label", "local"],
    ["assistant_llm_enabled", false],
    ["assistant_llm_api_key", ""]
  ]);
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT key, value_json FROM settings")) {
        return { rows: [...settings.entries()].map(([key, value]) => ({ key, value_json: value })) };
      }
      if (sql.includes("FROM api_tokens")) return { rows: [{ scopes_json: ["admin"] }] };
      if (sql.startsWith("INSERT INTO settings")) {
        settings.set(params[0], JSON.parse(params[1]));
        return { rows: [] };
      }
      return { rows: [] };
    }
  };
  const store = new PostgresNativeReadStore(client);

  const updated = await store.updateSettings(
    {
      environment_label: "production",
      assistant_llm_enabled: true,
      assistant_llm_api_key: "secret",
      unsupported_key: "ignored"
    },
    "admin"
  );

  assert.equal(updated.environment_label, "production");
  assert.equal(updated.assistant_llm_enabled, true);
  assert.equal(settings.has("unsupported_key"), false);
  assert.ok(calls.some((call) => call.sql === "BEGIN"));
  assert.ok(calls.some((call) => call.sql === "COMMIT"));
  const settingWrites = calls.filter((call) => call.sql.startsWith("INSERT INTO settings"));
  assert.equal(settingWrites.length, 3);
  const auditWrite = calls.find((call) => call.sql.includes("assistant_provider_config_events"));
  assert.ok(auditWrite);
  assert.equal(JSON.parse(auditWrite.params[3]).assistant_llm_api_key.to, "configured");
});

test("native postgres write store blocks bootstrap hardening without active admin token", async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT key, value_json FROM settings")) return { rows: [] };
      if (sql.includes("FROM api_tokens")) return { rows: [{ scopes_json: ["viewer"] }] };
      return { rows: [] };
    }
  };
  const store = new PostgresNativeReadStore(client);

  await assert.rejects(
    () => store.updateSettings({ bootstrap_tokens_enabled: false }, "admin"),
    /active DB admin token/
  );
  assert.equal(calls.some((call) => call.sql === "BEGIN"), false);
});

test("native postgres write store replaces schema items transactionally", async () => {
  const calls = [];
  const schemaRows = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.startsWith("DELETE FROM schema_items")) {
        for (let index = schemaRows.length - 1; index >= 0; index -= 1) {
          if (schemaRows[index].kind === params[0]) schemaRows.splice(index, 1);
        }
        return { rows: [] };
      }
      if (sql.startsWith("INSERT INTO schema_items")) {
        schemaRows.push({
          kind: params[0],
          name: params[1],
          type: params[2],
          dimension: params[3],
          source: params[4],
          raw_json: JSON.parse(params[5]),
          updated_at: params[6],
          author: params[7]
        });
        return { rows: [] };
      }
      if (sql.includes("FROM schema_items")) return { rows: schemaRows.filter((row) => row.kind === params[0]) };
      return { rows: [] };
    }
  };
  const store = new PostgresNativeReadStore(client);

  const result = await store.replaceSchemaItems("attribute", [{ name: "lead_score", type: "number", source: "meiro" }], "sync");

  assert.equal(result[0].name, "lead_score");
  assert.equal(result[0].type, "number");
  assert.ok(calls.some((call) => call.sql === "BEGIN"));
  assert.ok(calls.some((call) => call.sql === "COMMIT"));
  assert.deepEqual(calls.find((call) => call.sql.startsWith("DELETE FROM schema_items")).params, ["attribute"]);
});

test("native postgres write store rolls back schema replacement on invalid item", async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      return { rows: [] };
    }
  };
  const store = new PostgresNativeReadStore(client);

  await assert.rejects(
    () => store.replaceSchemaItems("attribute", [{ type: "number" }], "sync"),
    /include a name/
  );
  assert.ok(calls.some((call) => call.sql === "ROLLBACK"));
});

test("native postgres rule writes create and update drafts", async () => {
  const { client, calls, rules } = nativeRuleClient();
  const store = new PostgresNativeReadStore(client);

  const created = await store.createRuleSet(
    {
      name: "Retention Offer",
      decision_key: "Retention Offer",
      type: "decision",
      priority: 80,
      tags: ["retention"],
      draft: { fallback: { result: "eligible" }, branches: [] }
    },
    "editor"
  );
  const updated = await store.updateDraft(
    created.decision_key,
    {
      metadata: { approval: { status: "approved", approved_by: "lead", approved_at: "2026-06-01T10:00:00.000Z" } },
      draft: { fallback: { result: "deferred" }, branches: [{ id: "branch_1" }] }
    },
    "editor"
  );

  assert.equal(created.decision_key, "retention_offer");
  assert.equal(rules.get("retention_offer").priority, 80);
  assert.equal(updated.status, "draft");
  assert.equal(updated.metadata.approval.status, "draft");
  assert.equal(updated.metadata.approval.invalidated_by, "editor");
  assert.deepEqual(rules.get("retention_offer").draft_json.branches, [{ id: "branch_1" }]);
  assert.ok(calls.some((call) => call.sql.startsWith("INSERT INTO rule_sets")));
  assert.ok(calls.some((call) => call.sql.startsWith("UPDATE rule_sets SET")));
});

test("native postgres rule writes publish and archive in transactions", async () => {
  const { client, calls, rules, versions } = nativeRuleClient();
  seedRule(rules, {
    decision_key: "next_best_offer",
    name: "Next Best Offer",
    status: "draft",
    draft_json: { fallback: { result: "eligible" }, branches: [] },
    metadata_json: { owner: "growth" }
  });
  const store = new PostgresNativeReadStore(client);

  const version = await store.publish("next_best_offer", "publisher");
  const archived = await store.archiveRuleSet("next_best_offer", "admin");

  assert.equal(version.version, 1);
  assert.deepEqual(versions.get("next_best_offer")[0].definition_json, { fallback: { result: "eligible" }, branches: [] });
  assert.equal(rules.get("next_best_offer").status, "archived");
  assert.equal(archived.status, "archived");
  assert.ok(calls.some((call) => call.sql === "BEGIN"));
  assert.ok(calls.some((call) => call.sql === "COMMIT"));
});

test("native postgres rule reads expose server-compatible version aliases", async () => {
  const { client, rules, versions } = nativeRuleClient();
  seedRule(rules, { decision_key: "next_best_offer", name: "Next Best Offer", status: "published" });
  versions.set("next_best_offer", [
    { version: 1, published_at: "2026-06-01T10:00:00.000Z", author: "publisher", definition_json: { fallback: { result: "deferred" } }, metadata_json: {} },
    { version: 2, published_at: "2026-06-02T10:00:00.000Z", author: "publisher", definition_json: { fallback: { result: "eligible" } }, metadata_json: {} }
  ]);
  const store = new PostgresNativeReadStore(client);

  const all = await store.listVersions("next_best_offer");
  const latest = await store.getVersion("next_best_offer");
  const first = await store.getVersion("next_best_offer", 1);

  assert.equal(all.length, 2);
  assert.equal(latest.version, 2);
  assert.equal(first.definition.fallback.result, "deferred");
});

test("native postgres rule writes upsert rule versions transactionally", async () => {
  const { client, calls, rules, versions } = nativeRuleClient();
  seedRule(rules, { decision_key: "loan", name: "Loan", status: "draft" });
  versions.set("loan", [{ version: 1, published_at: "old", author: "old", definition_json: {}, metadata_json: {} }]);
  const store = new PostgresNativeReadStore(client);

  const updated = await store.upsertRuleSet(
    {
      decision_key: "loan",
      name: "Loan Eligibility",
      status: "published",
      versions: [
        { version: 2, published_at: "2026-06-01T10:00:00.000Z", author: "publisher", definition: { fallback: { result: "eligible" } }, metadata: { note: "v2" } }
      ]
    },
    "editor"
  );

  assert.equal(updated.status, "published");
  assert.equal(rules.get("loan").name, "Loan Eligibility");
  assert.equal(versions.get("loan").length, 1);
  assert.equal(versions.get("loan")[0].version, 2);
  assert.ok(calls.some((call) => call.sql === "BEGIN"));
  assert.ok(calls.some((call) => call.sql === "COMMIT"));
  assert.ok(calls.some((call) => call.sql.startsWith("DELETE FROM rule_versions")));
});

test("native postgres runtime writes audit, client events, and assignments", async () => {
  const { client, calls, audit, clientEvents, assignments } = nativeRuntimeClient();
  const store = new PostgresNativeReadStore(client);

  await store.addAudit({
    evaluated_at: "2026-06-01T10:00:00.000Z",
    decision_key: "next_best_offer",
    profile_key: "profile-1",
    rule_version: 2,
    result: "eligible",
    outputs: { offer_id: "solar" },
    matched_rules: ["branch_1"],
    errors: []
  });
  const event = await store.addClientEvent({
    event_id: "evt-1",
    event_type: "exposure",
    occurred_at: "2026-06-01T10:01:00.000Z",
    decision_key: "next_best_offer",
    profile_key: "profile-1",
    rule_version: 2,
    variant_key: "treatment",
    message_id: "hero_message",
    surface: "homepage"
  });
  const duplicate = await store.addClientEvent({ ...event, event_id: "evt-1" });
  const count = await store.countClientEvents({ event_type: "exposure", decision_key: "next_best_offer", profile_key: "profile-1" });
  const assignment = await store.addExperimentAssignment({
    decision_key: "next_best_offer",
    profile_key: "profile-1",
    rule_version: 2,
    variant_key: "treatment",
    strategy: "fixed",
    bucket: 42
  });

  assert.equal(audit.length, 1);
  assert.equal(event.accepted, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(count, 1);
  assert.equal(assignments.length, 1);
  assert.equal(assignment.variant_key, "treatment");
  assert.ok(calls.some((call) => call.sql.startsWith("INSERT INTO audit_log")));
  assert.ok(calls.some((call) => call.sql.includes("ON CONFLICT(event_id) DO NOTHING")));
});

test("native postgres runtime stores Meiro delivery history", async () => {
  const { client, calls, meiroDeliveries } = nativeRuntimeClient();
  const store = new PostgresNativeReadStore(client);

  const accepted = await store.recordMeiroDelivery({
    target: "feedback",
    endpoint: "https://example.test/collect/decision-engine-feedback",
    ok: true,
    status: 202,
    attempted_at: "2026-06-01T10:00:00.000Z",
    duration_ms: 42,
    payload: { profile_key: "profile-1", decision_key: "next_best_offer" }
  });
  await store.recordMeiroDelivery({
    target: "collector",
    endpoint: "https://example.test/collect/source",
    ok: false,
    status: 400,
    attempted_at: "2026-06-01T10:01:00.000Z",
    duration_ms: 10,
    error: "bad request",
    payload: { profile_key: "profile-2" }
  });

  const feedback = await store.listMeiroDeliveries({ target: "feedback", ok: "true", search: "profile-1" });
  const failed = await store.listMeiroDeliveries({ ok: "false" });
  const summary = await store.getMeiroDeliverySummary();

  assert.equal(accepted.ok, true);
  assert.equal(meiroDeliveries.length, 2);
  assert.equal(feedback.length, 1);
  assert.equal(feedback[0].payload.profile_key, "profile-1");
  assert.equal(failed[0].status, 400);
  assert.equal(summary.total, 2);
  assert.equal(summary.failed, 1);
  assert.equal(summary.targets.collector, 1);
  assert.ok(calls.some((call) => call.sql.startsWith("INSERT INTO meiro_deliveries")));
  assert.ok(calls.some((call) => call.sql.includes("payload_json::text ILIKE")));
});

test("native postgres content writes replace lookup tables with version history", async () => {
  const { client, calls, lookups, lookupVersions } = nativeContentClient();
  const store = new PostgresNativeReadStore(client);

  const created = await store.replaceLookupTable(
    "offer_tiers",
    {
      name: "Offer tiers",
      key_column: "offer_id",
      rows: [{ offer_id: "solar", tier: "green" }],
      metadata: { owner: "marketing" }
    },
    "editor"
  );
  const updated = await store.replaceLookupTable(
    "offer_tiers",
    { rows: [{ offer_id: "solar", tier: "premium" }, { offer_id: "loan", tier: "finance" }] },
    "editor"
  );
  const versions = await store.listLookupTableVersions("offer_tiers");
  const firstVersion = await store.getLookupTableVersion("offer_tiers", 1);

  assert.equal(created.version, 1);
  assert.equal(updated.version, 2);
  assert.equal(lookups.get("offer_tiers").name, "Offer tiers");
  assert.equal(lookups.get("offer_tiers").key_column, "offer_id");
  assert.equal(lookupVersions.get("offer_tiers").length, 2);
  assert.deepEqual(versions.map((item) => item.version), [2, 1]);
  assert.equal(versions[0].row_count, 2);
  assert.equal(firstVersion.rows[0].tier, "green");
  assert.ok(calls.some((call) => call.sql.startsWith("INSERT INTO lookup_tables")));
  assert.ok(calls.some((call) => call.sql.startsWith("INSERT INTO lookup_table_versions")));
});

test("native postgres content writes upsert messages with version history", async () => {
  const { client, calls, messages, messageVersions } = nativeContentClient();
  const store = new PostgresNativeReadStore(client);

  const created = await store.upsertMessage(
    "homepage_banner",
    {
      name: "Homepage banner",
      surface: "homepage",
      content_schema: { fields: ["title", "cta_url"] },
      default_content: { title: "Welcome", cta_url: "https://example.com" },
      metadata: { template_type: "banner" }
    },
    "editor"
  );
  const updated = await store.upsertMessage(
    "homepage_banner",
    { default_content: { title: "Welcome back", cta_url: "https://example.com/offer" } },
    "editor"
  );
  const versions = await store.listMessageVersions("homepage_banner");
  const firstVersion = await store.getMessageVersion("homepage_banner", 1);

  assert.equal(created.version, 1);
  assert.equal(updated.version, 2);
  assert.equal(messages.get("homepage_banner").surface, "homepage");
  assert.equal(messages.get("homepage_banner").content_schema_json.fields[0], "title");
  assert.equal(messageVersions.get("homepage_banner").length, 2);
  assert.deepEqual(versions.map((item) => item.version), [2, 1]);
  assert.deepEqual(versions[0].content_keys, ["title", "cta_url"]);
  assert.equal(firstVersion.default_content.title, "Welcome");
  assert.ok(calls.some((call) => call.sql.startsWith("INSERT INTO messages")));
  assert.ok(calls.some((call) => call.sql.startsWith("INSERT INTO message_versions")));
});

test("native postgres content writes manage message assets and usage guards", async () => {
  const { client, calls, assets, messages } = nativeContentClient();
  const store = new PostgresNativeReadStore(client);

  const asset = await store.createMessageAsset(
    {
      filename: "hero.png",
      content_type: "image/png",
      base64: "aGVsbG8=",
      metadata: { source: "upload" }
    },
    "designer"
  );
  messages.set("hero_message", {
    id: "hero_message",
    name: "Hero message",
    surface: "homepage",
    status: "active",
    content_schema_json: {},
    default_content_json: { image_url: asset.content_url },
    metadata_json: {},
    updated_at: "2026-06-01T00:00:00.000Z",
    author: "designer",
    version: 1
  });

  const listed = await store.listMessageAssets();
  const withContent = await store.getMessageAsset(asset.id, true);
  await assert.rejects(() => store.deleteMessageAsset(asset.id), /still used/);
  const forced = await store.deleteMessageAsset(asset.id, { force: true });
  const unused = await store.createMessageAsset({ filename: "unused.svg", content_type: "image/svg+xml", base64: "PHN2Zy8+" }, "designer");
  messages.clear();
  const cleanup = await store.cleanupMessageAssets();

  assert.equal(asset.filename, "hero.png");
  assert.equal(assets.has(asset.id), false);
  assert.equal(listed[0].used_by[0].id, "hero_message");
  assert.equal(withContent.content_base64, "aGVsbG8=");
  assert.equal(forced.deleted, true);
  assert.equal(cleanup.deleted, 1);
  assert.equal(cleanup.assets[0].id, unused.id);
  assert.ok(calls.some((call) => call.sql.startsWith("INSERT INTO message_assets")));
  assert.ok(calls.some((call) => call.sql.startsWith("DELETE FROM message_assets")));
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

function nativeContentClient() {
  const calls = [];
  const lookups = new Map();
  const lookupVersions = new Map();
  const messages = new Map();
  const messageVersions = new Map();
  const assets = new Map();
  return {
    calls,
    lookups,
    lookupVersions,
    messages,
    messageVersions,
    assets,
    client: {
      async query(sql, params = []) {
        calls.push({ sql, params });
        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
        if (sql.startsWith("SELECT * FROM lookup_tables WHERE id")) {
          const row = lookups.get(params[0]);
          return { rows: row ? [row] : [] };
        }
        if (sql.startsWith("INSERT INTO lookup_tables")) {
          lookups.set(params[0], lookupRowFromParams(params));
          return { rows: [] };
        }
        if (sql.startsWith("INSERT INTO lookup_table_versions")) {
          const list = lookupVersions.get(params[0]) || [];
          const row = lookupVersionRowFromParams(params);
          const existingIndex = list.findIndex((item) => item.version === row.version);
          if (existingIndex >= 0) list[existingIndex] = row;
          else list.push(row);
          lookupVersions.set(params[0], list);
          return { rows: [] };
        }
        if (sql.startsWith("SELECT * FROM lookup_table_versions WHERE id = $1 AND version")) {
          return { rows: (lookupVersions.get(params[0]) || []).filter((row) => row.version === params[1]) };
        }
        if (sql.startsWith("SELECT * FROM lookup_table_versions WHERE id")) {
          return { rows: [...(lookupVersions.get(params[0]) || [])].sort((a, b) => b.version - a.version) };
        }
        if (sql.startsWith("SELECT * FROM messages WHERE id")) {
          const row = messages.get(params[0]);
          return { rows: row ? [row] : [] };
        }
        if (sql.includes("FROM messages")) {
          return { rows: [...messages.values()] };
        }
        if (sql.startsWith("SELECT MAX(version) AS version FROM message_versions")) {
          const max = Math.max(0, ...(messageVersions.get(params[0]) || []).map((row) => Number(row.version || 0)));
          return { rows: [{ version: max || null }] };
        }
        if (sql.startsWith("INSERT INTO messages")) {
          messages.set(params[0], messageRowFromParams(params));
          return { rows: [] };
        }
        if (sql.startsWith("INSERT INTO message_versions")) {
          const list = messageVersions.get(params[0]) || [];
          const row = messageVersionRowFromParams(params);
          const existingIndex = list.findIndex((item) => item.version === row.version);
          if (existingIndex >= 0) list[existingIndex] = row;
          else list.push(row);
          messageVersions.set(params[0], list);
          return { rows: [] };
        }
        if (sql.startsWith("SELECT * FROM message_versions WHERE id = $1 AND version")) {
          return { rows: (messageVersions.get(params[0]) || []).filter((row) => row.version === params[1]) };
        }
        if (sql.startsWith("SELECT * FROM message_versions WHERE id")) {
          return { rows: [...(messageVersions.get(params[0]) || [])].sort((a, b) => b.version - a.version) };
        }
        if (sql.startsWith("SELECT id, filename, content_type")) {
          return { rows: [...assets.values()].map(({ content_base64, ...row }) => row) };
        }
        if (sql.startsWith("INSERT INTO message_assets")) {
          assets.set(params[0], messageAssetRowFromParams(params));
          return { rows: [] };
        }
        if (sql.startsWith("SELECT * FROM message_assets WHERE id")) {
          const row = assets.get(params[0]);
          return { rows: row ? [row] : [] };
        }
        if (sql.startsWith("DELETE FROM message_assets")) {
          assets.delete(params[0]);
          return { rows: [] };
        }
        if (sql.includes("FROM rule_sets rs")) {
          return { rows: [] };
        }
        return { rows: [] };
      }
    }
  };
}

function nativeRuntimeClient() {
  const calls = [];
  const audit = [];
  const clientEvents = new Map();
  const assignments = [];
  const meiroDeliveries = [];
  return {
    calls,
    audit,
    clientEvents,
    assignments,
    meiroDeliveries,
    client: {
      async query(sql, params = []) {
        calls.push({ sql, params });
        if (sql.startsWith("INSERT INTO audit_log")) {
          audit.push({
            evaluated_at: params[0],
            decision_key: params[1],
            profile_key: params[2],
            rule_version: params[3],
            result: params[4],
            outputs_json: JSON.parse(params[5]),
            matched_rules_json: JSON.parse(params[6]),
            errors_json: JSON.parse(params[7]),
            entry_json: JSON.parse(params[8])
          });
          return { rows: [] };
        }
        if (sql.startsWith("INSERT INTO client_events")) {
          if (clientEvents.has(params[0])) return { rows: [] };
          const row = {
            event_id: params[0],
            event_type: params[1],
            occurred_at: params[2],
            decision_key: params[3],
            profile_key: params[4],
            rule_version: params[5],
            variant_key: params[6],
            message_id: params[7],
            surface: params[8],
            context_json: JSON.parse(params[9]),
            event_json: JSON.parse(params[10])
          };
          clientEvents.set(params[0], row);
          return { rows: [{ event_json: row.event_json }] };
        }
        if (sql.startsWith("SELECT event_json FROM client_events")) {
          const row = clientEvents.get(params[0]);
          return { rows: row ? [{ event_json: row.event_json }] : [] };
        }
        if (sql.startsWith("SELECT COUNT(*) AS count FROM client_events")) {
          const filters = extractClientEventFilters(sql, params);
          const count = [...clientEvents.values()].filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value)).length;
          return { rows: [{ count }] };
        }
        if (sql.startsWith("INSERT INTO experiment_assignments")) {
          assignments.push({
            id: params[0],
            assigned_at: params[1],
            decision_key: params[2],
            profile_key: params[3],
            rule_version: params[4],
            variant_key: params[5],
            strategy: params[6],
            reason: params[7],
            bucket: params[8],
            assignment_json: JSON.parse(params[9])
          });
          return { rows: [] };
        }
        if (sql.startsWith("INSERT INTO meiro_deliveries")) {
          meiroDeliveries.push({
            id: params[0],
            target: params[1],
            endpoint: params[2],
            ok: params[3],
            status: params[4],
            attempted_at: params[5],
            duration_ms: params[6],
            error: params[7],
            response_preview: params[8],
            payload_json: JSON.parse(params[9])
          });
          return { rows: [] };
        }
        if (sql.startsWith("SELECT * FROM meiro_deliveries")) {
          const filters = extractMeiroDeliveryFilters(sql, params);
          const rows = meiroDeliveries
            .filter((row) => Object.entries(filters).every(([key, value]) => {
              if (key === "search") {
                const haystack = `${row.endpoint} ${row.error} ${row.response_preview} ${JSON.stringify(row.payload_json)}`.toLowerCase();
                return haystack.includes(value.toLowerCase().replaceAll("%", ""));
              }
              return row[key] === value;
            }))
            .sort((a, b) => String(b.attempted_at).localeCompare(String(a.attempted_at)))
            .slice(0, Number(params.at(-1) || 20));
          return { rows };
        }
        return { rows: [] };
      }
    }
  };
}

function extractMeiroDeliveryFilters(sql, params) {
  const filters = {};
  for (const key of ["target", "status"]) {
    const match = sql.match(new RegExp(`${key} = \\$(\\d+)`));
    if (match) filters[key] = params[Number(match[1]) - 1];
  }
  if (sql.includes("ok = true")) filters.ok = true;
  if (sql.includes("ok = false")) filters.ok = false;
  const searchMatch = sql.match(/payload_json::text ILIKE \$(\d+)/);
  if (searchMatch) filters.search = params[Number(searchMatch[1]) - 1];
  return filters;
}

function nativeRuleClient() {
  const calls = [];
  const rules = new Map();
  const versions = new Map();
  return {
    calls,
    rules,
    versions,
    client: {
      async query(sql, params = []) {
        calls.push({ sql, params });
        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
        if (sql.startsWith("SELECT * FROM rule_sets WHERE decision_key")) {
          const row = rules.get(params[0]);
          return { rows: row ? [row] : [] };
        }
        if (sql.startsWith("INSERT INTO rule_sets")) {
          rules.set(params[0], ruleRowFromParams(params));
          return { rows: [] };
        }
        if (sql.startsWith("UPDATE rule_sets SET status")) {
          const existing = rules.get(params[1]);
          if (existing) existing.status = params[0];
          return { rows: [] };
        }
        if (sql.startsWith("DELETE FROM rule_versions")) {
          versions.set(params[0], []);
          return { rows: [] };
        }
        if (sql.includes("FROM rule_versions")) {
          return { rows: versions.get(params[0]) || [] };
        }
        if (sql.startsWith("UPDATE rule_sets SET")) {
          const existing = rules.get(params[0]) || {};
          rules.set(params[0], { ...existing, ...ruleRowFromParams(params), created_at: existing.created_at || params[14] });
          return { rows: [] };
        }
        if (sql.startsWith("INSERT INTO rule_versions")) {
          const list = versions.get(params[0]) || [];
          list.push({
            decision_key: params[0],
            version: params[1],
            published_at: params[2],
            author: params[3],
            definition_json: JSON.parse(params[4]),
            metadata_json: JSON.parse(params[5])
          });
          versions.set(params[0], list);
          return { rows: [] };
        }
        return { rows: [] };
      }
    }
  };
}

function extractClientEventFilters(sql, params) {
  const filters = {};
  for (const key of ["event_type", "decision_key", "profile_key", "variant_key", "message_id", "surface"]) {
    const match = sql.match(new RegExp(`${key} = \\$(\\d+)`));
    if (match) filters[key] = params[Number(match[1]) - 1];
  }
  return filters;
}

function lookupRowFromParams(params) {
  return {
    id: params[0],
    name: params[1],
    key_column: params[2],
    rows_json: JSON.parse(params[3]),
    metadata_json: JSON.parse(params[4]),
    updated_at: params[5],
    author: params[6],
    version: params[7]
  };
}

function lookupVersionRowFromParams(params) {
  return {
    id: params[0],
    version: params[1],
    name: params[2],
    key_column: params[3],
    rows_json: JSON.parse(params[4]),
    metadata_json: JSON.parse(params[5]),
    updated_at: params[6],
    author: params[7]
  };
}

function messageRowFromParams(params) {
  return {
    id: params[0],
    name: params[1],
    surface: params[2],
    status: params[3],
    content_schema_json: JSON.parse(params[4]),
    default_content_json: JSON.parse(params[5]),
    metadata_json: JSON.parse(params[6]),
    updated_at: params[7],
    author: params[8],
    version: params[9]
  };
}

function messageVersionRowFromParams(params) {
  return {
    id: params[0],
    version: params[1],
    name: params[2],
    surface: params[3],
    status: params[4],
    content_schema_json: JSON.parse(params[5]),
    default_content_json: JSON.parse(params[6]),
    metadata_json: JSON.parse(params[7]),
    updated_at: params[8],
    author: params[9]
  };
}

function messageAssetRowFromParams(params) {
  return {
    id: params[0],
    filename: params[1],
    content_type: params[2],
    size_bytes: params[3],
    content_base64: params[4],
    metadata_json: JSON.parse(params[5]),
    created_at: params[6],
    created_by: params[7]
  };
}

function seedRule(rules, row) {
  const now = "2026-06-01T00:00:00.000Z";
  rules.set(row.decision_key, {
    decision_key: row.decision_key,
    name: row.name || row.decision_key,
    description: row.description || "",
    input_schema_json: row.input_schema_json || {},
    output_schema_json: row.output_schema_json || {},
    type: row.type || "decision",
    priority: row.priority || 0,
    surface: row.surface || "",
    cache_policy_json: row.cache_policy_json || {},
    metadata_json: row.metadata_json || {},
    author: row.author || "system",
    status: row.status || "draft",
    tags_json: row.tags_json || [],
    draft_json: row.draft_json || {},
    created_at: row.created_at || now,
    updated_at: row.updated_at || now
  });
}

function ruleRowFromParams(params) {
  return {
    decision_key: params[0],
    name: params[1],
    description: params[2],
    input_schema_json: JSON.parse(params[3]),
    output_schema_json: JSON.parse(params[4]),
    type: params[5],
    priority: params[6],
    surface: params[7],
    cache_policy_json: JSON.parse(params[8]),
    metadata_json: JSON.parse(params[9]),
    author: params[10],
    status: params[11],
    tags_json: JSON.parse(params[12]),
    draft_json: JSON.parse(params[13]),
    created_at: params[14],
    updated_at: params[15]
  };
}
