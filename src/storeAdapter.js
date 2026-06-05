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
      transactions: "sqlite",
      online_migrations: false
    },
    load: () => Store.load({ adapter: "sqlite" })
  }
};

export async function loadStoreAdapter(adapterId = config.storeAdapter) {
  const id = normalizeStoreAdapter(adapterId);
  const adapter = storeAdapters[id];
  if (!adapter) {
    const supported = Object.keys(storeAdapters).join(", ");
    throw new Error(`Unsupported DEE_STORE_ADAPTER: ${adapterId || "(empty)"}. Supported adapters: ${supported}`);
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
  return Object.values(storeAdapters).map(({ id, label, production_notes, capabilities }) => ({
    id,
    label,
    production_notes,
    capabilities
  }));
}

function normalizeStoreAdapter(value) {
  return String(value || "sqlite").trim().toLowerCase();
}
