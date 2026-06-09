const slugPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const allowedSources = new Set(["attribute", "segment", "context", "score"]);
const allowedRuleSetTypes = new Set(["decision", "inapp_message", "experiment"]);
const allowedOperators = new Set([
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "in",
  "not_in",
  "contains",
  "not_contains",
  "is_blank",
  "is_not_blank",
  "matches_regex",
  "within_last_days",
  "before_date",
  "after_date"
]);

export function validateEvaluateRequest(body) {
  if (!isPlainObject(body)) badRequest("Request body must be an object");
  requiredString(body, "decision_key");
  requiredString(body, "profile_key");
  if (!Array.isArray(body.identifiers)) badRequest("identifiers must be an array");
  if (body.identifiers.length === 0) badRequest("identifiers must include at least one identifier");
  optionalObject(body, "attributes");
  optionalObject(body, "segments");
  optionalObject(body, "context");
  if (body.rule_version != null && !Number.isInteger(Number(body.rule_version))) {
    badRequest("rule_version must be an integer when provided");
  }
}

export function validateRuleSetPayload(body, { partial = false } = {}) {
  if (!isPlainObject(body)) badRequest("Rule set payload must be an object");
  if (!partial || body.name != null) requiredString(body, "name");
  if (!partial || body.decision_key != null) {
    requiredString(body, "decision_key");
    if (!slugPattern.test(body.decision_key)) badRequest("decision_key must be a slug using lowercase letters, numbers, and underscores");
  }
  optionalObject(body, "input_schema");
  optionalObject(body, "output_schema");
  optionalObject(body, "cache_policy");
  optionalObject(body, "metadata");
  if (body.type != null && !allowedRuleSetTypes.has(body.type)) badRequest("type must be decision, inapp_message, or experiment");
  if (body.metadata?.experiment) validateExperimentMetadata(body.metadata.experiment);
  if (body.priority != null && !Number.isInteger(Number(body.priority))) badRequest("priority must be an integer");
  if (body.surface != null && typeof body.surface !== "string") badRequest("surface must be a string");
  if (body.tags != null && !Array.isArray(body.tags)) badRequest("tags must be an array");
}

export function validateClientEvaluateRequest(body) {
  if (!isPlainObject(body)) badRequest("Request body must be an object");
  requiredString(body, "decision_key");
  requiredString(body, "profile_key");
  optionalObject(body, "attributes");
  optionalObject(body, "segments");
  optionalObject(body, "context");
}

export function validateClientSurfaceRequest(body) {
  if (!isPlainObject(body)) badRequest("Request body must be an object");
  requiredString(body, "surface");
  requiredString(body, "profile_key");
  if (body.identifiers != null && !Array.isArray(body.identifiers)) badRequest("identifiers must be an array");
  optionalObject(body, "attributes");
  optionalObject(body, "segments");
  optionalObject(body, "context");
  if (body.limit != null && !Number.isInteger(Number(body.limit))) {
    badRequest("limit must be an integer when provided");
  }
}

export function validateClientSurfaceBatchRequest(body) {
  if (!isPlainObject(body)) badRequest("Request body must be an object");
  requiredString(body, "surface");
  if (!Array.isArray(body.profiles)) badRequest("profiles must be an array");
  if (body.profiles.length === 0) badRequest("profiles must include at least one profile");
  if (body.profiles.length > 500) badRequest("Batch limit is 500 profiles");
  optionalObject(body, "context");
  if (body.limit != null && !Number.isInteger(Number(body.limit))) {
    badRequest("limit must be an integer when provided");
  }
  for (const profile of body.profiles) {
    if (!isPlainObject(profile)) badRequest("Every profile must be an object");
    requiredString(profile, "profile_key");
    if (profile.identifiers != null && !Array.isArray(profile.identifiers)) badRequest("identifiers must be an array");
    optionalObject(profile, "attributes");
    optionalObject(profile, "segments");
    optionalObject(profile, "context");
    if (profile.limit != null && !Number.isInteger(Number(profile.limit))) {
      badRequest("profile limit must be an integer when provided");
    }
  }
}

export function validateClientEventRequest(body) {
  if (!isPlainObject(body)) badRequest("Request body must be an object");
  requiredString(body, "decision_key");
  requiredString(body, "profile_key");
  optionalString(body, "event_id");
  optionalString(body, "variant_key");
  optionalString(body, "message_id");
  optionalString(body, "surface");
  optionalObject(body, "context");
  optionalObject(body, "event");
  if (body.rule_version != null && !Number.isInteger(Number(body.rule_version))) {
    badRequest("rule_version must be an integer when provided");
  }
  if (body.occurred_at != null && Number.isNaN(Date.parse(body.occurred_at))) {
    badRequest("occurred_at must be an ISO date-time when provided");
  }
}

