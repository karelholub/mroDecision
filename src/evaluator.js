import { evaluateExpression } from "./expression.js";

export function evaluateDecision({ request, version, lookupTables, now = new Date(), clientEventCounter = () => 0 }) {
  const errors = [];
  const matchedRules = [];
  const scores = new Map();
  const definition = version.definition;
  const env = buildEnv(request, lookupTables, scores, errors, now, clientEventCounter);
  let outcome;

  try {
    outcome = definition.graph
      ? evaluateGraph(definition.graph, env, matchedRules, errors)
      : evaluateBranches(definition, env, matchedRules, errors);
  } catch (error) {
    errors.push(error.message);
    outcome = definition.fallback || { result: "deferred", outputs: {} };
  }

  return {
    decision_key: request.decision_key,
    profile_key: request.profile_key,
    evaluated_at: now.toISOString(),
    rule_version: version.version,
    result: outcome.result || "deferred",
    outputs: outcome.outputs || {},
    matched_rules: matchedRules,
    errors
  };
}

function evaluateBranches(definition, env, matchedRules, errors) {
  for (const branch of definition.branches || []) {
    try {
      if (evaluateConditionGroup(branch.when, env)) {
        matchedRules.push(branch.id || branch.label || "branch");
        return {
          result: branch.result,
          outputs: resolveOutputs(branch.outputs || {}, env)
        };
      }
    } catch (error) {
      errors.push(`${branch.id || branch.label || "branch"}: ${error.message}`);
    }
  }
  matchedRules.push("fallback");
  return definition.fallback || { result: "deferred", outputs: {} };
}

function evaluateGraph(graph, env, matchedRules, errors) {
  const nodes = new Map((graph.nodes || []).map((node) => [node.id, node]));
  let current = graph.entry;
  const visited = new Set();

  for (let step = 0; step < 220; step += 1) {
    if (!current) throw new Error("Graph has no next node");
    if (visited.has(current)) throw new Error(`Circular graph path detected at ${current}`);
    visited.add(current);
    const node = nodes.get(current);
    if (!node) throw new Error(`Graph node not found: ${current}`);
    matchedRules.push(node.id);

    if (node.type === "input") {
      applyDefaults(node.defaults || {}, env);
      current = node.next;
    } else if (node.type === "condition") {
      const passed = Boolean(evaluateExpression(node.expression || "false", env));
      current = passed ? node.true : node.false;
    } else if (node.type === "score") {
      let total = Number(env.score(node.label || node.id) || 0);
      for (const rule of node.rules || []) {
        if (evaluateExpression(rule.when || "false", env)) total += Number(rule.points || 0);
      }
      env.setScore(node.label || node.id, total);
      current = node.next;
    } else if (node.type === "lookup") {
      const value = env.lookup(node.table, evaluateExpression(node.key_expression, env), node.column);
      env.setContext(node.output_key || node.id, value);
      current = node.next;
    } else if (node.type === "frequency_cap") {
      const count = env.clientEventCount({
        event_type: node.event_type || "impression",
        decision_key: node.decision_key || env.request.decision_key,
        profile_key: env.request.profile_key,
        message_id: node.message_id || undefined,
        surface: node.surface || undefined,
        window_days: Number(node.window_days || 30)
      });
      if (node.output_key) env.setContext(node.output_key, count);
      current = count < Number(node.max || 1) ? node.next : node.capped || node.false || node.fallback;
    } else if (node.type === "sub-decision") {
      errors.push(`Sub-decision node ${node.id} is declared but external dependency execution is not enabled in this runtime`);
      current = node.fallback || node.next;
    } else if (node.type === "error" || node.type === "fallback") {
      return { result: node.result || "deferred", outputs: resolveOutputs(node.outputs || {}, env) };
    } else if (node.type === "output") {
      return { result: node.result || "deferred", outputs: resolveOutputs(node.outputs || {}, env) };
    } else {
      throw new Error(`Unsupported graph node type: ${node.type}`);
    }
  }

  throw new Error("Graph exceeded maximum traversal depth");
}

