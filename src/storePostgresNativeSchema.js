export const nativePostgresAdapterInfo = {
  id: "postgres_native",
  label: "Postgres Native",
  production_notes: "Native row-level Postgres adapter for high-write, multi-replica enterprise deployments.",
  capabilities: {
    persistent: true,
    multi_instance: true,
    managed_database: true,
    transactions: "postgres",
    online_migrations: true,
    recommended_max_replicas: null,
    backup_mode: "managed_database",
    snapshot_persistence: false,
    native_row_store: true
  },
  requirements: ["DEE_DATABASE_URL", "pg package"]
};

export const nativePostgresMigrationVersion = 2;

const nativePostgresTables = [
  "dee_migrations",
  "rule_sets",
  "rule_versions",
  "decision_stacks",
  "lookup_tables",
  "lookup_table_versions",
  "messages",
  "message_versions",
  "message_assets",
  "evaluation_profiles",
  "condition_blocks",
  "audit_log",
  "client_events",
  "precompute_runs",
  "experiment_assignments",
  "api_tokens",
  "settings",
  "runtime_state",
  "runtime_rate_limits",
  "assistant_provider_config_events",
  "assistant_provider_plan_events",
  "schema_items",
  "meiro_deliveries"
];

export function nativePostgresSchemaSql() {
  return [
    `CREATE TABLE IF NOT EXISTS dee_migrations (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
    )`,
    `CREATE TABLE IF NOT EXISTS rule_sets (
      decision_key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      input_schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      output_schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      type TEXT NOT NULL DEFAULT 'decision',
      priority INTEGER NOT NULL DEFAULT 0,
      surface TEXT NOT NULL DEFAULT '',
      cache_policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      author TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
      tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      draft_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS rule_versions (
      decision_key TEXT NOT NULL REFERENCES rule_sets(decision_key) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      published_at TIMESTAMPTZ NOT NULL,
      author TEXT NOT NULL,
      definition_json JSONB NOT NULL,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      PRIMARY KEY (decision_key, version)
    )`,
    `CREATE TABLE IF NOT EXISTS decision_stacks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
      surface TEXT NOT NULL DEFAULT '',
      ttl_seconds INTEGER NOT NULL DEFAULT 0,
      steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      author TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS lookup_tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_column TEXT NOT NULL DEFAULT 'key',
      rows_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL,
      author TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS lookup_table_versions (
      id TEXT NOT NULL,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      key_column TEXT NOT NULL DEFAULT 'key',
      rows_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL,
      author TEXT NOT NULL,
      PRIMARY KEY (id, version)
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      surface TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
      content_schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      default_content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL,
      author TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS message_versions (
      id TEXT NOT NULL,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      surface TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
      content_schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      default_content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL,
      author TEXT NOT NULL,
      PRIMARY KEY (id, version)
    )`,
    `CREATE TABLE IF NOT EXISTS message_assets (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      content_base64 TEXT NOT NULL,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL,
      created_by TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS evaluation_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      decision_key TEXT NOT NULL DEFAULT '',
      profile_key TEXT NOT NULL DEFAULT '',
      request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL,
      author TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS condition_blocks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      conditions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL,
      author TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      evaluated_at TIMESTAMPTZ NOT NULL,
      decision_key TEXT NOT NULL,
      profile_key TEXT NOT NULL,
      rule_version INTEGER NOT NULL,
      result TEXT NOT NULL,
      outputs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      matched_rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      errors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      entry_json JSONB NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS client_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'exposure', 'conversion', 'skipped')),
      occurred_at TIMESTAMPTZ NOT NULL,
      decision_key TEXT NOT NULL,
      profile_key TEXT NOT NULL,
      rule_version INTEGER,
      variant_key TEXT NOT NULL DEFAULT '',
      message_id TEXT NOT NULL DEFAULT '',
      surface TEXT NOT NULL DEFAULT '',
      context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      event_json JSONB NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS precompute_runs (
      id TEXT PRIMARY KEY,
      received_at TIMESTAMPTZ NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      surface TEXT NOT NULL DEFAULT '',
      sync_id TEXT NOT NULL DEFAULT '',
      profile_count INTEGER NOT NULL DEFAULT 0,
      candidate_evaluations INTEGER NOT NULL DEFAULT 0,
      eligible_count INTEGER NOT NULL DEFAULT 0,
      not_selected_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      run_json JSONB NOT NULL DEFAULT '{}'::jsonb
    )`,
    `CREATE TABLE IF NOT EXISTS experiment_assignments (
      id TEXT PRIMARY KEY,
      assigned_at TIMESTAMPTZ NOT NULL,
      decision_key TEXT NOT NULL,
      profile_key TEXT NOT NULL DEFAULT '',
      rule_version INTEGER NOT NULL DEFAULT 0,
      variant_key TEXT NOT NULL DEFAULT '',
      strategy TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      bucket DOUBLE PRECISION,
      assignment_json JSONB NOT NULL DEFAULT '{}'::jsonb
    )`,
    `CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      scopes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      decision_keys_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL,
      created_by TEXT NOT NULL,
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      revoked_by TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      updated_by TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS runtime_state (
      namespace TEXT NOT NULL,
      cache_key TEXT NOT NULL,
      value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      expires_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (namespace, cache_key)
    )`,
    `CREATE TABLE IF NOT EXISTS runtime_rate_limits (
      bucket_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      reset_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS assistant_provider_config_events (
      id TEXT PRIMARY KEY,
      changed_at TIMESTAMPTZ NOT NULL,
      changed_by TEXT NOT NULL,
      changes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb
    )`,
    `CREATE TABLE IF NOT EXISTS assistant_provider_plan_events (
      id TEXT PRIMARY KEY,
      planned_at TIMESTAMPTZ NOT NULL,
      planned_by TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      policy TEXT NOT NULL,
      contract_version TEXT NOT NULL,
      governance_status TEXT NOT NULL,
      prompt_hash TEXT NOT NULL,
      prompt_length INTEGER NOT NULL DEFAULT 0,
      request_type TEXT NOT NULL DEFAULT '',
      decision_key TEXT NOT NULL DEFAULT '',
      surface TEXT NOT NULL DEFAULT '',
      action_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      fallback_reason TEXT NOT NULL DEFAULT '',
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
    )`,
    `CREATE TABLE IF NOT EXISTS schema_items (
      kind TEXT NOT NULL CHECK (kind IN ('attribute', 'segment', 'context')),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      dimension TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL,
      author TEXT NOT NULL,
      PRIMARY KEY (kind, name)
    )`,
    `CREATE TABLE IF NOT EXISTS meiro_deliveries (
      id TEXT PRIMARY KEY,
      target TEXT NOT NULL,
      endpoint TEXT NOT NULL DEFAULT '',
      ok BOOLEAN NOT NULL DEFAULT false,
      status INTEGER NOT NULL DEFAULT 0,
      attempted_at TIMESTAMPTZ NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      error TEXT NOT NULL DEFAULT '',
      response_preview TEXT NOT NULL DEFAULT '',
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
    )`,
    ...nativePostgresIndexSql(),
    `INSERT INTO dee_migrations (id, version, metadata_json)
      VALUES ('native_schema', ${nativePostgresMigrationVersion}, '{"adapter":"postgres_native"}'::jsonb)
      ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, applied_at = now(), metadata_json = EXCLUDED.metadata_json`
  ];
}