function validateExperimentMetadata(experiment) {
  if (!isPlainObject(experiment)) badRequest("metadata.experiment must be an object");
  if (experiment.status != null && !["draft", "running", "paused"].includes(experiment.status)) {
    badRequest("metadata.experiment.status must be draft, running, or paused");
  }
  if (experiment.unit != null && !["profile", "identifier"].includes(experiment.unit)) {
    badRequest("metadata.experiment.unit must be profile or identifier");
  }
  if (experiment.mode != null && !["fixed", "bandit"].includes(experiment.mode)) {
    badRequest("metadata.experiment.mode must be fixed or bandit");
  }
  if (experiment.goal != null) validateExperimentGoal(experiment.goal);
  if (experiment.schedule != null) validateExperimentSchedule(experiment.schedule);
  if (experiment.display != null) validateExperimentDisplay(experiment.display);
  if (experiment.consent != null) validateExperimentConsent(experiment.consent);
  if (experiment.targeting != null) validateExperimentTargeting(experiment.targeting);
  if (experiment.trigger != null) validateExperimentTrigger(experiment.trigger);
  if (experiment.bandit != null) validateBanditMetadata(experiment.bandit);
  if (experiment.variants == null) return;
  if (!Array.isArray(experiment.variants) || experiment.variants.length === 0) {
    badRequest("metadata.experiment.variants must be a non-empty array");
  }
  const keys = new Set();
  const total = experiment.variants.reduce((sum, variant) => {
    if (!isPlainObject(variant) || typeof variant.key !== "string" || variant.key.trim() === "") {
      badRequest("Each experiment variant must include a key");
    }
    if (keys.has(variant.key)) badRequest("Experiment variant keys must be unique");
    keys.add(variant.key);
    const weight = Number(variant.weight);
    if (!Number.isFinite(weight) || weight < 0) badRequest("Experiment variant weights must be non-negative numbers");
    return sum + weight;
  }, 0);
  if (Math.round(total * 1000) !== 100000) badRequest("Experiment variant weights must sum to 100");
}

function validateExperimentGoal(goal) {
  if (!isPlainObject(goal)) badRequest("metadata.experiment.goal must be an object");
  if (goal.event != null && typeof goal.event !== "string") badRequest("metadata.experiment.goal.event must be a string");
  if (goal.type != null && !["conversion", "revenue", "engagement"].includes(goal.type)) {
    badRequest("metadata.experiment.goal.type must be conversion, revenue, or engagement");
  }
  if (goal.attribution_window_hours != null) {
    const value = Number(goal.attribution_window_hours);
    if (!Number.isFinite(value) || value < 0) badRequest("metadata.experiment.goal.attribution_window_hours must be non-negative");
  }
  if (goal.value_field != null && typeof goal.value_field !== "string") badRequest("metadata.experiment.goal.value_field must be a string");
  if (goal.secondary_events != null && (!Array.isArray(goal.secondary_events) || goal.secondary_events.some((item) => typeof item !== "string"))) {
    badRequest("metadata.experiment.goal.secondary_events must be an array of strings");
  }
}

function validateExperimentSchedule(schedule) {
  if (!isPlainObject(schedule)) badRequest("metadata.experiment.schedule must be an object");
  for (const key of ["starts_at", "ends_at"]) {
    if (schedule[key] != null && Number.isNaN(Date.parse(schedule[key]))) {
      badRequest(`metadata.experiment.schedule.${key} must be an ISO date-time`);
    }
  }
}

function validateExperimentDisplay(display) {
  if (!isPlainObject(display)) badRequest("metadata.experiment.display must be an object");
  if (display.mode != null && !["always", "once", "once_per_session"].includes(display.mode)) {
    badRequest("metadata.experiment.display.mode must be always, once, or once_per_session");
  }
  if (display.reset_on_version_change != null && typeof display.reset_on_version_change !== "boolean") {
    badRequest("metadata.experiment.display.reset_on_version_change must be boolean");
  }
}

function validateExperimentConsent(consent) {
  if (!isPlainObject(consent)) badRequest("metadata.experiment.consent must be an object");
  if (consent.required != null && typeof consent.required !== "boolean") badRequest("metadata.experiment.consent.required must be boolean");
  if (consent.category != null && typeof consent.category !== "string") badRequest("metadata.experiment.consent.category must be a string");
  if (consent.missing_result != null && !["suppressed", "ineligible"].includes(consent.missing_result)) {
    badRequest("metadata.experiment.consent.missing_result must be suppressed or ineligible");
  }
}

