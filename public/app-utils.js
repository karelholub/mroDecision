(function(global) {
  "use strict";

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function cssEscape(value) {
    return global.CSS?.escape ? global.CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
  }

  function header(values) {
    return row(values);
  }

  function row(values, options = {}) {
    const attrs = [
      options.key ? `data-rule-key="${escapeHtml(options.key)}"` : "",
      options.lookupId ? `data-lookup-id="${escapeHtml(options.lookupId)}"` : "",
      options.messageId ? `data-message-id="${escapeHtml(options.messageId)}"` : "",
      options.messageVersion ? `data-message-version="${escapeHtml(options.messageVersion)}"` : "",
      options.deliveryId ? `data-delivery-id="${escapeHtml(options.deliveryId)}"` : "",
      options.metricRuleKey ? `data-metric-rule-key="${escapeHtml(options.metricRuleKey)}"` : "",
      Number.isInteger(options.auditIndex) ? `data-audit-index="${options.auditIndex}"` : "",
      options.tokenId ? `data-token-id="${escapeHtml(options.tokenId)}"` : ""
    ].filter(Boolean).join(" ");
    const className = options.key || options.lookupId || options.messageId || options.messageVersion || options.deliveryId || options.metricRuleKey || Number.isInteger(options.auditIndex) || options.tokenId ? "row actionable" : "row";
    return `<div class="${className}" ${attrs}>${values.map((value, index) => `<div>${options.rawColumns?.includes(index) ? String(value ?? "") : escapeHtml(String(value ?? ""))}</div>`).join("")}</div>`;
  }

  function debounce(callback, waitMs = 200) {
    let timer = null;
    return (...args) => {
      global.clearTimeout(timer);
      timer = global.setTimeout(() => callback(...args), waitMs);
    };
  }

  function formatTime(value) {
    return value ? new Date(value).toLocaleString() : "-";
  }

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value || 0));
  }

  function formatPercent(value) {
    return `${Math.round(Number(value || 0) * 1000) / 10}%`;
  }

  function formatSignedPercent(value) {
    const percent = Math.round(Number(value || 0) * 1000) / 10;
    return `${percent > 0 ? "+" : ""}${percent}%`;
  }

  function formatAnomalyValue(value, unit) {
    if (unit === "ratio") return formatPercent(value);
    return `${formatNumber(value)} ${unit || ""}`.trim();
  }

  function formatLift(value) {
    if (value == null || !Number.isFinite(Number(value))) return "-";
    const rounded = Math.round(Number(value) * 1000) / 10;
    return `${rounded > 0 ? "+" : ""}${rounded}%`;
  }

  function rate(numerator, denominator) {
    const base = Number(denominator || 0);
    return base > 0 ? Number(numerator || 0) / base : 0;
  }

  function dateTimeLocalValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function isoFromDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function parseJsonField(input, label, raw = input?.value) {
    try {
      const parsed = JSON.parse(raw || "{}");
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("must be an object");
      return parsed;
    } catch {
      input?.classList.add("invalid");
      throw new Error(`${label} must be valid JSON object syntax`);
    }
  }

  function parseJsonSafe(raw, fallback = {}) {
    try {
      const parsed = JSON.parse(raw || "{}");
      if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function parseJsonStrict(raw, label = "JSON") {
    try {
      return JSON.parse(raw || "null");
    } catch (error) {
      throw new Error(`${label} is not valid JSON: ${error.message}`);
    }
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(value ?? null);
  }

  function clientDiffValues(left, right, path = "$") {
    if (JSON.stringify(left) === JSON.stringify(right)) return [];
    const leftObject = left && typeof left === "object";
    const rightObject = right && typeof right === "object";
    if (!leftObject || !rightObject || Array.isArray(left) || Array.isArray(right)) {
      return [{ path, type: changeType(left, right) }];
    }
    const keys = [...new Set([...Object.keys(left || {}), ...Object.keys(right || {})])].sort();
    return keys.flatMap((key) => clientDiffValues(left?.[key], right?.[key], `${path}.${key}`));
  }

  function changeType(left, right) {
    if (left === undefined) return "added";
    if (right === undefined) return "removed";
    return "changed";
  }

  global.DEEAppUtils = {
    clientDiffValues,
    cssEscape,
    dateTimeLocalValue,
    debounce,
    escapeHtml,
    formatAnomalyValue,
    formatLift,
    formatNumber,
    formatPercent,
    formatSignedPercent,
    formatTime,
    header,
    isoFromDateTimeLocal,
    parseJsonField,
    parseJsonSafe,
    parseJsonStrict,
    rate,
    row,
    stableStringify
  };
})(window);