export function nativePostgresIndexSql() {
  return [
    "CREATE INDEX IF NOT EXISTS idx_rule_versions_decision ON rule_versions(decision_key, version)",
    "CREATE INDEX IF NOT EXISTS idx_decision_stacks_status ON decision_stacks(status, updated_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_decision_time ON audit_log(decision_key, evaluated_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_profile_time ON audit_log(profile_key, evaluated_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_result_time ON audit_log(result, evaluated_at)",
    "CREATE INDEX IF NOT EXISTS idx_client_events_decision_time ON client_events(decision_key, occurred_at)",
    "CREATE INDEX IF NOT EXISTS idx_client_events_profile_time ON client_events(profile_key, occurred_at)",
    "CREATE INDEX IF NOT EXISTS idx_client_events_type_time ON client_events(event_type, occurred_at)",
    "CREATE INDEX IF NOT EXISTS idx_precompute_runs_time ON precompute_runs(received_at)",
    "CREATE INDEX IF NOT EXISTS idx_precompute_runs_surface_time ON precompute_runs(surface, received_at)",
    "CREATE INDEX IF NOT EXISTS idx_experiment_assignments_rule_time ON experiment_assignments(decision_key, assigned_at)",
    "CREATE INDEX IF NOT EXISTS idx_experiment_assignments_variant_time ON experiment_assignments(decision_key, variant_key, assigned_at)",
    "CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash)",
    "CREATE INDEX IF NOT EXISTS idx_runtime_state_expires ON runtime_state(expires_at)",
    "CREATE INDEX IF NOT EXISTS idx_runtime_rate_limits_reset ON runtime_rate_limits(reset_at)",
    "CREATE INDEX IF NOT EXISTS idx_schema_items_kind ON schema_items(kind, name)",
    "CREATE INDEX IF NOT EXISTS idx_lookup_table_versions ON lookup_table_versions(id, version)",
    "CREATE INDEX IF NOT EXISTS idx_messages_surface_status ON messages(surface, status)",
    "CREATE INDEX IF NOT EXISTS idx_message_versions ON message_versions(id, version)",
    "CREATE INDEX IF NOT EXISTS idx_message_assets_created ON message_assets(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_evaluation_profiles_rule ON evaluation_profiles(decision_key, updated_at)",
    "CREATE INDEX IF NOT EXISTS idx_condition_blocks_name ON condition_blocks(name, id)",
    "CREATE INDEX IF NOT EXISTS idx_meiro_deliveries_time ON meiro_deliveries(attempted_at)",
    "CREATE INDEX IF NOT EXISTS idx_assistant_provider_config_events_time ON assistant_provider_config_events(changed_at)",
    "CREATE INDEX IF NOT EXISTS idx_assistant_provider_plan_events_time ON assistant_provider_plan_events(planned_at)"
  ];
}

export function nativePostgresSchemaSummary() {
  return {
    version: nativePostgresMigrationVersion,
    table_count: nativePostgresTables.length,
    index_count: nativePostgresIndexSql().length,
    tables: [...nativePostgresTables],
    jsonb_tables: nativePostgresSchemaSql()
      .filter((statement) => statement.includes("JSONB"))
      .map((statement) => statement.match(/CREATE TABLE IF NOT EXISTS ([a-z_]+)/)?.[1])
      .filter(Boolean)
  };
}