function validateExperimentTargeting(targeting) {
  if (!isPlainObject(targeting)) badRequest("metadata.experiment.targeting must be an object");
  if (targeting.devices != null) {
    const allowed = new Set(["any", "desktop", "tablet", "mobile"]);
    if (!Array.isArray(targeting.devices) || targeting.devices.some((item) => !allowed.has(item))) {
      badRequest("metadata.experiment.targeting.devices must use any, desktop, tablet, or mobile");
    }
  }
  if (targeting.url_rules != null) {
    if (!Array.isArray(targeting.url_rules)) badRequest("metadata.experiment.targeting.url_rules must be an array");
    targeting.url_rules.forEach(validateExperimentUrlRule);
  }
  if (targeting.sdk_conditions != null && (!Array.isArray(targeting.sdk_conditions) || targeting.sdk_conditions.some((item) => typeof item !== "string"))) {
    badRequest("metadata.experiment.targeting.sdk_conditions must be an array of strings");
  }
}

function validateExperimentUrlRule(rule) {
  if (!isPlainObject(rule)) badRequest("Experiment URL rule must be an object");
  if (!["include", "exclude"].includes(rule.mode)) badRequest("Experiment URL rule mode must be include or exclude");
  if (!["exact", "contains", "starts_with", "regex"].includes(rule.operator)) {
    badRequest("Experiment URL rule operator must be exact, contains, starts_with, or regex");
  }
  if (typeof rule.value !== "string" || !rule.value.trim()) badRequest("Experiment URL rule value must be a non-empty string");
  if (rule.operator === "regex") {
    try {
      new RegExp(rule.value);
    } catch {
      badRequest("Experiment URL rule regex is invalid");
    }
  }
}

function validateExperimentTrigger(trigger) {
  if (!isPlainObject(trigger)) badRequest("metadata.experiment.trigger must be an object");
  if (trigger.type != null && !["page_load", "dom_ready", "data_layer_event", "custom_event", "manual"].includes(trigger.type)) {
    badRequest("metadata.experiment.trigger.type must be page_load, dom_ready, data_layer_event, custom_event, or manual");
  }
  if (trigger.event != null && typeof trigger.event !== "string") badRequest("metadata.experiment.trigger.event must be a string");
  if (trigger.filters != null && !Array.isArray(trigger.filters)) badRequest("metadata.experiment.trigger.filters must be an array");
}

function validateBanditMetadata(bandit) {
  if (!isPlainObject(bandit)) badRequest("metadata.experiment.bandit must be an object");
  if (bandit.exploration_rate != null) {
    const value = Number(bandit.exploration_rate);
    if (!Number.isFinite(value) || value < 0 || value > 100) badRequest("metadata.experiment.bandit.exploration_rate must be between 0 and 100");
  }
  if (bandit.min_exposures_per_variant != null) {
    const value = Number(bandit.min_exposures_per_variant);
    if (!Number.isInteger(value) || value < 0) badRequest("metadata.experiment.bandit.min_exposures_per_variant must be a non-negative integer");
  }
  if (bandit.window_days != null) {
    const value = Number(bandit.window_days);
    if (!Number.isInteger(value) || value < 1) badRequest("metadata.experiment.bandit.window_days must be a positive integer");
  }
  if (bandit.freeze_variant != null && typeof bandit.freeze_variant !== "string") {
    badRequest("metadata.experiment.bandit.freeze_variant must be a string");
  }
}

export function validateSchemaImport(body) {
  if (!isPlainObject(body)) badRequest("Schema import payload must be an object");
  for (const kind of ["attributes", "segments", "context"]) {
    if (body[kind] != null && !Array.isArray(body[kind])) badRequest(`${kind} must be an array`);
  }
  for (const item of [...(body.attributes || []), ...(body.segments || []), ...(body.context || [])]) {
    if (!isPlainObject(item) || typeof item.name !== "string" || item.name.trim() === "") {
      badRequest("Every schema item must include a name");
    }
  }
}

export function validateRuleDefinition(definition, inputSchema = {}) {
  if (!isPlainObject(definition)) validationError("Rule definition must be an object");
  if (definition.graph) validateGraph(definition.graph);
  else validateBranchesDefinition(definition);
  validateReferences(definition, inputSchema);
}