function evaluateConditionGroup(group, env) {
  if (!group) return true;
  if (Array.isArray(group.all)) return group.all.every((child) => evaluateConditionGroup(child, env));
  if (Array.isArray(group.any)) return group.any.some((child) => evaluateConditionGroup(child, env));
  if (group.not) return !evaluateConditionGroup(group.not, env);
  if (group.expression) return Boolean(evaluateExpression(group.expression, env));
  return evaluateLeafCondition(group, env);
}

function evaluateLeafCondition(condition, env) {
  const actual = readSource(condition, env);
  const expected = condition.value_source ? readSource(condition.value_source, env) : condition.value;
  switch (condition.operator) {
    case "equals":
      return actual === expected;
    case "not_equals":
      return actual !== expected;
    case "greater_than":
      return Number(actual) > Number(expected);
    case "greater_than_or_equal":
      return Number(actual) >= Number(expected);
    case "less_than":
      return Number(actual) < Number(expected);
    case "less_than_or_equal":
      return Number(actual) <= Number(expected);
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "not_in":
      return Array.isArray(expected) && !expected.includes(actual);
    case "contains":
      return Array.isArray(actual) ? actual.includes(expected) : String(actual || "").includes(String(expected));
    case "not_contains":
      return Array.isArray(actual) ? !actual.includes(expected) : !String(actual || "").includes(String(expected));
    case "is_blank":
      return actual == null || actual === "";
    case "is_not_blank":
      return actual != null && actual !== "";
    case "matches_regex":
      return new RegExp(String(expected)).test(String(actual || ""));
    case "within_last_days":
      return daysSince(actual, env.now) <= Number(expected);
    case "before_date":
      return Date.parse(actual) < Date.parse(expected);
    case "after_date":
      return Date.parse(actual) > Date.parse(expected);
    default:
      throw new Error(`Unsupported operator: ${condition.operator}`);
  }
}

function readSource(source, env) {
  if (source.source === "attribute") return env.attribute(source.key);
  if (source.source === "segment") return env.segment(source.key);
  if (source.source === "context") return env.context(source.key);
  if (source.source === "score") return env.score(source.key);
  throw new Error(`Unsupported condition source: ${source.source}`);
}

function buildEnv(request, lookupTables, scores, errors, now, clientEventCounter) {
  const attributes = request.attributes || {};
  const segments = request.segments || {};
  const context = { ...(request.context || {}) };
  const lookupById = new Map((lookupTables || []).map((table) => [table.id, table]));

  return {
    request,
    now,
    attribute: (key) => {
      const value = normalizeAttributeValue(attributes[key]);
      if (value == null) errors.push(`Missing attribute: ${key}`);
      return value;
    },
    segment: (key) => Boolean(segments[key]),
    context: (key) => context[key],
    setContext: (key, value) => {
      context[key] = value;
    },
    score: (key) => scores.get(key) || 0,
    setScore: (key, value) => {
      scores.set(key, value);
    },
    lookup: (tableId, key, column) => {
      const table = lookupById.get(tableId);
      if (!table) {
        errors.push(`Missing lookup table: ${tableId}`);
        return null;
      }
      const row = (table.rows || []).find((item) => item[table.key_column || "key"] === key);
      if (!row) return null;
      return column ? row[column] : row;
    },
    clientEventCount: (params) => {
      const since = new Date(now.getTime() - Number(params.window_days || 30) * 86400000).toISOString();
      return Number(clientEventCounter({ ...params, since }) || 0);
    }
  };
}

function normalizeAttributeValue(raw) {
  if (Array.isArray(raw)) return normalizeAttributeValue(raw[0]);
  if (raw && typeof raw === "object" && "value" in raw) return raw.value;
  return raw;
}

function resolveOutputs(outputs, env) {
  return Object.fromEntries(
    Object.entries(outputs).map(([key, value]) => [
      key,
      typeof value === "string" && value.startsWith("=") ? evaluateExpression(value.slice(1), env) : value
    ])
  );
}

function applyDefaults(defaults, env) {
  for (const [key, value] of Object.entries(defaults.context || {})) env.setContext(key, value);
}

function daysSince(value, now = new Date()) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - timestamp) / 86400000);
}
