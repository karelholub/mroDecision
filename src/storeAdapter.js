import { config } from "./config.js";
import { Store } from "./store.js";

export const storeAdapters = {
  sqlite: {
    id: "sqlite",
    label: "SQLite",
    production_notes: "Single-writer local file store; run one service replica per database volume.",
    capabilities: {
      persistent: true,
      multi_instance: false,
      managed_database: false,
      transactions: "sqlite",
      online_migrations: false,
      recommended_max_replicas: 1,
      backup_mode: "file_snapshot"
    },
    load: () => Store.load({ adapter: "sqlite" })
  }
};

export const plannedStoreAdapters = {
  postgres: {
    id: "postgres",
    label: "Postgres",
    status: "planned",
    production_notes: "Managed multi-instance database target for enterprise deployments; not available in this local build yet.",
    capabilities: {
      persistent: true,
      multi_instance: true,
      managed_database: true,
      transactions: "postgres",
      online_migrations: true,
      recommended_max_replicas: null,
      backup_mode: "managed_database"
    },
    requirements: ["DEE_DATABASE_URL", "Postgres driver package", "async store implementation"]
  }
};

export async function loadStoreAdapter(adapterId = config.storeAdapter) {
  const id = normalizeStoreAdapter(adapterId);
  const adapter = storeAdapters[id];
  if (!adapter) {
    if (plannedStoreAdapters[id]) {
      throw new Error(`DEE_STORE_ADAPTER ${id} is registered but not available in this build. Use sqlite, or deploy a build with the managed database adapter.`);
    }
    const supported = Object.keys(storeAdapters).join(", ");
    const planned = Object.keys(plannedStoreAdapters).join(", ");
    throw new Error(`Unsupported DEE_STORE_ADAPTER: ${adapterId || "(empty)"}. Supported adapters: ${supported}. Planned adapters: ${planned}`);
  }
  const store = await adapter.load();
  store.adapter = adapter.id;
  store.adapterInfo = {
    id: adapter.id,
    label: adapter.label,
    production_notes: adapter.production_notes,
    capabilities: adapter.capabilities
  };
  return store;
}

export function listStoreAdapters() {
  const available = Object.values(storeAdapters).map(({ id, label, production_notes, capabilities }) => ({
    id,
    label,
    available: true,
    status: "available",
    production_notes,
    capabilities
  }));
  const planned = Object.values(plannedStoreAdapters).map(({ id, label, status, production_notes, capabilities, requirements }) => ({
    id,
    label,
    available: false,
    status,
    production_notes,
    capabilities,
    requirements
  }));
  return [...available, ...planned];
}

function normalizeStoreAdapter(value) {
  return String(value || "sqlite").trim().toLowerCase();
}