export function validateBundle(bundle) {
  if (!isPlainObject(bundle)) badRequest("Import bundle must be an object");
  if (bundle.kind !== "meiro-dee-config-bundle") badRequest("Unsupported bundle kind");
  if (!Array.isArray(bundle.rule_sets)) badRequest("Bundle rule_sets must be an array");
  if (bundle.lookup_tables != null && !Array.isArray(bundle.lookup_tables)) badRequest("Bundle lookup_tables must be an array");
  if (bundle.messages != null && !Array.isArray(bundle.messages)) badRequest("Bundle messages must be an array");
  if (bundle.condition_blocks != null && !Array.isArray(bundle.condition_blocks)) {
    badRequest("Bundle condition_blocks must be an array");
  }
  if (bundle.settings != null && !isPlainObject(bundle.settings)) badRequest("Bundle settings must be an object");

  for (const ruleSet of bundle.rule_sets) {
    validateRuleSetPayload(ruleSet);
    if (ruleSet.draft) validateRuleDefinition(ruleSet.draft);
    if (!Array.isArray(ruleSet.versions)) badRequest(`Rule set ${ruleSet.decision_key} versions must be an array`);
    for (const version of ruleSet.versions) {
      if (!Number.isInteger(Number(version.version))) badRequest(`Rule set ${ruleSet.decision_key} has an invalid version`);
      validateRuleDefinition(version.definition);
    }
  }
  for (const block of bundle.condition_blocks || []) {
    if (!isPlainObject(block)) badRequest("Every condition block must be an object");
    requiredString(block, "id", "Condition block id is required");
    requiredString(block, "name", `Condition block ${block.id} name is required`);
    if (!Array.isArray(block.conditions) || block.conditions.length === 0) {
      badRequest(`Condition block ${block.id} conditions must be a non-empty array`);
    }
    block.conditions.forEach((condition) => validateConditionGroup(condition, `Condition block ${block.id}`));
  }
}

function validateBranchesDefinition(definition) {
  if (!Array.isArray(definition.branches)) validationError("Rule definition must include branches or graph");
  if (definition.branches.length > 100) validationError("Basic rule definitions are limited to 100 branches");
  for (const branch of definition.branches) {
    if (!isPlainObject(branch)) validationError("Each branch must be an object");
    requiredString(branch, "id", "Branch id is required");
    requiredString(branch, "result", `Branch ${branch.id} result is required`);
    validateConditionGroup(branch.when, `Branch ${branch.id}`);
    if (branch.outputs != null && !isPlainObject(branch.outputs)) validationError(`Branch ${branch.id} outputs must be an object`);
  }
  if (definition.fallback != null) {
    if (!isPlainObject(definition.fallback)) validationError("Fallback must be an object");
    requiredString(definition.fallback, "result", "Fallback result is required");
    if (definition.fallback.outputs != null && !isPlainObject(definition.fallback.outputs)) {
      validationError("Fallback outputs must be an object");
    }
  }
}

function validateReferences(definition, inputSchema) {
  if (!inputSchema || Object.keys(inputSchema).length === 0 || definition.graph) return;
  const declared = {
    attribute: new Set(Object.keys(inputSchema.attributes || {})),
    segment: new Set(Object.keys(inputSchema.segments || {})),
    context: new Set(Object.keys(inputSchema.context || {})),
    score: new Set(Object.keys(inputSchema.scores || {}))
  };
  const missing = [];
  for (const branch of definition.branches || []) {
    collectConditionReferences(branch.when, declared, missing);
  }
  if (missing.length) {
    validationError(`Rule references undeclared inputs: ${[...new Set(missing)].join(", ")}`);
  }
}

function collectConditionReferences(group, declared, missing) {
  if (!group || !isPlainObject(group)) return;
  for (const key of ["all", "any"]) {
    if (Array.isArray(group[key])) {
      group[key].forEach((child) => collectConditionReferences(child, declared, missing));
      return;
    }
  }
  if (group.not) {
    collectConditionReferences(group.not, declared, missing);
    return;
  }
  if (group.expression) return;
  if (declared[group.source]?.size && !declared[group.source].has(group.key)) {
    missing.push(`${group.source}.${group.key}`);
  }
  if (group.value_source && declared[group.value_source.source]?.size && !declared[group.value_source.source].has(group.value_source.key)) {
    missing.push(`${group.value_source.source}.${group.value_source.key}`);
  }
}

function validateConditionGroup(group, label, depth = 1) {
  if (group == null) return;
  if (!isPlainObject(group)) validationError(`${label} condition must be an object`);
  if (depth > 3) validationError(`${label} condition nesting exceeds 3 levels`);
  if (Array.isArray(group.all)) {
    if (group.all.length === 0) validationError(`${label} all group cannot be empty`);
    group.all.forEach((child) => validateConditionGroup(child, label, depth + 1));
    return;
  }
  if (Array.isArray(group.any)) {
    if (group.any.length === 0) validationError(`${label} any group cannot be empty`);
    group.any.forEach((child) => validateConditionGroup(child, label, depth + 1));
    return;
  }
  if (group.not) {
    validateConditionGroup(group.not, label, depth + 1);
    return;
  }
  if (group.expression) return;
  if (!allowedSources.has(group.source)) validationError(`${label} has unsupported source: ${group.source}`);
  if (!group.key) validationError(`${label} condition key is required`);
  if (!allowedOperators.has(group.operator)) validationError(`${label} has unsupported operator: ${group.operator}`);
  if (group.value_source != null) {
    if (!isPlainObject(group.value_source)) validationError(`${label} value source must be an object`);
    if (!allowedSources.has(group.value_source.source)) validationError(`${label} has unsupported value source: ${group.value_source.source}`);
    if (!group.value_source.key) validationError(`${label} value source key is required`);
  }
}

function validateGraph(graph) {
  if (!isPlainObject(graph)) validationError("Graph must be an object");
  requiredString(graph, "entry", "Graph must declare an entry node");
  if (!Array.isArray(graph.nodes)) validationError("Graph nodes must be an array");
  if (graph.nodes.length > 200) validationError("Rule graph exceeds 200 node limit");
  const ids = new Set();
  for (const node of graph.nodes) {
    requiredString(node, "id", "Every graph node needs an id");
    if (ids.has(node.id)) validationError(`Duplicate graph node id: ${node.id}`);
    ids.add(node.id);
  }
  if (!ids.has(graph.entry)) validationError(`Graph entry node does not exist: ${graph.entry}`);
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const node of graph.nodes) {
    validateGraphNodeRoutes(node, ids);
  }
  const visited = new Set();
  const visiting = new Set();
  const reachesTerminal = visitGraphNode(graph.entry, nodes, visited, visiting, new Map());
  if (!reachesTerminal) validationError("Graph must have a reachable output, fallback, or error node");
  const unreachable = graph.nodes.filter((node) => !visited.has(node.id));
  if (unreachable.length) validationError(`Graph has unreachable nodes: ${unreachable.map((node) => node.id).join(", ")}`);
}

function validateGraphNodeRoutes(node, ids) {
  const type = node.type || "input";
  const terminal = new Set(["output", "fallback", "error"]);
  if (terminal.has(type)) return;
  if (type === "condition") {
    requiredString(node, "true", `Graph condition ${node.id} needs a true route`);
    requiredString(node, "false", `Graph condition ${node.id} needs a false route`);
  } else if (type === "frequency_cap") {
    requiredString(node, "next", `Graph frequency cap ${node.id} needs a next route`);
  } else {
    requiredString(node, "next", `Graph node ${node.id} needs a next route`);
  }
  for (const target of graphNodeTargets(node)) {
    if (!ids.has(target)) validationError(`Graph node ${node.id} routes to missing node: ${target}`);
  }
}

function visitGraphNode(id, nodes, visited, visiting, memo) {
  if (visiting.has(id)) validationError(`Circular graph path detected at ${id}`);
  if (memo.has(id)) return memo.get(id);
  const node = nodes.get(id);
  if (!node) return false;
  visiting.add(id);
  visited.add(id);
  const terminal = ["output", "fallback", "error"].includes(node.type);
  const targets = graphNodeTargets(node);
  const childResults = targets.map((target) => visitGraphNode(target, nodes, visited, visiting, memo));
  const reachesTerminal = terminal || childResults.some(Boolean);
  visiting.delete(id);
  memo.set(id, reachesTerminal);
  return reachesTerminal;
}

function graphNodeTargets(node) {
  return ["next", "true", "false", "capped", "fallback"]
    .map((key) => node[key])
    .filter((value) => typeof value === "string" && value.trim() !== "");
}

function requiredString(object, key, message = `${key} is required`) {
  if (typeof object[key] !== "string" || object[key].trim() === "") {
    if (message.startsWith("Branch") || message.startsWith("Fallback") || message.startsWith("Graph") || message.startsWith("Every")) {
      validationError(message);
    }
    badRequest(message);
  }
}

function optionalString(object, key) {
  if (object[key] != null && typeof object[key] !== "string") badRequest(`${key} must be a string`);
}

function optionalObject(object, key) {
  if (object[key] != null && !isPlainObject(object[key])) badRequest(`${key} must be an object`);
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "bad_request";
  throw error;
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "validation_error";
  throw error;
}
