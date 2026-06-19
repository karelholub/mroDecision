const {
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
} = window.DEEAppUtils;

const tokenInput = document.querySelector("#token");
const evalInput = document.querySelector("#eval-input");
const evalOutput = document.querySelector("#eval-output");
const evalTrace = document.querySelector("#eval-trace");
const evalSummary = document.querySelector("#eval-summary");
const evalOutputSummary = document.querySelector("#eval-output-summary");
const evalRuntimeSummary = document.querySelector("#eval-runtime-summary");
const evalEndpointLabel = document.querySelector("#eval-endpoint-label");
const evalAuditLabel = document.querySelector("#eval-audit-label");
const evalRequestKind = document.querySelector("#eval-request-kind");
const evalSurfaceInput = document.querySelector("#eval-surface");
const evalLimitInput = document.querySelector("#eval-limit");
const evalCompareButton = document.querySelector("#compare-eval");
const evalPayloadPanel = document.querySelector("#eval-payload-panel");
const evalPayloadToggle = document.querySelector("#toggle-eval-payload");
const evalValidation = document.querySelector("#eval-validation");
const evalSavedProfile = document.querySelector("#eval-saved-profile");
const editorOutput = document.querySelector("#rule-editor-output");
const branchEditor = document.querySelector("#branch-editor");
const ruleGraph = document.querySelector("#rule-graph");
const graphEditor = document.querySelector("#graph-editor");
const graphNodeEditor = document.querySelector("#graph-node-editor");
const graphMinimap = document.querySelector("#graph-minimap");
const graphSnapEnabledInput = document.querySelector("#graph-snap-enabled");
const graphSnapSizeInput = document.querySelector("#graph-snap-size");
const graphNodePicker = document.querySelector("#graph-node-picker");
const graphNodePickerList = document.querySelector("#graph-node-picker-list");
const graphNodePickerSearch = document.querySelector("#graph-node-picker-search");
const lookupOutput = document.querySelector("#lookup-output");
const lookupDetailPanel = document.querySelector("#lookup-editor");
const messageOutput = document.querySelector("#message-output");
const messagePreview = document.querySelector("#message-preview");
const messageDetailPanel = document.querySelector("#message-editor");
const messageInspectorSummary = document.querySelector("#message-inspector-summary");
const messageReadinessPanel = document.querySelector("#message-readiness-panel");
const messageRuntimeContract = document.querySelector("#message-runtime-contract");
const messagePerformanceSummary = document.querySelector("#message-performance-summary");
const messageRuleLinks = document.querySelector("#message-rule-links");
const messagePreviewHealth = document.querySelector("#message-preview-health");
const messageVersionList = document.querySelector("#message-version-list");
const messageVersionPreview = document.querySelector("#message-version-preview");
const messageTokenSuggestions = document.querySelector("#message-token-suggestions");
const messageTokenSample = document.querySelector("#message-token-sample");
const messageRenderTokens = document.querySelector("#message-render-tokens");
const messageAudienceComparison = document.querySelector("#message-audience-comparison");
const messageExperimentIdeas = document.querySelector("#message-experiment-ideas");
const messageSurveyPanel = document.querySelector("#message-survey-panel");
const messageSurveyBuilder = document.querySelector("#message-survey-builder");
const lookupInspectorSummary = document.querySelector("#lookup-inspector-summary");
const lookupHelpTable = document.querySelector("#lookup-help-table");
const lookupHelpKey = document.querySelector("#lookup-help-key");
const lookupHelpExpression = document.querySelector("#lookup-help-expression");
const lookupValidationSummary = document.querySelector("#lookup-validation-summary");
const lookupValidationRules = document.querySelector("#lookup-validation-rules");
const referenceGrid = document.querySelector("#reference-grid");
const auditDetail = document.querySelector("#audit-detail");
const auditDetailSummary = document.querySelector("#audit-detail-summary");
const auditDetailExtra = document.querySelector("#audit-detail-extra");
const auditCount = document.querySelector("#audit-count");
const auditRange = document.querySelector("#audit-range");
const auditInsights = document.querySelector("#audit-insights");
const auditPresetChips = document.querySelector("#audit-preset-chips");
const auditDetailMeta = document.querySelector("#audit-detail-meta");
const versionList = document.querySelector("#version-list");
const lookupVersionList = document.querySelector("#lookup-version-list");
const settingsOutput = document.querySelector("#settings-output");
const configExportOutput = document.querySelector("#config-export-output");
const configExportSummary = document.querySelector("#config-export-summary");
const configImportInput = document.querySelector("#config-import-input");
const configImportOutput = document.querySelector("#config-import-output");
const configImportSummary = document.querySelector("#config-import-summary");
const tokenOutput = document.querySelector("#token-output");
const schemaOutput = document.querySelector("#schema-output");
const settingsHealthSummary = document.querySelector("#settings-health-summary");
const assistantProviderStatus = document.querySelector("#assistant-provider-status");
const assistantProviderConfigHistory = document.querySelector("#assistant-provider-config-history");
const assistantProviderPlanHistory = document.querySelector("#assistant-provider-plan-history");
const assistantProviderTestOutput = document.querySelector("#assistant-provider-test-output");
const integrationTemplate = document.querySelector("#integration-template");
const integrationResponse = document.querySelector("#integration-response");
const meiroTestOutput = document.querySelector("#meiro-test-output");
const meiroDeliveryStatus = document.querySelector("#meiro-delivery-status");
const meiroDeliverySummary = document.querySelector("#meiro-delivery-summary");
const meiroDeliveryDetail = document.querySelector("#meiro-delivery-detail");
const schemaImportDiagnostics = document.querySelector("#schema-import-diagnostics");
const conditionBlockList = document.querySelector("#condition-block-list");
const conditionBlockOutput = document.querySelector("#condition-block-output");
const metricCards = document.querySelector("#metric-cards");
const ruleDetailPanel = document.querySelector("#metrics-rule-detail");
const clientEventsPanel = document.querySelector("#metrics-client-events");
const clientTrafficPanel = document.querySelector("#metrics-client-traffic");
const precomputePanel = document.querySelector("#metrics-precompute");
const requestTrendPanel = document.querySelector("#metrics-request-trend");
const overviewAlerts = document.querySelector("#overview-alerts");
const overviewAnomalyHistory = document.querySelector("#overview-anomaly-history");
const overviewServiceFooter = document.querySelector("#overview-service-footer");
const overviewChangeLog = document.querySelector("#overview-change-log");
const overviewCampaignRollups = document.querySelector("#overview-campaign-rollups");
const overviewCampaignDetail = document.querySelector("#overview-campaign-detail");
const overviewLiveAssets = document.querySelector("#overview-live-assets");
const overviewRuleDetailPanel = document.querySelector("#overview-rule-detail-panel");
const experimentKpis = document.querySelector("#experiment-kpis");
const experimentList = document.querySelector("#experiment-list");
const experimentDetail = document.querySelector("#experiment-detail");
const experimentFilterSearch = document.querySelector("#experiment-filter-search");
const experimentFilterStatus = document.querySelector("#experiment-filter-status");
const experimentSort = document.querySelector("#experiment-sort");
const campaignFilterSearch = document.querySelector("#campaign-filter-search");
const campaignSort = document.querySelector("#campaign-sort");
const campaignMasterList = document.querySelector("#campaign-master-list");
const campaignMasterDetail = document.querySelector("#campaign-master-detail");
const clearCampaignSelection = document.querySelector("#clear-campaign-selection");
const auditFilterSummary = document.querySelector("#audit-filter-summary");
const stackList = document.querySelector("#stack-list");
const stackSteps = document.querySelector("#stack-steps");
const stackOutput = document.querySelector("#stack-output");
const stackReadiness = document.querySelector("#stack-readiness");
const stackTestPayload = document.querySelector("#stack-test-payload");
const ruleInspectorSummary = document.querySelector("#rule-inspector-summary");
const inspectorKey = document.querySelector("#inspector-key");
const inspectorSurface = document.querySelector("#inspector-surface");
const inspectorCache = document.querySelector("#inspector-cache");
const inspectorFallback = document.querySelector("#inspector-fallback");
const inspectorBranches = document.querySelector("#inspector-branches");
const inspectorNodes = document.querySelector("#inspector-nodes");
const inspectorMode = document.querySelector("#inspector-mode");
const ruleGovernanceTimeline = document.querySelector("#rule-governance-timeline");
const experimentPanel = document.querySelector("#experiment-panel");
const experimentSummary = document.querySelector("#experiment-summary");
const ruleDetailModal = document.querySelector("#rule-detail-modal");
const ruleBuilderPanel = document.querySelector("#rule-builder-panel");
const publishConfirmModal = document.querySelector("#publish-confirm-modal");
const publishConfirmSummary = document.querySelector("#publish-confirm-summary");
const publishConfirmDiff = document.querySelector("#publish-confirm-diff");
const publishConfirmValidation = document.querySelector("#publish-confirm-validation");
const logicSummaryTitle = document.querySelector("#logic-summary-title");
const logicSummaryMeta = document.querySelector("#logic-summary-meta");
const logicModalSubtitle = document.querySelector("#logic-modal-subtitle");
let selectedRuleKey = null;
let selectedLookupId = null;
let selectedMessageId = null;
let selectedPublishedDefinition = null;
let selectedPublishedMetadata = null;
let selectedRuleMetadata = {};
let builderBranches = [];
let graphBuilder = { entry: "input", nodes: [] };
let selectedGraphNodeId = "";
let graphConnectionDraft = null;
let cachedRuleSets = [];
let cachedRuleConflicts = { conflicts: [], by_rule: {} };
let cachedLookupTables = [];
let cachedMessages = [];
let cachedMessageAssets = [];
let cachedExperiments = [];
let cachedExperimentSummary = {};
let cachedCampaigns = [];
let cachedDecisionStacks = [];
let cachedMeiroDeliveries = [];
let cachedSettings = {};
let cachedSchema = [];
let cachedEvaluationProfiles = [];
let cachedConditionBlocks = [];
let cachedConfigBundle = null;
let cachedAssistantPlan = null;
let cachedAssistantRollback = [];
let assistantChatHistory = [];
let selectedExperimentKey = null;
let selectedCampaignName = "";
let selectedCampaignGraphKey = "";
let selectedStackId = null;
let activeExperimentTab = "design";
let selectedLookupMetadata = {};
let conditionBlocksLoaded = false;
let selectedConditionBlockId = null;
let selectedMessageTokenField = "#message-preview-body";
let ruleSort = { key: "updated_at", direction: "desc" };
let graphSnapEnabled = true;
let graphSnapSize = 24;
const inventoryPaging = {
  campaigns: { page: 1, pageSize: 5 },
  rules: { page: 1, pageSize: 12 },
  messages: { page: 1, pageSize: 10 }
};
const savedProfileStorageKey = "meiro-dee-evaluate-profiles";
const defaultConditionBlockTemplates = [
  {
    id: "high_intent",
    name: "High intent",
    conditions: [
      { source: "attribute", key: "lead_score", operator: "greater_than_or_equal", value: "70" },
      { source: "attribute", key: "web_engagement_score", operator: "greater_than_or_equal", value: "60" }
    ]
  },
  {
    id: "credit_safe",
    name: "Credit safe",
    conditions: [
      { source: "attribute", key: "outstanding_balance_tier", operator: "not_in", value: "high, critical" },
      { source: "attribute", key: "late_payments_count_12m", operator: "less_than_or_equal", value: "1" }
    ]
  },
  {
    id: "retention_risk",
    name: "Retention risk",
    conditions: [
      { source: "attribute", key: "churn_risk_score", operator: "greater_than_or_equal", value: "65" }
    ]
  },
  {
    id: "surface_match",
    name: "Surface matches rule",
    conditions: [
      { source: "context", key: "surface", operator: "equals", value: "" }
    ]
  },
  {
    id: "known_profile",
    name: "Known profile",
    conditions: [
      { source: "attribute", key: "customer_lifetime_value", operator: "is_not_blank", value: "" }
    ]
  }
];

document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.body.dataset.currentView = document.querySelector("nav button.active")?.dataset.view || "overview";

function switchView(viewName, options = {}) {
  const button = document.querySelector(`nav button[data-view="${cssEscape(viewName)}"]`);
  const view = document.querySelector(`#${cssEscape(viewName)}`);
  if (!button || !view) return;
  document.querySelectorAll("nav button, .view").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  document.body.dataset.currentView = viewName;
  view.classList.add("active");
  if (options.updateHash !== false && window.location.hash !== `#${viewName}`) {
    window.history.replaceState(null, "", `#${viewName}`);
  }
  if (viewName === "overview") loadMetrics();
  if (viewName === "experiments") loadExperiments();
  if (viewName === "stacks") loadDecisionStacks();
  if (viewName === "audit") loadAudit();
}

window.addEventListener("hashchange", () => {
  const viewName = window.location.hash.replace(/^#/, "");
  if (viewName) switchView(viewName, { updateHash: false });
});

switchView(window.location.hash.replace(/^#/, "") || document.body.dataset.currentView || "overview", { updateHash: false });

document.querySelectorAll("[data-settings-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-settings-tab], [data-settings-panel]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`[data-settings-panel="${button.dataset.settingsTab}"]`)?.classList.add("active");
  });
});

document.querySelectorAll("[data-rule-drawer-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-rule-drawer-tab], [data-rule-drawer-panel]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`[data-rule-drawer-panel="${button.dataset.ruleDrawerTab}"]`)?.classList.add("active");
  });
});

document.querySelectorAll("[data-message-workspace-tab]").forEach((button) => {
  button.addEventListener("click", () => activateMessageWorkspaceTab(button.dataset.messageWorkspaceTab));
});

document.querySelectorAll("[data-message-content-tab]").forEach((button) => {
  button.addEventListener("click", () => activateMessageContentTab(button.dataset.messageContentTab));
});

document.querySelectorAll("[data-message-advanced-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    setMessageAdvancedOpen(
      button.dataset.messageAdvancedTarget || "message-advanced-panel",
      button.getAttribute("aria-expanded") !== "true"
    );
  });
});

document.querySelectorAll("[data-message-meta-tab]").forEach((button) => {
  button.addEventListener("click", () => activateMessageMetaTab(button.dataset.messageMetaTab));
});

document.querySelectorAll("[data-message-meta-action='show-output']").forEach((button) => {
  button.addEventListener("click", () => {
    activateMessageWorkspaceTab("metadata");
    activateMessageMetaTab("output");
  });
});

document.querySelector("#format-message-metadata-json")?.addEventListener("click", () => {
  const textarea = document.querySelector("#message-metadata");
  if (!textarea) return;
  if (document.querySelector("#message-metadata-advanced-panel")?.hidden) {
    setMessageAdvancedOpen("message-metadata-advanced-panel", true);
  }
  try {
    textarea.value = JSON.stringify(JSON.parse(textarea.value || "{}"), null, 2);
    messageOutput.textContent = "Metadata JSON formatted";
  } catch (error) {
    messageOutput.textContent = error.message;
  }
});

document.querySelectorAll("[data-lookup-drawer-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-lookup-drawer-tab], [data-lookup-drawer-panel]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`[data-lookup-drawer-panel="${button.dataset.lookupDrawerTab}"]`)?.classList.add("active");
  });
});

document.querySelector("#refresh-metrics").addEventListener("click", loadMetrics);
document.querySelector("#overview-window")?.addEventListener("change", loadMetrics);
document.querySelector("#refresh-experiments")?.addEventListener("click", loadExperiments);
document.querySelector("#experiment-filter-campaign")?.addEventListener("input", () => {
  selectedCampaignName = "";
  selectedExperimentKey = null;
  renderExperiments();
});
experimentFilterSearch?.addEventListener("input", () => renderExperiments());
experimentFilterStatus?.addEventListener("change", () => renderExperiments());
experimentSort?.addEventListener("change", () => renderExperiments());
campaignFilterSearch?.addEventListener("input", () => renderExperiments({ resetCampaignPage: true }));
campaignSort?.addEventListener("change", () => renderExperiments({ resetCampaignPage: true }));
clearCampaignSelection?.addEventListener("click", () => {
  selectedCampaignName = "";
  const campaignInput = document.querySelector("#experiment-filter-campaign");
  if (campaignInput) campaignInput.value = "";
  if (campaignFilterSearch) campaignFilterSearch.value = "";
  renderExperiments({ resetCampaignPage: true });
});
document.querySelector("#quick-create-experiment")?.addEventListener("click", quickCreateExperiment);
document.querySelector("#export-experiments-csv")?.addEventListener("click", exportExperimentsCsv);
document.querySelector("#assistant-fab")?.addEventListener("click", openAssistantPanel);
document.querySelector("#assistant-close")?.addEventListener("click", closeAssistantPanel);
document.querySelector("#assistant-plan")?.addEventListener("click", planAssistantRequest);
document.querySelector("#assistant-apply")?.addEventListener("click", applyAssistantPlan);
document.querySelector("#assistant-handoff")?.addEventListener("click", handleAssistantHandoffAction);
document.querySelector("#assistant-handoff")?.addEventListener("change", handleAssistantApprovalChange);
document.querySelector("#assistant-prompt")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    planAssistantRequest();
  }
});
document.querySelectorAll("[data-assistant-suggestion]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#assistant-prompt").value = button.dataset.assistantSuggestion || "";
    openAssistantPanel();
  });
});
document.querySelector("#refresh-rules").addEventListener("click", loadRules);
document.querySelector("#refresh-stacks")?.addEventListener("click", loadDecisionStacks);
document.querySelector("#new-stack")?.addEventListener("click", createNewStackDraft);
document.querySelector("#add-stack-step")?.addEventListener("click", () => addStackStep());
document.querySelector("#save-stack")?.addEventListener("click", saveDecisionStack);
document.querySelector("#archive-stack")?.addEventListener("click", archiveDecisionStack);
document.querySelector("#run-stack-test")?.addEventListener("click", runDecisionStackTest);
document.querySelector("#stacks")?.addEventListener("input", renderStackReadiness);
document.querySelector("#stacks")?.addEventListener("change", renderStackReadiness);
document.querySelector("#rule-filter-search").addEventListener("input", () => renderRuleList({ resetPage: true }));
document.querySelector("#rule-filter-status").addEventListener("change", () => renderRuleList({ resetPage: true }));
document.querySelector("#rule-filter-type").addEventListener("change", () => renderRuleList({ resetPage: true }));
document.querySelector("#rule-filter-tag").addEventListener("input", () => renderRuleList({ resetPage: true }));
document.querySelector("#rule-filter-campaign")?.addEventListener("input", () => renderRuleList({ resetPage: true }));
document.querySelector("#refresh-audit").addEventListener("click", loadAudit);
document.querySelector("#apply-audit-filters")?.addEventListener("click", loadAudit);
document.querySelector("#clear-audit-filters").addEventListener("click", clearAuditFilters);
document.querySelector("#audit-mode").addEventListener("change", () => {
  renderAuditModeFields();
  loadAudit();
});
const scheduleAuditReload = debounce(() => loadAudit(), 220);
[
  "#audit-decision-key",
  "#audit-campaign",
  "#audit-profile-key",
  "#audit-result",
  "#audit-event-type",
  "#audit-event-object",
  "#audit-surface",
  "#audit-matched-rule",
  "#audit-search"
].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("input", () => {
    renderAuditFilterSummary();
    scheduleAuditReload();
  });
});
["#audit-from", "#audit-to", "#audit-limit"].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("change", () => {
    renderAuditFilterSummary();
    scheduleAuditReload();
  });
});
document.querySelectorAll("[data-audit-range]").forEach((button) => {
  button.addEventListener("click", () => applyAuditRange(Number(button.dataset.auditRange || 7)));
});
document.querySelector("#refresh-lookups").addEventListener("click", loadLookups);
document.querySelector("#lookup-filter-search")?.addEventListener("input", renderLookupList);
document.querySelector("#lookup-filter-column")?.addEventListener("input", renderLookupList);
document.querySelector("#lookup-filter-rows")?.addEventListener("change", renderLookupList);
document.querySelector("#refresh-messages").addEventListener("click", loadMessages);
document.querySelector("#message-filter-search")?.addEventListener("input", () => renderMessageList({ resetPage: true }));
document.querySelector("#message-filter-status")?.addEventListener("change", () => renderMessageList({ resetPage: true }));
document.querySelector("#message-filter-template")?.addEventListener("change", () => renderMessageList({ resetPage: true }));
document.querySelector("#message-filter-application")?.addEventListener("input", () => renderMessageList({ resetPage: true }));
document.querySelector("#message-filter-surface")?.addEventListener("input", () => renderMessageList({ resetPage: true }));
document.querySelector("#message-filter-campaign")?.addEventListener("input", () => renderMessageList({ resetPage: true }));
document.querySelector("#message-list")?.addEventListener("click", handleMessageListClick);
document.querySelector("#export-lookup-csv").addEventListener("click", exportLookupCsv);
document.querySelector("#refresh-settings").addEventListener("click", loadSettings);
document.querySelector("#test-meiro-profile").addEventListener("click", () => testMeiroConnection("profile"));
document.querySelector("#test-meiro-collector").addEventListener("click", () => testMeiroConnection("collector"));
document.querySelector("#test-meiro-feedback").addEventListener("click", () => testMeiroConnection("feedback"));
document.querySelector("#test-assistant-provider")?.addEventListener("click", testAssistantProviderConnection);
document.querySelector("#refresh-meiro-deliveries").addEventListener("click", loadMeiroDeliveries);
["#meiro-delivery-target", "#meiro-delivery-ok", "#meiro-delivery-limit"].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("change", loadMeiroDeliveries);
});
document.querySelector("#meiro-delivery-search")?.addEventListener("input", debounce(loadMeiroDeliveries, 250));
document.querySelector("#refresh-integration").addEventListener("click", loadIntegration);
document.querySelector("#export-audit-csv").addEventListener("click", exportAuditCsv);
document.querySelector("#import-schema").addEventListener("click", importSchema);
document.querySelector("#refresh-schema").addEventListener("click", loadSchema);
document.querySelector("#sync-schema").addEventListener("click", syncSchemaFromMeiro);
document.querySelector("#sync-meiro-metadata").addEventListener("click", syncMeiroMetadata);
document.querySelector("#new-condition-block").addEventListener("click", newConditionBlock);
document.querySelector("#save-condition-block").addEventListener("click", saveConditionBlock);
document.querySelector("#delete-condition-block").addEventListener("click", deleteConditionBlock);
document.querySelector("#run-eval").addEventListener("click", runEvaluate);
document.querySelector("#run-eval-secondary").addEventListener("click", runEvaluate);
document.querySelector("#load-preset").addEventListener("click", loadEvaluatePreset);
document.querySelector("#load-preset-secondary").addEventListener("click", loadEvaluatePreset);
evalPayloadToggle?.addEventListener("click", toggleEvalPayload);
document.querySelector("#save-eval-profile").addEventListener("click", saveEvaluateProfile);
document.querySelector("#delete-eval-profile").addEventListener("click", deleteEvaluateProfile);
document.querySelector("#compare-eval").addEventListener("click", compareEvaluateVersions);
document.querySelector("#add-eval-attribute")?.addEventListener("click", () => addEvaluateBuilderRow("attribute"));
document.querySelector("#add-eval-context")?.addEventListener("click", () => addEvaluateBuilderRow("context"));
document.querySelector("#add-eval-segment")?.addEventListener("click", () => addEvaluateBuilderRow("segment"));
document.querySelector("#sync-eval-builder")?.addEventListener("click", syncEvaluatePayloadFromBuilder);
document.querySelector("#reload-eval-builder")?.addEventListener("click", () => renderEvaluateProfileBuilder(readEvaluateInputSafe()));
document.querySelector("#eval-saved-profile").addEventListener("change", loadSavedEvaluateProfile);
evalRequestKind?.addEventListener("change", () => {
  updateEvaluateRequestModeUi();
  syncEvaluatePayloadFromControls();
  renderEvaluateModeLabels();
  renderEvaluateValidation();
});
document.querySelector("#eval-mode").addEventListener("change", () => {
  renderEvaluateModeLabels();
  renderEvaluateValidation();
});
document.querySelector("#eval-rule-key").addEventListener("change", loadEvaluatePresetForSelectedRule);
document.querySelector("#eval-profile-key").addEventListener("input", () => {
  const body = readEvaluateInput();
  body.profile_key = document.querySelector("#eval-profile-key").value.trim() || body.profile_key;
  evalInput.value = JSON.stringify(body, null, 2);
  renderEvaluateValidation();
});
evalSurfaceInput?.addEventListener("input", () => {
  syncEvaluatePayloadFromControls();
  renderEvaluateValidation();
});
evalLimitInput?.addEventListener("input", () => {
  syncEvaluatePayloadFromControls();
  renderEvaluateValidation();
});
evalInput.addEventListener("input", () => renderEvaluateValidation());
document.querySelector("#new-rule").addEventListener("click", () => newRule({ type: document.querySelector("#new-rule-type")?.value || "decision" }));
document.querySelector("#new-lookup").addEventListener("click", newLookup);
document.querySelector("#new-message").addEventListener("click", newMessage);
document.querySelector("#duplicate-message").addEventListener("click", duplicateSelectedMessage);
document.querySelector("#export-config")?.addEventListener("click", exportConfig);
document.querySelector("#download-config")?.addEventListener("click", downloadConfig);
document.querySelector("#preview-config-import")?.addEventListener("click", previewConfigImport);
document.querySelector("#import-config")?.addEventListener("click", importConfig);
document.querySelector("#sync-json").addEventListener("click", syncJsonFromBuilder);
document.querySelector("#sync-json-modal").addEventListener("click", syncJsonFromBuilder);
document.querySelector("#open-rule-builder").addEventListener("click", openRuleBuilder);
document.querySelector("#close-rule-detail").addEventListener("click", closeRuleDetail);
document.querySelector("#close-rule-builder").addEventListener("click", closeRuleBuilder);
document.querySelector("#done-rule-builder").addEventListener("click", () => {
  syncJsonFromBuilder();
  closeRuleBuilder();
});
document.querySelector("#builder-mode").addEventListener("change", switchBuilderMode);
document.querySelector("#add-branch").addEventListener("click", () => {
  builderBranches.push(newBranch(builderBranches.length + 1));
  renderBranchEditor();
  syncJsonFromBuilder();
});
document.querySelector("#close-graph-node-picker")?.addEventListener("click", closeGraphNodePicker);
graphNodePicker?.addEventListener("click", (event) => {
  if (event.target === graphNodePicker) closeGraphNodePicker();
});
graphNodePickerSearch?.addEventListener("input", renderGraphNodePicker);
document.querySelector("#add-frequency-cap-helper")?.addEventListener("click", addFrequencyCapFromHelper);
document.querySelector("#frequency-cap-message")?.addEventListener("change", applyFrequencyCapMessageSuggestion);
document.querySelector("#create-graph-template").addEventListener("click", () => {
  graphBuilder = starterGraphBuilder();
  selectedGraphNodeId = graphBuilder.entry || graphBuilder.nodes?.[0]?.id || "";
  renderGraphBuilder();
  syncJsonFromBuilder();
});
document.querySelector("#reset-graph-layout").addEventListener("click", () => {
  autoLayoutGraph(true);
  renderGraphBuilder();
  syncJsonFromBuilder();
});
graphSnapEnabledInput?.addEventListener("change", () => {
  graphSnapEnabled = graphSnapEnabledInput.checked;
  renderRuleGraph();
});
graphSnapSizeInput?.addEventListener("input", () => {
  graphSnapSize = normalizedGraphSnapSize();
  renderRuleGraph();
});
document.querySelector("#graph-entry").addEventListener("input", () => {
  graphBuilder.entry = document.querySelector("#graph-entry").value.trim();
  renderRuleGraph();
  syncJsonFromBuilder();
});
document.querySelector("#publish-rule").addEventListener("click", publishSelectedRule);
document.querySelector("#submit-rule-review").addEventListener("click", submitSelectedRuleForReview);
document.querySelector("#approve-rule-draft").addEventListener("click", approveSelectedRuleDraft);
document.querySelector("#approve-publish-rule").addEventListener("click", approveSelectedRuleDraft);
document.querySelector("#cancel-publish-rule").addEventListener("click", closePublishConfirm);
document.querySelector("#confirm-publish-rule").addEventListener("click", confirmPublishSelectedRule);
document.querySelector("#rule-editor").addEventListener("submit", saveDraft);
document.querySelector("#rule-draft").addEventListener("change", syncBuilderFromJson);
["#rule-name", "#rule-key", "#rule-type", "#rule-priority", "#rule-surface", "#rule-client-ttl", "#rule-cache-scope", "#rule-dependency-failure-mode", "#rule-dependency-failure-outputs", "#rule-description"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderRuleInspector);
  document.querySelector(selector).addEventListener("change", renderRuleInspector);
});
document.querySelector("#rule-type").addEventListener("change", () => {
  ensureInAppMessageOutputs();
  renderBranchEditor();
  syncJsonFromBuilder();
});
[
  "#experiment-status",
  "#experiment-unit",
  "#experiment-mode",
  "#experiment-bandit-exploration-rate",
  "#experiment-bandit-min-exposures",
  "#experiment-bandit-window-days",
  "#experiment-bandit-freeze-variant",
  "#experiment-goal-event",
  "#experiment-goal-type",
  "#experiment-goal-attribution",
  "#experiment-goal-value-field",
  "#experiment-goal-lift",
  "#experiment-baseline-rate",
  "#experiment-daily-traffic",
  "#experiment-starts-at",
  "#experiment-ends-at",
  "#experiment-display-mode",
  "#experiment-display-reset",
  "#experiment-target-devices",
  "#experiment-url-includes",
  "#experiment-url-excludes",
  "#experiment-page-variables",
  "#experiment-url-preview-samples",
  "#experiment-sdk-conditions",
  "#experiment-trigger-type",
  "#experiment-trigger-event",
  "#experiment-consent-category",
  "#experiment-consent-required"
].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderRuleInspector);
  document.querySelector(selector).addEventListener("change", renderRuleInspector);
});
document.querySelector("#experiment-variants").addEventListener("change", syncExperimentVariantBuilderFromJson);
document.querySelector("#add-experiment-variant").addEventListener("click", addExperimentVariant);
document.querySelector("#balance-experiment-variants").addEventListener("click", balanceExperimentVariants);
document.querySelector("#experiment-variant-builder").addEventListener("input", syncExperimentVariantsFromBuilder);
document.querySelector("#experiment-variant-builder").addEventListener("change", syncExperimentVariantsFromBuilder);
document.querySelector("#experiment-variant-builder").addEventListener("click", handleExperimentVariantBuilderClick);
document.querySelector("#experiment-launch").addEventListener("click", () => setExperimentStatus("running"));
document.querySelector("#experiment-pause").addEventListener("click", () => setExperimentStatus("paused"));
document.querySelector("#fallback-result").addEventListener("input", syncJsonFromBuilder);
document.querySelector("#fallback-outputs").addEventListener("change", syncJsonFromBuilder);
document.querySelector("#lookup-editor").addEventListener("submit", saveLookup);
document.querySelector("#message-editor").addEventListener("submit", saveMessage);
document.querySelector("#sync-message-json").addEventListener("click", syncMessageJsonFromPreview);
document.querySelector("#format-message-json").addEventListener("click", formatActiveMessageJson);
document.querySelector("#upload-message-image")?.addEventListener("click", () => document.querySelector("#message-image-file")?.click());
document.querySelector("#message-image-file")?.addEventListener("change", handleMessageImageFile);
document.querySelector("#cleanup-message-assets")?.addEventListener("click", cleanupMessageAssets);
document.querySelector("#message-image-dropzone")?.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.currentTarget.classList.add("dragging");
});
document.querySelector("#message-image-dropzone")?.addEventListener("dragleave", (event) => {
  event.currentTarget.classList.remove("dragging");
});
document.querySelector("#message-image-dropzone")?.addEventListener("drop", handleMessageImageDrop);
[
  "#message-name",
  "#message-application",
  "#message-surface",
  "#message-status",
  "#message-template-type",
  "#message-placement",
  "#message-preview-title",
  "#message-preview-body",
  "#message-preview-footer",
  "#message-preview-image",
  "#message-primary-cta-label",
  "#message-primary-cta-url",
  "#message-secondary-cta-label",
  "#message-secondary-cta-url",
  "#message-starts-at",
  "#message-expires-at",
  "#message-priority",
  "#message-frequency-ttl",
  "#message-display-mode",
  "#message-trigger-type",
  "#message-max-impressions",
  "#message-target-devices",
  "#message-consent-category",
  "#message-dismiss-behavior"
].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderMessagePreview);
  document.querySelector(selector).addEventListener("change", renderMessagePreview);
});
[
  "#message-name",
  "#message-application",
  "#message-surface",
  "#message-template-type",
  "#message-placement",
  "#message-preview-title",
  "#message-preview-body",
  "#message-preview-footer",
  "#message-preview-image",
  "#message-primary-cta-label",
  "#message-primary-cta-url",
  "#message-secondary-cta-label",
  "#message-secondary-cta-url"
].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("input", syncMessageJsonFromPreviewLive);
  document.querySelector(selector)?.addEventListener("change", syncMessageJsonFromPreviewLive);
});
[
  "#message-preview-title",
  "#message-preview-body",
  "#message-preview-footer",
  "#message-primary-cta-label",
  "#message-primary-cta-url",
  "#message-secondary-cta-label",
  "#message-secondary-cta-url"
].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("focus", () => {
    selectedMessageTokenField = selector;
  });
});
messageRenderTokens?.addEventListener("change", renderMessagePreview);
messageTokenSample?.addEventListener("input", renderMessagePreview);
messageTokenSuggestions?.addEventListener("click", handleMessageTokenClick);
messageExperimentIdeas?.addEventListener("click", handleMessageExperimentIdeaClick);
messageOutput?.addEventListener("click", handleMessageOutputActionClick);
messagePerformanceSummary?.addEventListener("click", handleMessagePerformanceActionClick);
messageSurveyBuilder?.addEventListener("click", handleMessageSurveyBuilderClick);
messageSurveyBuilder?.addEventListener("input", handleMessageSurveyBuilderInput);
messageSurveyBuilder?.addEventListener("change", handleMessageSurveyBuilderInput);
document.querySelector("#message-template-type")?.addEventListener("change", () => {
  renderMessageSurveyBuilder();
});
document.querySelectorAll("[data-message-preview-device]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-message-preview-device]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    messagePreview?.setAttribute("data-device", button.dataset.messagePreviewDevice);
  });
});
document.querySelector("#message-content").addEventListener("input", debounce(syncMessagePreviewFromJson, 250));
document.querySelector("#message-content").addEventListener("change", syncMessagePreviewFromJson);
document.querySelector("#import-lookup-csv").addEventListener("click", importLookupCsv);
document.querySelector("#add-reference-row").addEventListener("click", addReferenceRow);
document.querySelector("#add-reference-column").addEventListener("click", addReferenceColumn);
document.querySelector("#add-lookup-validation-rule").addEventListener("click", addLookupValidationRule);
document.querySelector("#sync-reference-json").addEventListener("click", syncReferenceGridFromJson);
document.querySelector("#lookup-rows").addEventListener("change", syncReferenceGridFromJson);
document.querySelector("#lookup-rows").addEventListener("input", renderLookupInspector);
document.querySelector("#lookup-validation-policy").addEventListener("change", () => {
  syncLookupValidationMetadata();
  renderLookupValidationFromCurrentRows();
});
document.querySelector("#lookup-validation-rules").addEventListener("input", () => {
  syncLookupValidationMetadata();
  renderLookupValidationFromCurrentRows();
});
document.querySelector("#lookup-validation-rules").addEventListener("change", () => {
  syncLookupValidationMetadata();
  renderLookupValidationFromCurrentRows();
});
document.querySelector("#lookup-validation-rules").addEventListener("click", handleLookupValidationRulesClick);
document.querySelector("#lookup-key-column").addEventListener("change", () => {
  renderReferenceGrid();
  renderLookupInspector();
});
["#lookup-id", "#lookup-name"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderLookupInspector);
});
document.querySelector("#settings-form").addEventListener("submit", saveSettings);
["#setting-web-page-variables", "#setting-web-sdk-conditions"].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("input", () => {
    renderWebTargetingCatalogPreview();
    renderWebTargetingOptions();
    renderRuleInspector();
  });
});
document.querySelector("#token-form").addEventListener("submit", createToken);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ruleBuilderPanel && !ruleBuilderPanel.hidden) closeRuleBuilder();
  else if (event.key === "Escape" && ruleDetailModal && !ruleDetailModal.hidden) closeRuleDetail();
  if (event.key === "Escape" && document.body.classList.contains("assistant-open")) closeAssistantPanel();
});

loadMetrics();
loadExperiments();
loadRules();
loadDecisionStacks();
newRule({ silent: true });
newLookup({ silent: true });
newMessage({ silent: true });
initializeAuditDefaults();
renderAuditPresetChips();
renderAuditFilterSummary();
loadAudit();
loadLookups();
loadMessages();
loadSettings();
loadSchema({ silent: true });
loadConditionBlocks({ silent: true });
loadEvaluatePreset();
loadEvaluationProfiles();
renderEvaluationSummary(null, document.querySelector("#eval-mode").value);
renderEvaluationOutputSummary(null);
renderSavedEvaluateProfiles();
renderEvaluateValidation();
loadIntegration();

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${tokenInput.value}`,
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || response.statusText);
  return body;
}

function openAssistantPanel() {
  const panel = document.querySelector("#assistant-panel");
  if (!panel) return;
  panel.hidden = false;
  document.body.classList.add("assistant-open");
  document.querySelector("#assistant-prompt")?.focus();
  scrollAssistantConversation();
}

function closeAssistantPanel() {
  const panel = document.querySelector("#assistant-panel");
  if (!panel) return;
  document.body.classList.remove("assistant-open");
  panel.hidden = true;
}

function appendAssistantMessage(kind, title, detail = "") {
  const target = document.querySelector("#assistant-conversation");
  if (!target) return;
  const content = detail || title || "";
  const element = document.createElement("div");
  element.className = `assistant-message assistant-message-${kind}`;
  element.innerHTML = `
    <strong>${escapeHtml(assistantMessageLabel(kind, title))}</strong>
    ${content ? `<span>${escapeHtml(content)}</span>` : ""}
  `;
  const result = document.querySelector("#assistant-result");
  if (result && result.parentElement === target) {
    target.insertBefore(element, result);
  } else {
    target.appendChild(element);
  }
  if (!["pending", "system"].includes(kind) && content) {
    assistantChatHistory.push({
      role: kind === "user" ? "user" : "assistant",
      content,
      at: new Date().toISOString()
    });
    assistantChatHistory = assistantChatHistory.slice(-12);
  }
  scrollAssistantConversation();
  return element;
}

function assistantMessageLabel(kind, title) {
  if (kind === "user") return "You";
  if (kind === "pending") return "DEE Assistant";
  if (kind === "system") return title || "DEE Assistant";
  return "DEE Assistant";
}

function removeAssistantMessage(element) {
  element?.remove();
  scrollAssistantConversation();
}

function scrollAssistantConversation() {
  const target = document.querySelector("#assistant-conversation");
  if (!target) return;
  requestAnimationFrame(() => {
    target.scrollTop = target.scrollHeight;
  });
}

async function loadRules() {
  try {
    const [body, conflictBody] = await Promise.all([
      api("/v1/rule-sets"),
      api("/v1/rule-conflicts")
    ]);
    cachedRuleSets = body.rule_sets;
    cachedRuleConflicts = {
      conflicts: conflictBody.conflicts || [],
      by_rule: conflictBody.by_rule || {}
    };
    renderEvaluateRuleOptions();
    renderRuleList();
    renderRuleInspector();
    renderMessageRuleLinks();
    renderMessageSurfaceOptions();
    if (stackSteps?.querySelector(".stack-step-card")) {
      const defaultRule = cachedRuleSets[0]?.decision_key || "";
      renderStackSteps(readStackSteps().map((step) => ({ ...step, decision_key: step.decision_key || defaultRule })));
    }
  } catch (error) {
    const target = document.querySelector("#rule-list");
    target.innerHTML = header(["Name", "Decision key", "Status", "Version", "Actions"]);
    target.innerHTML += row([error.message, "", "", "", ""]);
  }
}

async function loadDecisionStacks() {
  if (!stackList) return;
  try {
    const body = await api("/v1/decision-stacks");
    cachedDecisionStacks = body.decision_stacks || [];
    renderDecisionStackList();
    if (!selectedStackId && cachedDecisionStacks.length) {
      selectDecisionStack(cachedDecisionStacks[0].id);
    } else if (selectedStackId) {
      const selected = cachedDecisionStacks.find((stack) => stack.id === selectedStackId);
      if (selected) fillStackForm(selected);
      else createNewStackDraft();
    } else {
      createNewStackDraft({ silent: true });
    }
  } catch (error) {
    stackList.innerHTML = `<div class="status-line">Decision stacks unavailable: ${escapeHtml(error.message)}</div>`;
  }
}

function renderDecisionStackList() {
  if (!stackList) return;
  stackList.innerHTML = cachedDecisionStacks.length
    ? cachedDecisionStacks.map((stack) => `
      <button type="button" class="stack-card ${stack.id === selectedStackId ? "active" : ""}" data-stack-id="${escapeHtml(stack.id)}">
        <span>${escapeHtml(stack.status || "draft")}</span>
        <strong>${escapeHtml(stack.name || stack.id)}</strong>
        <small>${escapeHtml(stack.id)} · ${formatNumber(stack.steps?.length || 0)} steps</small>
        <small>${escapeHtml(stack.surface || "Any surface")}</small>
      </button>
    `).join("")
    : `<div class="status-line">No decision stacks yet. Create a journey to coordinate multiple rule sets.</div>`;
  stackList.querySelectorAll("[data-stack-id]").forEach((button) => {
    button.addEventListener("click", () => selectDecisionStack(button.dataset.stackId));
  });
}

function selectDecisionStack(id) {
  selectedStackId = id;
  const stack = cachedDecisionStacks.find((item) => item.id === id);
  if (stack) fillStackForm(stack);
  renderDecisionStackList();
}

function createNewStackDraft(options = {}) {
  selectedStackId = null;
  fillStackForm({
    id: "",
    name: "",
    description: "",
    status: "draft",
    surface: "",
    ttl_seconds: 0,
    metadata: { result_policy: "last_evaluated" },
    steps: [
      {
        id: "eligibility",
        decision_key: cachedRuleSets[0]?.decision_key || "",
        mode: "always",
        output_namespace: "eligibility",
        merge_outputs: true,
        stop_on_results: ["ineligible", "suppressed"],
        stop_on_error: true
      }
    ]
  });
  renderDecisionStackList();
  if (!options.silent) stackOutput.textContent = "Draft a stack, save it, then run a journey test.";
}

function fillStackForm(stack) {
  document.querySelector("#stack-id").value = stack.id || "";
  document.querySelector("#stack-name").value = stack.name || "";
  document.querySelector("#stack-description").value = stack.description || "";
  document.querySelector("#stack-status").value = stack.status || "draft";
  document.querySelector("#stack-surface").value = stack.surface || "";
  document.querySelector("#stack-ttl").value = Number(stack.ttl_seconds || 0);
  document.querySelector("#stack-result-policy").value = stack.metadata?.result_policy || "last_evaluated";
  renderStackSteps(stack.steps || []);
  if (stackTestPayload && !stackTestPayload.value.trim()) {
    stackTestPayload.value = JSON.stringify(defaultStackTestPayload(stack), null, 2);
  }
}

function renderStackSteps(steps = []) {
  if (!stackSteps) return;
  stackSteps.innerHTML = steps.map((step, index) => stackStepCard(step, index)).join("");
  stackSteps.querySelectorAll("[data-stack-step-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const rows = readStackSteps();
      const index = Number(button.dataset.stepIndex);
      if (button.dataset.stackStepAction === "remove") rows.splice(index, 1);
      if (button.dataset.stackStepAction === "up" && index > 0) [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]];
      if (button.dataset.stackStepAction === "down" && index < rows.length - 1) [rows[index], rows[index + 1]] = [rows[index + 1], rows[index]];
      renderStackSteps(rows);
    });
  });
  renderStackReadiness();
}

function renderStackReadiness() {
  if (!stackReadiness) return;
  let readiness;
  try {
    readiness = clientStackReadiness(readStackSteps());
  } catch (error) {
    readiness = {
      status: "blocked",
      summary: { errors: 1, warnings: 0 },
      checks: [{ level: "error", title: "Stack form is invalid", detail: error.message }],
      dependencies: []
    };
  }
  stackReadiness.innerHTML = `
    <div class="stack-readiness-head ${escapeHtml(readiness.status)}">
      <div>
        <strong>${escapeHtml(stackReadinessTitle(readiness.status))}</strong>
        <span>${formatNumber(readiness.summary.errors || 0)} errors · ${formatNumber(readiness.summary.warnings || 0)} warnings · ${formatNumber(readiness.dependencies.length || 0)} dependencies</span>
      </div>
    </div>
    <div class="stack-readiness-grid">
      ${readiness.checks.length ? readiness.checks.map((check) => `
        <div class="stack-readiness-check ${escapeHtml(check.level)}">
          <strong>${escapeHtml(check.title)}</strong>
          <span>${escapeHtml(check.detail || "")}</span>
        </div>
      `).join("") : `<div class="stack-readiness-check ok"><strong>Ready</strong><span>All configured dependencies have a published version.</span></div>`}
    </div>
    ${readiness.dependencies.length ? `
      <div class="stack-dependency-strip">
        ${readiness.dependencies.map((dependency) => `
          <div class="${dependency.exists && dependency.published_version && dependency.status !== "archived" ? "ok" : "warn"}">
            <strong>${escapeHtml(dependency.decision_key)}</strong>
            <span>${escapeHtml(dependency.exists ? `${dependency.type || "rule"} · ${dependency.status || "draft"} · v${dependency.published_version || "-"}` : "missing")}</span>
          </div>
        `).join("")}
      </div>
    ` : ""}
  `;
}

function clientStackReadiness(steps = []) {
  const checks = [];
  const dependencies = [];
  const ids = new Set();
  const namespaces = new Map();
  if (!steps.length) checks.push({ level: "error", title: "No steps configured", detail: "Add at least one rule step before activating the stack." });
  for (const [index, step] of steps.entries()) {
    const stepLabel = step.id || `step_${index + 1}`;
    if (!step.id) checks.push({ level: "error", title: "Missing step id", detail: "Every step needs a stable id for traceability." });
    if (step.id && ids.has(step.id)) checks.push({ level: "error", title: `Duplicate step id: ${step.id}`, detail: "Step ids must be unique." });
    ids.add(step.id);
    if (!step.decision_key) {
      checks.push({ level: "error", title: `${stepLabel}: missing rule set`, detail: "Select a rule set for this step." });
      continue;
    }
    const rule = cachedRuleSets.find((item) => item.decision_key === step.decision_key);
    dependencies.push({
      step_id: stepLabel,
      decision_key: step.decision_key,
      exists: Boolean(rule),
      status: rule?.status || "missing",
      type: rule?.type || "",
      published_version: rule?.version || null
    });
    if (!rule) checks.push({ level: "error", title: `Rule not found: ${step.decision_key}`, detail: "Create the rule set or select a different dependency." });
    else if (rule.status === "archived") checks.push({ level: "error", title: `Rule is archived: ${step.decision_key}`, detail: "Restore or replace the archived rule." });
    else if (!rule.version) checks.push({ level: "error", title: `Rule has no published version: ${step.decision_key}`, detail: "Publish the rule before evaluating it in a stack." });
    if (step.mode === "on_result" && !step.required_result) {
      checks.push({ level: "warn", title: `${stepLabel}: missing required result`, detail: "Set the previous result that should trigger this step." });
    }
    if (step.mode === "on_output" && (!step.required_output || !Object.keys(step.required_output).length)) {
      checks.push({ level: "warn", title: `${stepLabel}: missing required output`, detail: "Set a required_output JSON match for this trigger." });
    }
    if (!step.stop_on_results?.length) checks.push({ level: "warn", title: `${stepLabel}: no stop policy`, detail: "Most journeys should stop on suppressed or ineligible outcomes." });
    const namespace = step.output_namespace || step.decision_key;
    namespaces.set(namespace, (namespaces.get(namespace) || 0) + 1);
  }
  for (const [namespace, count] of namespaces.entries()) {
    if (count > 1) checks.push({ level: "warn", title: `Output namespace reused: ${namespace}`, detail: "Repeated namespaces overwrite by_step output for earlier steps." });
  }
  const errors = checks.filter((check) => check.level === "error").length;
  const warnings = checks.filter((check) => check.level === "warn").length;
  return {
    status: errors ? "blocked" : warnings ? "review" : "ready",
    summary: { errors, warnings },
    checks,
    dependencies
  };
}

function stackReadinessTitle(status) {
  if (status === "blocked") return "Blocked";
  if (status === "review") return "Needs review";
  return "Ready";
}

function stackStepCard(step = {}, index = 0) {
  const ruleOptions = cachedRuleSets.map((rule) =>
    `<option value="${escapeHtml(rule.decision_key)}" ${rule.decision_key === step.decision_key ? "selected" : ""}>${escapeHtml(rule.name || rule.decision_key)} (${escapeHtml(rule.decision_key)})</option>`
  ).join("");
  return `
    <div class="stack-step-card" data-stack-step-index="${index}">
      <div class="stack-step-order">${index + 1}</div>
      <div class="stack-step-fields">
        <label>
          Step ID
          <input data-stack-field="id" value="${escapeHtml(step.id || `step_${index + 1}`)}" />
        </label>
        <label>
          Rule set
          <select data-stack-field="decision_key">
            <option value="">Select rule</option>
            ${ruleOptions}
          </select>
        </label>
        <label>
          Run mode
          <select data-stack-field="mode">
            ${["always", "on_result", "on_output"].map((mode) => `<option value="${mode}" ${mode === (step.mode || "always") ? "selected" : ""}>${stackModeLabel(mode)}</option>`).join("")}
          </select>
        </label>
        <label>
          Required result
          <input data-stack-field="required_result" value="${escapeHtml(step.required_result || "")}" placeholder="eligible" />
        </label>
        <label>
          Output namespace
          <input data-stack-field="output_namespace" value="${escapeHtml(step.output_namespace || step.decision_key || "")}" />
        </label>
        <label>
          Stop on results
          <input data-stack-field="stop_on_results" value="${escapeHtml((step.stop_on_results || step.stop_on || ["ineligible", "suppressed"]).join(", "))}" />
        </label>
        <label>
          Required output JSON
          <textarea data-stack-field="required_output" rows="2" placeholder='{"offer_id":"premium"}'>${escapeHtml(stableStringify(step.required_output || {}))}</textarea>
        </label>
        <label>
          Merge outputs
          <select data-stack-field="merge_outputs">
            <option value="true" ${step.merge_outputs === false ? "" : "selected"}>Yes</option>
            <option value="false" ${step.merge_outputs === false ? "selected" : ""}>No</option>
          </select>
        </label>
      </div>
      <div class="stack-step-actions">
        <button type="button" data-stack-step-action="up" data-step-index="${index}">Up</button>
        <button type="button" data-stack-step-action="down" data-step-index="${index}">Down</button>
        <button type="button" data-stack-step-action="remove" data-step-index="${index}">Remove</button>
      </div>
    </div>
  `;
}

function stackModeLabel(mode) {
  if (mode === "on_result") return "After previous result";
  if (mode === "on_output") return "After previous output";
  return "Always";
}

function addStackStep() {
  const rows = readStackSteps();
  rows.push({
    id: `step_${rows.length + 1}`,
    decision_key: cachedRuleSets[0]?.decision_key || "",
    mode: rows.length ? "on_result" : "always",
    required_result: rows.length ? "eligible" : "",
    output_namespace: "",
    merge_outputs: true,
    stop_on_results: ["ineligible", "suppressed"],
    stop_on_error: true
  });
  renderStackSteps(rows);
}

function readStackForm() {
  const metadata = { result_policy: document.querySelector("#stack-result-policy").value || "last_evaluated" };
  return {
    id: document.querySelector("#stack-id").value.trim(),
    name: document.querySelector("#stack-name").value.trim(),
    description: document.querySelector("#stack-description").value.trim(),
    status: document.querySelector("#stack-status").value,
    surface: document.querySelector("#stack-surface").value.trim(),
    ttl_seconds: Number(document.querySelector("#stack-ttl").value || 0),
    metadata,
    steps: readStackSteps()
  };
}

function readStackSteps() {
  return [...(stackSteps?.querySelectorAll(".stack-step-card") || [])].map((card) => {
    const value = (field) => card.querySelector(`[data-stack-field="${field}"]`)?.value ?? "";
    const requiredOutputText = value("required_output").trim();
    const requiredOutput = requiredOutputText ? parseJsonStrict(requiredOutputText) : {};
    return {
      id: value("id").trim(),
      decision_key: value("decision_key").trim(),
      mode: value("mode"),
      required_result: value("required_result").trim() || null,
      required_output: Object.keys(requiredOutput).length ? requiredOutput : null,
      output_namespace: value("output_namespace").trim(),
      merge_outputs: value("merge_outputs") !== "false",
      stop_on_results: value("stop_on_results").split(",").map((item) => item.trim()).filter(Boolean),
      stop_on_error: true
    };
  });
}

async function saveDecisionStack() {
  try {
    const stack = readStackForm();
    const body = await api("/v1/decision-stacks", { method: "POST", body: JSON.stringify(stack) });
    selectedStackId = body.decision_stack?.id || stack.id;
    stackOutput.textContent = JSON.stringify(body, null, 2);
    await loadDecisionStacks();
  } catch (error) {
    stackOutput.textContent = error.message;
  }
}

async function archiveDecisionStack() {
  const id = document.querySelector("#stack-id")?.value.trim();
  if (!id) {
    stackOutput.textContent = "Save or select a stack before archiving.";
    return;
  }
  try {
    const body = await api(`/v1/decision-stacks/${encodeURIComponent(id)}/archive`, { method: "POST", body: "{}" });
    stackOutput.textContent = JSON.stringify(body, null, 2);
    await loadDecisionStacks();
  } catch (error) {
    stackOutput.textContent = error.message;
  }
}

async function runDecisionStackTest() {
  const id = document.querySelector("#stack-id")?.value.trim();
  if (!id) {
    stackOutput.textContent = "Save the stack before running a journey test.";
    return;
  }
  try {
    const payload = parseJsonStrict(stackTestPayload.value || "{}");
    const body = await api(`/v1/decision-stacks/${encodeURIComponent(id)}/evaluate`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    stackOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    stackOutput.textContent = error.message;
  }
}

function defaultStackTestPayload(stack = {}) {
  return {
    profile_key: "demo-profile",
    identifiers: [{ typeId: "email", value: "demo@example.com" }],
    attributes: {
      lead_score: [{ value: 82 }],
      customer_lifetime_value: [{ value: 12400 }],
      churn_risk_score: [{ value: 0.2 }]
    },
    segments: {},
    context: {
      surface: stack.surface || "homepage",
      request_source: "dee_ui_stack_test"
    }
  };
}

async function loadMetrics() {
  try {
    const windowHours = document.querySelector("#overview-window")?.value || "24";
    const body = await api(`/v1/metrics?window_hours=${encodeURIComponent(windowHours)}`);
    renderMetrics(body.metrics);
  } catch (error) {
    metricCards.innerHTML = `<div class="metric-card"><span>Metrics unavailable</span><strong>${escapeHtml(error.message)}</strong></div>`;
  }
}

function renderMetrics(metrics) {
  const requests = metrics.requests || {};
  const rules = metrics.rules || {};
  const schema = metrics.schema || {};
  const cache = metrics.client_cache || {};
  const profileCache = metrics.profile_cache || {};
  const events = metrics.client_events || {};
  const runtime = metrics.runtime_requests || {};
  const rateLimit = metrics.client_rate_limit || {};
  const precompute = metrics.precompute || {};
  const windowLabel = metrics.window?.label || "Selected window";
  const windowRequests = Number(requests.window ?? requests.last_24h ?? 0);
  const eventCounts = eventCountsByType(events.by_type || []);
  const eligibleCount = resultCount(metrics.result_distribution || [], "eligible");
  const eligibilityRate = rate(eligibleCount, windowRequests);
  const impressionRate = rate(eventCounts.impression || 0, windowRequests);
  const conversionRate = rate(eventCounts.conversion || 0, Math.max(eventCounts.impression || 0, eventCounts.exposure || 0));
  const skippedRate = rate(eventCounts.skipped || 0, Math.max(eventCounts.impression || 0, eventCounts.exposure || 0, 1));
  metricCards.innerHTML = [
    pipelineCell("REQ", "Evaluations", formatNumber(windowRequests), windowLabel, "teal"),
    pipelineCell("AUD", "Audience", formatNumber(requests.unique_profiles_window ?? requests.unique_profiles), "unique profiles", "blue"),
    pipelineCell("ELG", "Eligibility", formatPercent(eligibilityRate), `${formatNumber(eligibleCount)} eligible`, "teal"),
    pipelineCell("EXP", "Exposures", formatNumber(eventCounts.exposure || 0), `${formatPercent(rate(eventCounts.exposure || 0, windowRequests))} of evaluations`, "purple"),
    pipelineCell("IMP", "Impressions", formatNumber(eventCounts.impression || 0), `${formatPercent(impressionRate)} impression rate`, "blue"),
    pipelineCell("SKP", "Skipped", formatNumber(eventCounts.skipped || 0), `${formatPercent(skippedRate)} skipped after exposure`, "amber"),
    pipelineCell("CVR", "Conversions", formatNumber(eventCounts.conversion || 0), `${formatPercent(conversionRate)} conversion rate`, "teal")
  ].join("");

  renderOverviewAlerts(metrics);
  renderOverviewLiveAssets(metrics);
  renderOverviewAnomalyHistory(metrics.anomaly_baseline || {});
  renderRuleUsage(metrics.rule_usage || []);
  loadClientEventMetrics();
  loadChangeLog();
  loadCampaignRollups(metrics.window_hours);
  renderRequestTrend(metrics);
  renderClientTraffic(metrics.client_traffic || {});
  renderPrecomputeMetrics(precompute);
  renderResultDistribution(metrics);
  renderRulesInventory(rules);
  renderOverviewFooter(metrics);
  document.querySelector("#metrics-schema-health").innerHTML = readinessChecklist(metrics);
  if (ruleDetailPanel && !ruleDetailPanel.textContent.trim()) {
    ruleDetailPanel.innerHTML = `<div class="status-line">Select a rule in Rule Usage to inspect recent decisions, fallback rate, and matched branch frequency.</div>`;
  }
}

function eventCountsByType(items = []) {
  return Object.fromEntries(items.map((item) => [item.event_type, Number(item.count || 0)]));
}

function resultCount(items = [], result) {
  return Number(items.find((item) => item.result === result)?.count || 0);
}

function renderOverviewAlerts(metrics) {
  if (!overviewAlerts) return;
  const alerts = overviewAlertItems(metrics);
  const active = alerts.find((item) => item.level !== "ok") || alerts[0] || { level: "ok", title: "All systems healthy", detail: "Runtime, traffic, schema, and feedback signals look normal." };
  const checks = overviewHealthChecks(metrics);
  overviewAlerts.innerHTML = `
    <div class="overview-health-bar ${escapeHtml(active.level)}">
      <span class="overview-health-dot"></span>
      <div>
        <strong>${escapeHtml(active.level === "ok" ? "All systems healthy" : active.title)}</strong>
        <small>${escapeHtml(active.detail)}</small>
      </div>
      <div class="overview-health-checks">
        ${checks.map((check) => `<span class="${check.ok ? "ok" : "warn"}">${escapeHtml(check.label)}</span>`).join("")}
      </div>
    </div>
  `;
}

function overviewHealthChecks(metrics = {}) {
  const schema = metrics.schema || {};
  const events = metrics.client_events || {};
  const runtime = metrics.runtime_requests || {};
  const rateLimit = metrics.client_rate_limit || {};
  const profileCache = metrics.profile_cache || {};
  const counts = eventCountsByType(events.by_type || []);
  const delivered = Number(counts.exposure || 0) + Number(counts.impression || 0);
  const skipped = Number(counts.skipped || 0);
  return [
    { label: "Profile fields", ok: Number(profileCache.errors || 0) === 0 },
    { label: "Feedback loop", ok: Number(events.window ?? events.last_24h ?? 0) > 0 },
    { label: "Delivery", ok: delivered === 0 || skipped / Math.max(delivered, 1) < 0.2 },
    { label: "Service reliability", ok: Number(runtime.error_rate || 0) < 0.05 },
    { label: "Schema sync", ok: !schema.last_sync_status || ["ok", "success", "never"].includes(String(schema.last_sync_status).toLowerCase()) },
    { label: "Rate limits", ok: Number(rateLimit.blocked || 0) === 0 }
  ];
}

function renderOverviewLiveAssets(metrics = {}) {
  if (!overviewLiveAssets) return;
  const rules = metrics.rules || {};
  const precompute = metrics.precompute || {};
  const cache = metrics.client_cache || {};
  const live = Number(rules.published || 0);
  const drafts = Number(rules.draft || 0);
  overviewLiveAssets.innerHTML = `
    <div class="live-assets-badge">${escapeHtml(formatNumber(live))}</div>
    <div>
      <span>Live Assets</span>
      <strong>${escapeHtml(formatNumber(rules.total || live))} rules and experiments tracked</strong>
      <small>${escapeHtml(formatNumber(drafts))} drafts waiting · ${escapeHtml(formatNumber(precompute.profile_count || 0))} precomputed profiles</small>
    </div>
    <div class="live-assets-divider"></div>
    <div>
      <span>Cache quality</span>
      <strong>${escapeHtml(formatPercent(cache.hit_rate || 0))} client hit rate</strong>
      <small>${escapeHtml(formatNumber(cache.entries || 0))} active entries</small>
    </div>
    ${drafts ? `<button type="button" data-view="rules">Review drafts</button>` : `<span class="live-assets-ready">No drafts waiting</span>`}
  `;
  overviewLiveAssets.querySelector("[data-view='rules']")?.addEventListener("click", () => switchView("rules"));
}

function overviewAlertItems(metrics) {
  const requests = metrics.requests || {};
  const events = metrics.client_events || {};
  const runtime = metrics.runtime_requests || {};
  const rateLimit = metrics.client_rate_limit || {};
  const profileCache = metrics.profile_cache || {};
  const schema = metrics.schema || {};
  const counts = eventCountsByType(events.by_type || []);
  const delivered = Number(counts.exposure || 0) + Number(counts.impression || 0);
  const skipped = Number(counts.skipped || 0);
  const items = [];
  if (Number(runtime.error_rate || 0) >= 0.05) {
    items.push({ level: "error", label: "Runtime", title: "High error rate", detail: `${formatPercent(runtime.error_rate)} across recent API samples.` });
  }
  if (Number(runtime.p95_ms || 0) >= 750) {
    items.push({ level: "warn", label: "Latency", title: "P95 latency elevated", detail: `${formatNumber(runtime.p95_ms)}ms p95 across ${formatNumber(runtime.sample_size || 0)} samples.` });
  }
  if (Number(rateLimit.blocked || 0) > 0) {
    items.push({ level: "warn", label: "Traffic", title: "Rate limits triggered", detail: `${formatNumber(rateLimit.blocked)} client requests blocked.` });
  }
  if (schema.last_sync_status && !["ok", "success", "never"].includes(String(schema.last_sync_status).toLowerCase())) {
    items.push({ level: "warn", label: "Schema", title: "Schema sync needs attention", detail: `Last status: ${schema.last_sync_status}.` });
  }
  if (Number(profileCache.errors || 0) > 0) {
    items.push({ level: "warn", label: "Profile API", title: "Profile enrichment errors", detail: `${formatNumber(profileCache.errors)} failed lookups recorded. ${formatNumber(profileCache.not_found || 0)} identifiers had no matching profile.` });
  }
  if (skipped > 0 && skipped / Math.max(delivered, 1) >= 0.2) {
    items.push({
      level: skipped / Math.max(delivered, 1) >= 0.4 ? "warn" : "info",
      label: "Delivery",
      title: "Skipped delivery is elevated",
      detail: `${formatNumber(skipped)} skipped events across ${formatNumber(delivered)} exposures or impressions. Inspect Delivery diagnostics for consent, device, placement, or policy mismatches.`
    });
  }
  if (Number(requests.window ?? requests.last_24h ?? 0) > 0 && Number(events.window ?? events.last_24h ?? 0) === 0) {
    items.push({ level: "info", label: "Feedback", title: "No client events in window", detail: "Evaluations are running, but exposure/impression/conversion feedback is absent." });
  }
  if (!items.length) {
    items.push({ level: "ok", label: "Health", title: "No active alerts", detail: "Runtime, traffic, schema, and feedback signals look normal." });
  }
  return items.slice(0, 4);
}

function renderOverviewAnomalyHistory(baseline = {}) {
  if (!overviewAnomalyHistory) return;
  const signals = baseline.signals || [];
  const alerts = baseline.alerts || [];
  if (!signals.length) {
    overviewAnomalyHistory.innerHTML = `<div class="status-line">No baseline data available yet.</div>`;
    return;
  }
  overviewAnomalyHistory.innerHTML = `
    <div class="anomaly-signal-grid">
      ${signals.map((signal) => `
        <div class="anomaly-signal ${escapeHtml(signal.level || "ok")}">
          <span>${escapeHtml(signal.label || "-")}</span>
          <strong>${escapeHtml(formatAnomalyValue(signal.current, signal.unit))}</strong>
          <small>Previous ${escapeHtml(formatAnomalyValue(signal.previous, signal.unit))} · ${escapeHtml(formatSignedPercent(signal.change || 0))}</small>
        </div>
      `).join("")}
    </div>
    <div class="anomaly-alert-history">
      ${alerts.length ? alerts.map((alert) => `
        <div class="anomaly-alert-item ${escapeHtml(alert.level)}">
          <span>${escapeHtml(alert.label)}</span>
          <strong>${escapeHtml(alert.title)}</strong>
          <small>${escapeHtml(alert.detail)}</small>
        </div>
      `).join("") : `<div class="anomaly-alert-item ok"><span>Baseline</span><strong>No anomalies detected</strong><small>Current metrics are within conservative baseline thresholds.</small></div>`}
    </div>
  `;
}

async function loadChangeLog() {
  if (!overviewChangeLog) return;
  try {
    const body = await api("/v1/change-log?limit=12");
    renderChangeLog(body.changes || []);
  } catch (error) {
    overviewChangeLog.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

async function loadCampaignRollups(windowHours) {
  if (!overviewCampaignRollups) return;
  try {
    const hours = windowHours || document.querySelector("#overview-window")?.value || "24";
    const [body, experimentBody] = await Promise.all([
      api(`/v1/campaigns?window_hours=${encodeURIComponent(hours)}&limit=10`),
      api("/v1/experiments").catch(() => ({ experiments: [] }))
    ]);
    cachedCampaigns = body.campaigns || [];
    if (experimentBody.experiments?.length) cachedExperiments = experimentBody.experiments;
    renderCampaignRollups(cachedCampaigns);
  } catch (error) {
    overviewCampaignRollups.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function renderCampaignRollups(campaigns) {
  if (!overviewCampaignRollups) return;
  overviewCampaignRollups.innerHTML = campaigns.length
    ? `${campaignRollupHeader()}${campaigns.map(campaignRollupItem).join("")}`
    : `<div class="status-line">No campaigns configured yet.</div>`;
  overviewCampaignRollups.querySelectorAll("[data-campaign-action]").forEach((button) => {
    button.addEventListener("click", () => runCampaignBulkAction(button.dataset.campaign, button.dataset.campaignAction));
  });
  overviewCampaignRollups.querySelectorAll("[data-campaign-detail]").forEach((button) => {
    button.addEventListener("click", () => renderCampaignDetail(button.dataset.campaignDetail));
  });
}

function campaignRollupHeader() {
  return `
    <div class="campaign-rollup-header">
      <span>Campaign</span>
      <span>Assets</span>
      <span>Requests</span>
      <span>Feedback</span>
      <span>Conversion</span>
      <span>Last Activity</span>
      <span>Actions</span>
    </div>
  `;
}

function campaignRollupItem(item) {
  const feedback = item.client_events || {};
  const reviewAction = approvalWorkflowEnabled()
    ? `<button type="button" data-campaign-action="submit_review" data-campaign="${escapeHtml(item.campaign || "Unassigned")}">Review</button>`
    : "";
  const assetSummary = [
    `${formatNumber(item.rules || 0)} rules`,
    `${formatNumber(item.experiments || 0)} experiments`,
    `${formatNumber(item.messages || 0)} messages`
  ].join(" · ");
  const feedbackSummary = [
    `${formatNumber(feedback.exposure || 0)} exp`,
    `${formatNumber(feedback.impression || 0)} imp`,
    `${formatNumber(feedback.conversion || 0)} conv`
  ].join(" · ");
  return `
    <div class="campaign-rollup-item">
      <div>
        <button type="button" class="campaign-detail-link" data-campaign-detail="${escapeHtml(item.campaign || "Unassigned")}">${escapeHtml(item.campaign || "Unassigned")}</button>
        <small>${escapeHtml((item.decision_keys || []).join(", ") || "No decisions linked")}</small>
      </div>
      <span>${escapeHtml(assetSummary)}</span>
      <strong>${escapeHtml(formatNumber(item.requests || 0))}</strong>
      <span>${escapeHtml(feedbackSummary)}</span>
      <mark>${escapeHtml(formatPercent(item.conversion_rate || 0))}</mark>
      <small>${escapeHtml(item.last_activity_at ? formatTime(item.last_activity_at) : "-")}</small>
      <div class="campaign-rollup-actions">
        ${reviewAction}
        <button type="button" data-campaign-action="move" data-campaign="${escapeHtml(item.campaign || "Unassigned")}">Move</button>
        <button type="button" data-campaign-action="duplicate" data-campaign="${escapeHtml(item.campaign || "Unassigned")}">Duplicate</button>
        <button type="button" data-campaign-action="archive" data-campaign="${escapeHtml(item.campaign || "Unassigned")}">Archive</button>
      </div>
    </div>
  `;
}

function renderCampaignDetail(campaignName) {
  if (!overviewCampaignDetail) return;
  const campaign = cachedCampaigns.find((item) => (item.campaign || "Unassigned") === (campaignName || "Unassigned"));
  if (!campaign) {
    overviewCampaignDetail.innerHTML = `<div class="status-line">Campaign not found.</div>`;
    return;
  }
  const assets = campaign.assets || {};
  const events = campaign.recent_events || [];
  overviewCampaignDetail.innerHTML = `
    <div class="campaign-detail-hero">
      <div>
        <span>Campaign</span>
        <strong>${escapeHtml(campaign.campaign || "Unassigned")}</strong>
        <small>${escapeHtml((campaign.surfaces || []).join(", ") || "No surfaces configured")}</small>
      </div>
      <div class="campaign-detail-kpis">
        ${campaignDetailKpi("Rules", campaign.rules || 0, `${formatNumber(campaign.published_rules || 0)} published`)}
        ${campaignDetailKpi("Experiments", campaign.experiments || 0, `${formatNumber(assets.experiments?.length || 0)} listed`)}
        ${campaignDetailKpi("Messages", campaign.messages || 0, `${formatNumber(assets.messages?.length || 0)} listed`)}
        ${campaignDetailKpi("Conflicts", campaign.conflict_count || 0, (campaign.conflict_count || 0) ? "review required" : "none detected")}
        ${campaignDetailKpi("Conversion", formatPercent(campaign.conversion_rate || 0), `${formatNumber(campaign.client_events?.conversion || 0)} conversions`)}
      </div>
    </div>
    <div class="campaign-detail-grid">
      ${campaignAssetSection("Experiments", assets.experiments || [], "experiment")}
      ${campaignGraphExperimentsSection(campaign)}
      ${campaignAssetSection("Rules", assets.rules || [], "rule")}
      ${campaignAssetSection("Messages", assets.messages || [], "message")}
      ${campaignSurfacesSection(campaign.surfaces || [], campaign.client_events || {})}
      ${campaignConflictsSection(campaign.conflicts || [])}
      ${campaignReviewSection(campaign.review_status || {})}
      ${campaignDependenciesSection(campaign.dependencies || [])}
      ${campaignRecentEventsSection(events)}
    </div>
  `;
  overviewCampaignDetail.querySelectorAll("[data-campaign-nav]").forEach((button) => {
    button.addEventListener("click", handleCampaignNavigation);
  });
  overviewCampaignDetail.querySelectorAll("[data-campaign-graph-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.campaignGraphDetail || "";
      selectedCampaignGraphKey = selectedCampaignGraphKey === key ? "" : key;
      renderCampaignDetail(campaign.campaign || "Unassigned");
    });
  });
  overviewCampaignDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function campaignDetailKpi(label, value, detail) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small>${escapeHtml(detail || "")}</small>
    </div>
  `;
}

function campaignAssetSection(title, items = [], kind) {
  return `
    <section class="campaign-detail-section">
      <div class="campaign-detail-section-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(formatNumber(items.length))} item${items.length === 1 ? "" : "s"}</span>
      </div>
      <div class="campaign-asset-list">
        ${items.length ? items.map((item) => campaignAssetRow(item, kind)).join("") : `<div class="status-line">No ${escapeHtml(title.toLowerCase())} in this campaign.</div>`}
      </div>
    </section>
  `;
}

function campaignAssetRow(item, kind) {
  const detail = [
    item.surface || "",
    item.status || "",
    item.approval_status ? `review ${item.approval_status}` : "",
    item.variant_count ? `${item.variant_count} variants` : "",
    item.template_type || ""
  ].filter(Boolean).join(" · ");
  const action = kind === "message" ? "open-message" : kind === "experiment" ? "open-experiment" : "open-rule";
  return `
    <div class="campaign-asset-row">
      <div>
        <strong>${escapeHtml(item.name || item.id)}</strong>
        <span>${escapeHtml(item.id || "")}</span>
        <small>${escapeHtml(detail || "No detail")}</small>
      </div>
      <button type="button" data-campaign-nav="${escapeHtml(action)}" data-object-id="${escapeHtml(item.id)}">Open</button>
    </div>
  `;
}

function campaignGraphExperimentsSection(campaign = {}, options = {}) {
  const rows = campaignGraphExperiments(campaign);
  if (options.compact && !rows.length) return "";
  return `
    <section class="campaign-detail-section ${options.compact ? "campaign-graph-compact" : "campaign-detail-wide"}">
      <div class="campaign-detail-section-head">
        <strong>Graph-managed experiments</strong>
        <span>${escapeHtml(formatNumber(rows.length))} active split${rows.length === 1 ? "" : "s"}</span>
      </div>
      <div class="campaign-graph-list">
        ${rows.length ? rows.map(campaignGraphExperimentRow).join("") : `<div class="status-line">No graph split assignments recorded for this campaign yet.</div>`}
      </div>
    </section>
  `;
}

function campaignGraphExperiments(campaign = {}) {
  const campaignName = campaign.campaign || "Unassigned";
  return (cachedExperiments || [])
    .filter((experiment) => (campaignForDecisionKey(experiment.decision_key) || "Unassigned") === campaignName)
    .flatMap((experiment) => {
      const graphNodes = experiment.assignment_history?.by_graph_node || [];
      return graphNodes.map((node) => ({ experiment, node }));
    })
    .sort((left, right) => Number(right.node.count || 0) - Number(left.node.count || 0));
}

function campaignGraphExperimentRow({ experiment = {}, node = {} } = {}) {
  const detailKey = campaignGraphDetailKey(experiment, node);
  const active = selectedCampaignGraphKey === detailKey;
  return `
    <div class="campaign-graph-row ${active ? "selected" : ""}">
      <div>
        <strong>${escapeHtml(experiment.name || experiment.decision_key || "Experiment")}</strong>
        <span>${escapeHtml([node.key, node.graph_node_id, node.mode || node.strategy].filter(Boolean).join(" · "))}</span>
        <small>${escapeHtml(graphAssignmentVariantSummary(node.variants || []))}</small>
      </div>
      <em>${escapeHtml(formatNumber(node.count || 0))} assignments</em>
      <button type="button" data-campaign-graph-detail="${escapeHtml(detailKey)}">${active ? "Hide" : "Details"}</button>
      <button type="button" data-campaign-nav="open-experiment" data-object-id="${escapeHtml(experiment.decision_key || "")}">Open</button>
    </div>
    ${active ? campaignGraphExperimentDetail(experiment, node) : ""}
  `;
}

function campaignGraphDetailKey(experiment = {}, node = {}) {
  return [experiment.decision_key || "", node.graph_node_id || "", node.key || ""].join("::");
}

function campaignGraphExperimentDetail(experiment = {}, node = {}) {
  const recentAssignments = graphNodeRecentAssignments(experiment, node);
  const recentEvents = graphNodeRecentEvents(experiment, node);
  return `
    <div class="campaign-graph-detail">
      <div class="campaign-graph-detail-summary">
        ${campaignDetailKpi("Node", node.graph_node_id || "-", node.key || "graph split")}
        ${campaignDetailKpi("Mode", node.mode || node.strategy || "-", assignmentStrategyLabel(node.strategy || "graph_split") || "assignment")}
        ${campaignDetailKpi("Variants", formatNumber((node.variants || []).length), graphAssignmentVariantSummary(node.variants || []))}
      </div>
      <div class="campaign-graph-detail-columns">
        <section>
          <strong>Recent assignments</strong>
          <div class="campaign-graph-mini-list">
            ${recentAssignments.length ? recentAssignments.map((item) => `
              <div>
                <span>${escapeHtml(item.variant_key || "-")}</span>
                <small>${escapeHtml(item.profile_key || "-")}</small>
                <time>${item.assigned_at ? escapeHtml(formatTime(item.assigned_at)) : "-"}</time>
              </div>
            `).join("") : `<div class="status-line">No recent assignment rows for this node.</div>`}
          </div>
        </section>
        <section>
          <strong>Recent client events</strong>
          <div class="campaign-graph-mini-list">
            ${recentEvents.length ? recentEvents.map((event) => `
              <div>
                <span>${escapeHtml(event.event_type || "-")}</span>
                <small>${escapeHtml([event.variant_key, event.surface, event.profile_key].filter(Boolean).join(" · ") || "-")}</small>
                <time>${event.occurred_at ? escapeHtml(formatTime(event.occurred_at)) : "-"}</time>
              </div>
            `).join("") : `<div class="status-line">No recent campaign events for these variants.</div>`}
          </div>
        </section>
      </div>
    </div>
  `;
}

function graphNodeRecentAssignments(experiment = {}, node = {}) {
  const nodeId = node.graph_node_id || "";
  return (experiment.assignment_history?.recent || [])
    .filter((item) => {
      const graph = item.assignment?.graph || {};
      return graph.node_id === nodeId || item.assignment?.graph_node_id === nodeId;
    })
    .slice(0, 6);
}

function graphNodeRecentEvents(experiment = {}, node = {}) {
  const variantKeys = new Set((node.variants || []).map((variant) => variant.key).filter(Boolean));
  const events = (cachedCampaigns || [])
    .flatMap((campaign) => campaign.recent_events || [])
    .filter((event) => event.decision_key === experiment.decision_key);
  const exact = events.filter((event) => eventGraphExperiments(event).some((assignment) =>
    assignment.graph_node_id === node.graph_node_id ||
    assignment.node_id === node.graph_node_id ||
    assignment.experiment_key === node.key
  ));
  return (exact.length ? exact : events.filter((event) => !variantKeys.size || variantKeys.has(event.variant_key))).slice(0, 6);
}

function eventGraphExperiments(event = {}) {
  return [
    event.graph_experiments,
    event.event?.graph_experiments,
    event.event_payload?.graph_experiments
  ].find((items) => Array.isArray(items)) || [];
}

function campaignSurfacesSection(surfaces = [], events = {}) {
  return `
    <section class="campaign-detail-section">
      <div class="campaign-detail-section-head">
        <strong>Surfaces</strong>
        <span>${escapeHtml(formatNumber(surfaces.length))} configured</span>
      </div>
      <div class="campaign-chip-list">
        ${surfaces.length ? surfaces.map((surface) => `<span>${escapeHtml(surface)}</span>`).join("") : `<span>No surfaces</span>`}
      </div>
      <div class="campaign-mini-metrics">
        ${campaignDetailKpi("Exposure", events.exposure || 0, "client events")}
        ${campaignDetailKpi("Impression", events.impression || 0, "client events")}
        ${campaignDetailKpi("Conversion", events.conversion || 0, "client events")}
      </div>
    </section>
  `;
}

function campaignReviewSection(status = {}) {
  const rows = ["draft", "submitted", "approved", "published", "archived"];
  return `
    <section class="campaign-detail-section">
      <div class="campaign-detail-section-head">
        <strong>Review Status</strong>
        <span>Rule governance</span>
      </div>
      <div class="campaign-review-list">
        ${rows.map((key) => `
          <div>
            <span>${escapeHtml(key)}</span>
            <strong>${escapeHtml(formatNumber(status[key] || 0))}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function campaignConflictsSection(conflicts = []) {
  return `
    <section class="campaign-detail-section campaign-detail-wide ${conflicts.length ? "has-conflicts" : ""}">
      <div class="campaign-detail-section-head">
        <strong>Rule Conflicts</strong>
        <span>${escapeHtml(formatNumber(conflicts.length))} cross-surface contradiction${conflicts.length === 1 ? "" : "s"}</span>
      </div>
      <div class="campaign-conflict-list">
        ${conflicts.length ? conflicts.map((conflict) => `
          <div class="campaign-conflict-item">
            <div>
              <strong>${escapeHtml(conflict.summary || "Conflicting eligibility outcomes")}</strong>
              <span>${escapeHtml(conflict.audience || "Same audience conditions")}</span>
            </div>
            <div class="campaign-conflict-sides">
              ${campaignConflictSide(conflict.left)}
              ${campaignConflictSide(conflict.right)}
            </div>
            ${campaignConflictRecommendation(conflict.recommendation)}
          </div>
        `).join("") : `<div class="status-line">No exact cross-surface eligibility conflicts detected.</div>`}
      </div>
    </section>
  `;
}

function campaignConflictSide(side = {}) {
  return `
    <div class="${side.outcome === "eligible" ? "eligible" : "ineligible"}">
      <div>
        <strong>${escapeHtml(side.surface || "-")} · ${escapeHtml(side.outcome || "-")}</strong>
        <span>${escapeHtml(side.rule_name || side.rule_id || "-")}</span>
        <small>${escapeHtml(side.branch_id || "-")} · result ${escapeHtml(side.result || "-")}</small>
      </div>
      <button type="button" data-campaign-nav="${side.rule_type === "experiment" ? "open-experiment" : "open-rule"}" data-object-id="${escapeHtml(side.rule_id || "")}" ${side.rule_id ? "" : "disabled"}>Open rule</button>
    </div>
  `;
}

function campaignConflictRecommendation(items = []) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return `
    <div class="campaign-conflict-recommendation">
      <strong>Recommended resolution</strong>
      ${list.length
        ? `<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        : `<span>Review both rules and align the audience, surface, or result before launch.</span>`}
    </div>
  `;
}

function campaignDependenciesSection(items = []) {
  return `
    <section class="campaign-detail-section campaign-detail-wide">
      <div class="campaign-detail-section-head">
        <strong>Dependencies</strong>
        <span>Rules and experiments using messages</span>
      </div>
      <div class="campaign-dependency-list">
        ${items.length ? items.map((item) => `
          <div class="${item.resolved ? "" : "missing"}">
            <span>${escapeHtml(item.rule_name || item.rule_id)} -> ${escapeHtml(item.message_name || item.message_id)}</span>
            <small>${escapeHtml(item.resolved ? "resolved" : "missing message")}</small>
          </div>
        `).join("") : `<div class="status-line">No message dependencies detected.</div>`}
      </div>
    </section>
  `;
}

function campaignRecentEventsSection(events = []) {
  return `
    <section class="campaign-detail-section campaign-detail-wide">
      <div class="campaign-detail-section-head">
        <strong>Recent Events</strong>
        <span>${escapeHtml(formatNumber(events.length))} latest client events</span>
      </div>
      <div class="campaign-event-list">
        ${events.length ? events.map((event) => `
          <div>
            <span>${escapeHtml(event.occurred_at ? formatTime(event.occurred_at) : "-")}</span>
            <strong>${escapeHtml(event.event_type || "-")}</strong>
            <small>${escapeHtml([event.decision_key, event.object_key, event.surface, event.profile_key].filter(Boolean).join(" · "))}</small>
          </div>
        `).join("") : `<div class="status-line">No client events in this window.</div>`}
      </div>
    </section>
  `;
}

async function handleCampaignNavigation(event) {
  const button = event.target.closest("[data-campaign-nav]");
  if (!button) return;
  const id = button.dataset.objectId;
  try {
    if (button.dataset.campaignNav === "open-rule") {
      switchView("rules");
      await loadRule(id);
      return;
    }
    if (button.dataset.campaignNav === "open-experiment") {
      switchView("experiments");
      await loadExperiments();
      selectedExperimentKey = id;
      renderExperiments();
      experimentDetail?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (button.dataset.campaignNav === "open-message") {
      switchView("messages");
      if (!cachedMessages.length) await loadMessages();
      loadMessage(id, cachedMessages);
      return;
    }
    if (button.dataset.campaignNav === "open-campaign-rules") {
      switchView("rules");
      const input = document.querySelector("#rule-filter-campaign");
      if (input) input.value = id === "Unassigned" ? "" : id;
      renderRuleList();
      return;
    }
    if (button.dataset.campaignNav === "open-campaign-messages") {
      switchView("messages");
      if (!cachedMessages.length) await loadMessages();
      const input = document.querySelector("#message-filter-campaign");
      if (input) input.value = id === "Unassigned" ? "" : id;
      renderMessageList();
    }
  } catch (error) {
    overviewCampaignDetail.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

async function runCampaignBulkAction(campaign, action) {
  try {
    const suffix = action === "duplicate" ? slug(window.prompt("Duplicate suffix", "copy") || "copy") : "";
    const target = action === "move" ? promptCampaignMoveTarget(campaign) : null;
    if (action === "move" && !target) return;
    const preview = await api("/v1/campaigns/actions", {
      method: "POST",
      body: JSON.stringify({ campaign, action, dry_run: true, suffix, ...(target || {}) })
    });
    const summary = preview.summary || {};
    const label = campaignActionLabel(action);
    const targetText = action === "duplicate" ? ` using suffix "${suffix || "copy"}"` : "";
    const moveText = action === "move" ? ` to "${preview.target_campaign || "Unassigned"}"` : "";
    const ok = window.confirm(`${label} ${summary.affected || 0} asset(s) in campaign "${campaign}"${targetText}${moveText}? ${summary.skipped || 0} item(s) will be skipped.`);
    if (!ok) return;
    const note = action === "submit_review" ? window.prompt("Submission comment", `Please review campaign ${campaign}.`) || "" : "";
    const assignedTo = action === "submit_review" ? window.prompt("Assign review to", "") || "" : "";
    const result = await api("/v1/campaigns/actions", {
      method: "POST",
      body: JSON.stringify({ campaign, action, dry_run: false, note, assigned_to: assignedTo, suffix, ...(target || {}) })
    });
    overviewCampaignRollups.innerHTML = `<div class="status-line">Campaign action complete: ${escapeHtml(formatNumber(result.summary?.affected || 0))} affected, ${escapeHtml(formatNumber(result.summary?.skipped || 0))} skipped.</div>`;
    await Promise.all([loadRules(), loadMessages(), loadMetrics()]);
  } catch (error) {
    overviewCampaignRollups.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function promptCampaignMoveTarget(campaign) {
  const currentParts = String(campaign || "").split(" / ");
  const currentCampaign = currentParts[0] === "Unassigned" ? "" : currentParts[0] || "";
  const campaignName = window.prompt("Move to campaign", currentCampaign);
  if (campaignName === null) return null;
  const folderName = window.prompt("Move to folder", currentParts.slice(1).join(" / ") || "");
  if (folderName === null) return null;
  return {
    target_campaign: campaignName.trim(),
    target_folder: folderName.trim()
  };
}

function campaignActionLabel(action) {
  if (action === "submit_review") return "submit for review";
  if (action === "move") return "move";
  return action;
}

function renderChangeLog(changes) {
  if (!overviewChangeLog) return;
  overviewChangeLog.innerHTML = changes.length
    ? changes.map((change) => changeLogItem(change)).join("")
    : `<div class="status-line">No platform changes recorded yet.</div>`;
}

function changeLogItem(change) {
  const label = changeLogLabel(change);
  const campaign = change.campaign || change.metadata?.surface || "";
  return `
    <div class="change-log-item">
      <span>${escapeHtml(label)}</span>
      <div>
        <strong>${escapeHtml(change.object_name || change.object_id || "-")}</strong>
        <small>${escapeHtml(change.object_id || "")}${change.version ? ` · v${escapeHtml(change.version)}` : ""}</small>
      </div>
      <em>${escapeHtml(campaign || "-")}</em>
      <small>${escapeHtml(change.author || "system")} · ${escapeHtml(change.changed_at ? formatTime(change.changed_at) : "-")}</small>
    </div>
  `;
}

function changeLogLabel(change) {
  const labels = {
    experiment_draft_updated: "Experiment draft",
    experiment_published: "Experiment published",
    message_updated: "Message updated",
    reference_data_updated: "Reference data",
    rule_draft_updated: "Rule draft",
    rule_published: "Rule published"
  };
  return labels[change.action] || change.object_type || "Change";
}

async function loadExperiments() {
  if (!experimentList) return;
  try {
    const [body, campaignsBody] = await Promise.all([
      api("/v1/experiments"),
      api("/v1/campaigns?window_hours=168&limit=50").catch(() => ({ campaigns: [] }))
    ]);
    cachedExperiments = body.experiments || [];
    cachedExperimentSummary = body.summary || {};
    cachedCampaigns = campaignsBody.campaigns || cachedCampaigns || [];
    renderExperiments();
  } catch (error) {
    experimentList.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
    if (experimentDetail) experimentDetail.innerHTML = `<div class="status-line">Experiment reporting is unavailable.</div>`;
  }
}

async function exportExperimentsCsv() {
  try {
    const response = await fetch("/v1/experiments?format=csv", {
      headers: { authorization: `Bearer ${tokenInput.value}` }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text);
    downloadTextFile(text, `meiro-dee-experiments-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`, "text/csv");
  } catch (error) {
    if (experimentDetail) experimentDetail.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

async function planAssistantRequest() {
  const output = document.querySelector("#assistant-plan-output");
  const guardrails = document.querySelector("#assistant-guardrails");
  const applyButton = document.querySelector("#assistant-apply");
  const sendButton = document.querySelector("#assistant-plan");
  const handoff = document.querySelector("#assistant-handoff");
  const clarifications = document.querySelector("#assistant-clarifications");
  let pendingMessage = null;
  try {
    applyButton.disabled = true;
    sendButton.disabled = true;
    if (handoff) {
      handoff.hidden = true;
      handoff.innerHTML = "";
    }
    if (clarifications) {
      clarifications.hidden = true;
      clarifications.innerHTML = "";
    }
    const body = {
      prompt: document.querySelector("#assistant-prompt").value.trim(),
      type: document.querySelector("#assistant-type").value || undefined,
      decision_key: document.querySelector("#assistant-decision-key").value.trim() || undefined,
      surface: document.querySelector("#assistant-surface").value.trim() || undefined,
      ttl_seconds: Number(document.querySelector("#assistant-ttl").value || 0),
      history: assistantChatHistory.slice(-10)
    };
    if (!body.prompt) throw new Error("Describe what the assistant should configure.");
    openAssistantPanel();
    appendAssistantMessage("user", body.prompt);
    pendingMessage = appendAssistantMessage("pending", "Thinking", "Working");
    document.querySelector("#assistant-prompt").value = "";
    const response = await api("/v1/assistant/plan", {
      method: "POST",
      body: JSON.stringify(body)
    });
    removeAssistantMessage(pendingMessage);
    pendingMessage = null;
    cachedAssistantPlan = response.plan;
    cachedAssistantRollback = [];
    renderAssistantPlan(cachedAssistantPlan);
    appendAssistantMessage(
      "assistant",
      cachedAssistantPlan.mode === "advice" ? "Recommendations ready" : "Draft plan ready",
      cachedAssistantPlan.answer || cachedAssistantPlan.summary || "Review the generated response."
    );
  } catch (error) {
    removeAssistantMessage(pendingMessage);
    cachedAssistantPlan = null;
    cachedAssistantRollback = [];
    appendAssistantMessage("assistant", "Could not create a plan", error.message);
    if (guardrails) guardrails.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
    if (output) output.textContent = "{}";
    if (handoff) handoff.hidden = true;
    if (clarifications) clarifications.hidden = true;
  } finally {
    sendButton.disabled = false;
  }
}

async function applyAssistantPlan() {
  if (!cachedAssistantPlan) return;
  const applyButton = document.querySelector("#assistant-apply");
  try {
    applyButton.disabled = true;
    const approvedActionIds = selectedAssistantActionIds();
    if (!approvedActionIds.length) throw new Error("Select at least one assistant action to apply.");
    const response = await api("/v1/assistant/apply", {
      method: "POST",
      body: JSON.stringify({ plan: cachedAssistantPlan, approved_action_ids: approvedActionIds })
    });
    cachedAssistantRollback = response.rollback || [];
    const rollbackCoverage = assistantRollbackCoverage(cachedAssistantRollback);
    document.querySelector("#assistant-guardrails").innerHTML = [
      statusItem("Applied", response.applied?.length || 0),
      statusItem("Skipped", response.skipped?.length || 0),
      statusItem("Rollback", rollbackCoverage.total ? `${rollbackCoverage.automated}/${rollbackCoverage.total} automated` : "Manual review"),
      statusItem("Mode", "Draft only"),
      statusItem("Publish", "Manual review required")
    ].join("");
    appendAssistantMessage("assistant", "Draft saved", "I saved the assistant changes as drafts. Use the review buttons before publishing.");
    await Promise.all([loadRules(), loadMessages()]);
    renderAssistantHandoff(cachedAssistantPlan, response.applied || [], { applied: true, rollback: cachedAssistantRollback });
  } catch (error) {
    document.querySelector("#assistant-guardrails").innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
    appendAssistantMessage("assistant", "Could not apply draft", error.message);
    applyButton.disabled = false;
  }
}

async function rollbackAssistantChanges() {
  if (!cachedAssistantRollback.length) return;
  try {
    const response = await api("/v1/assistant/rollback", {
      method: "POST",
      body: JSON.stringify({ rollback: cachedAssistantRollback })
    });
    cachedAssistantRollback = [];
    document.querySelector("#assistant-guardrails").innerHTML = [
      statusItem("Restored", response.restored?.length || 0),
      statusItem("Manual review", response.skipped?.length || 0),
      statusItem("Mode", "Draft rollback")
    ].join("");
    appendAssistantMessage("assistant", "Rollback complete", "I restored the automated rollback items. Any manual-review items are listed in the handoff panel.");
    await Promise.all([loadRules(), loadMessages()]);
    renderAssistantHandoff(cachedAssistantPlan, [], { applied: false });
    document.querySelector("#assistant-apply").disabled = false;
  } catch (error) {
    document.querySelector("#assistant-guardrails").innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
    appendAssistantMessage("assistant", "Could not rollback draft changes", error.message);
  }
}

function selectedAssistantActionIds() {
  return Array.from(document.querySelectorAll("[data-assistant-action-approval]:checked"))
    .map((input) => input.value)
    .filter(Boolean);
}

function handleAssistantApprovalChange(event) {
  if (!event.target.matches("[data-assistant-action-approval]")) return;
  updateAssistantApprovalSummary();
}

function renderAssistantPlan(plan) {
  const guardrails = plan.guardrails || {};
  const governance = plan.governance || {};
  const result = document.querySelector("#assistant-result");
  if (result) result.hidden = false;
  document.querySelector("#assistant-plan-output").textContent = JSON.stringify(plan, null, 2);
  document.querySelector("#assistant-guardrails").innerHTML = [
    statusItem("Status", guardrails.status || "review"),
    statusItem("Planner", plan.provider?.status ? `${plan.provider.mode || "deterministic"} · ${plan.provider.status}` : "deterministic"),
    statusItem("Governance", governance.status ? `${governance.status} · ${governance.risk_level || "low"} risk` : "not reported"),
    statusItem("Actions", plan.actions?.length || 0),
    statusItem("Errors", guardrails.errors?.length || 0),
    statusItem("Warnings", guardrails.warnings?.length || 0),
    renderAssistantGovernance(governance),
    ...(guardrails.errors || []).map((item) => statusItem("Error", item)),
    ...(guardrails.warnings || []).slice(0, 4).map((item) => statusItem("Warning", item))
  ].join("");
  renderAssistantPreview(plan);
  renderAssistantClarifications(plan);
  renderAssistantHandoff(plan, [], { applied: false });
  document.querySelector("#assistant-apply").disabled = plan.mode !== "draft_only" || Boolean(guardrails.errors?.length);
  scrollAssistantConversation();
}

function renderAssistantGovernance(governance = {}) {
  const checks = Array.isArray(governance.checks) ? governance.checks : [];
  if (!checks.length) return "";
  return `
    <div class="assistant-governance-card">
      <div>
        <strong>${escapeHtml(governance.summary || "Governance checks")}</strong>
        <span>${escapeHtml(governance.contract || "draft_only")} · ${escapeHtml(governance.provider_mode || "deterministic")} · ${escapeHtml(assistantProviderPolicyLabel(governance.provider_policy))} · ${escapeHtml(governance.contract_version || "assistant-plan-v2")}</span>
      </div>
      <div class="assistant-governance-checks">
        ${checks.map((item) => `
          <div class="assistant-governance-check ${escapeHtml(item.level || "ok")}">
            <span>${escapeHtml(item.label || item.key || "Check")}</span>
            <strong>${escapeHtml(item.level || "ok")}</strong>
            <small>${escapeHtml(item.detail || "")}</small>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderAssistantPreview(plan) {
  const target = document.querySelector("#assistant-preview");
  if (!target) return;
  if (plan.mode === "advice") {
    const recommendations = Array.isArray(plan.recommendations) ? plan.recommendations : [];
    target.innerHTML = `
      <div class="assistant-advice-card">
        <h4>${escapeHtml(plan.summary || "Assistant recommendations")}</h4>
        <p>${escapeHtml(plan.answer || "Review the recommendations below.")}</p>
        ${Array.isArray(plan.assumptions) && plan.assumptions.length ? `
          <strong>Assumptions</strong>
          <ul>${plan.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        ` : ""}
      </div>
      ${recommendations.map((item) => assistantRecommendationCard(item)).join("")}
      ${Array.isArray(plan.next_steps) && plan.next_steps.length ? `
        <div class="assistant-advice-card">
          <h4>Next steps</h4>
          <ol>${plan.next_steps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
      ` : ""}
    `;
    return;
  }
  const evaluation = plan.preview?.draft_evaluation || {};
  const schema = plan.schema || {};
  const sample = plan.preview?.sample_request || {};
  target.innerHTML = [
    assistantPreviewCard("Draft Preview", [
      ["Result", evaluation.result || "n/a"],
      ["Matched", (evaluation.matched_rules || []).join(", ") || "none"],
      ["Errors", evaluation.errors?.length || 0]
    ]),
    assistantPreviewCard("Schema Check", [
      ["Available", schema.available || 0],
      ["Matched fields", schema.matched_fields?.length || 0],
      ["Missing fields", schema.missing_fields?.length || 0]
    ]),
    assistantPreviewCard("Sample Request", [
      ["Profile", sample.profile_key || "n/a"],
      ["Attributes", Object.keys(sample.attributes || {}).join(", ") || "none"],
      ["Context", Object.keys(sample.context || {}).join(", ") || "none"]
    ])
  ].join("");
}

function assistantRecommendationCard(item = {}) {
  const title = firstAssistantText(item, ["title", "name", "label", "experiment", "experiment_name", "idea", "summary"]) || "Experiment idea";
  const hypothesis = firstAssistantText(item, ["hypothesis", "description", "rationale", "reason", "why", "objective", "goal"]);
  const audience = firstAssistantText(item, ["audience", "target_audience", "target_segment", "segment", "who"]);
  const surface = firstAssistantText(item, ["surface", "placement", "channel", "location", "page"]);
  const primaryMetric = firstAssistantText(item, ["primary_metric", "metric", "success_metric", "kpi", "conversion_metric"]);
  const variants = firstAssistantList(item, ["variants", "variant", "test_variants", "arms", "treatments", "messages"]);
  const guardrails = firstAssistantList(item, ["guardrails", "risks", "constraints", "notes"]);
  const rows = [
    ["Audience", audience],
    ["Surface", surface],
    ["Primary metric", primaryMetric],
    ["Variants", variants.join(" / ")],
    ["Guardrails", guardrails.join(" / ")]
  ].filter(([, value]) => value);
  return `
    <div class="assistant-preview-card assistant-recommendation-card">
      <h4>${escapeHtml(title)}</h4>
      ${hypothesis ? `<p>${escapeHtml(hypothesis)}</p>` : ""}
      ${rows.length ? rows.map(([label, value]) => `
        <div class="assistant-preview-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("") : `<p class="assistant-muted">The provider returned this recommendation without structured details. Ask the assistant to expand this idea or turn it into a draft.</p>`}
    </div>
  `;
}

function firstAssistantText(source = {}, keys = []) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value) && value.length) return value.map(String).join(" / ");
  }
  return "";
}

function firstAssistantList(source = {}, keys = []) {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).filter(Boolean);
    if (typeof value === "string" && value.trim()) return value.split(/\n|;/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function assistantPreviewCard(title, rows) {
  return `
    <div class="assistant-preview-card">
      <h4>${escapeHtml(title)}</h4>
      ${rows.map(([label, value]) => `
        <div class="assistant-preview-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderAssistantClarifications(plan) {
  const target = document.querySelector("#assistant-clarifications");
  if (!target) return;
  const items = plan.clarifications || [];
  if (!items.length) {
    target.hidden = true;
    target.innerHTML = "";
    return;
  }
  target.hidden = false;
  target.innerHTML = `
    <div class="assistant-clarifications-head">
      <strong>Review Assumptions</strong>
      <span>These are non-blocking, but should be confirmed before publishing.</span>
    </div>
    <div class="assistant-clarification-list">
      ${items.map(assistantClarificationRow).join("")}
    </div>
  `;
}

function assistantClarificationRow(item) {
  return `
    <div class="assistant-clarification-row ${escapeHtml(item.priority || "low")}">
      <div>
        <strong>${escapeHtml(item.topic || item.id)}</strong>
        <span>${escapeHtml(item.question || "")}</span>
        <small>Assumed: ${escapeHtml(item.assumed || "-")}</small>
      </div>
      <div class="assistant-clarification-options">
        ${(item.options || []).slice(0, 4).map((option) => `<span>${escapeHtml(option)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderAssistantHandoff(plan, applied = [], options = {}) {
  const target = document.querySelector("#assistant-handoff");
  if (!target) return;
  const actions = plan.actions || [];
  if (!actions.length) {
    target.hidden = true;
    target.innerHTML = "";
    return;
  }
  const appliedByKey = new Map(applied.map((item) => [item.action_key || `${item.action}:${item.id}`, item]));
  const summary = assistantActionSummary(actions, options.rollback || []);
  target.hidden = false;
  target.innerHTML = `
    <div class="assistant-handoff-header">
      <div>
        <strong>${options.applied ? "Drafts ready for review" : "Approve assistant actions"}</strong>
        <span>${options.applied ? "Assistant changes are saved as drafts. Publishing remains a separate review step." : "Choose exactly which draft actions should be saved. Dependencies are shown as separate actions."}</span>
      </div>
      ${options.applied && options.rollback?.length ? `<button type="button" data-assistant-action="rollback-assistant">Rollback Applied Drafts</button>` : ""}
    </div>
    <div class="assistant-handoff-summary" data-assistant-approval-summary>
      ${assistantApprovalSummaryHtml(summary, options)}
    </div>
    <div class="assistant-handoff-list">
      ${actions.map((item) => assistantHandoffRow(item, appliedByKey.get(assistantActionKey(item)), options)).join("")}
    </div>
    ${options.applied && options.rollback?.length ? assistantRollbackDetailHtml(options.rollback) : ""}
  `;
  updateAssistantApprovalSummary();
}

function assistantHandoffRow(action, applied, options = {}) {
  const object = action.object || {};
  const stats = draftPublishStats(object.draft || {});
  const experiment = object.metadata?.experiment;
  const actionKey = assistantActionKey(action);
  const isRuleAction = ["create_rule_draft", "update_rule_draft"].includes(action.action);
  const validation = [
    isRuleAction ? `${stats.branches} branch${stats.branches === 1 ? "" : "es"}` : null,
    isRuleAction ? `${stats.outputs} output${stats.outputs === 1 ? "" : "s"}` : null,
    action.action === "upsert_message" ? `${object.metadata?.template_type || "message"} template` : null,
    object.cache_policy?.client_ttl ? `${object.cache_policy.client_ttl}s TTL` : "No response TTL",
    experiment ? `${experiment.variants?.length || 0} variants` : null
  ].filter(Boolean).join(" · ");
  const actionLabel = assistantActionLabel(action.action);
  return `
    <div class="assistant-handoff-row">
      <div>
        ${options.applied ? "" : `
          <label class="assistant-action-approval">
            <input type="checkbox" data-assistant-action-approval value="${escapeHtml(actionKey)}" checked />
            <span>Approve</span>
          </label>
        `}
        <strong>${escapeHtml(object.name || action.id)}</strong>
        <span>${escapeHtml(actionLabel)} · ${escapeHtml(object.decision_key || action.id)} · ${escapeHtml(validation)}</span>
        ${applied ? `<small>${escapeHtml(applied.status || "draft_saved")}</small>` : ""}
      </div>
      <div class="assistant-handoff-actions">
        ${isRuleAction ? `
          <button type="button" data-assistant-action="open-draft" data-rule-key="${escapeHtml(action.id)}" ${options.applied ? "" : "disabled"}>Review Draft</button>
          <button type="button" data-assistant-action="publish-review" data-rule-key="${escapeHtml(action.id)}" ${options.applied ? "" : "disabled"}>Open Publish Review</button>
        ` : `<span class="assistant-handoff-badge">Dependency</span>`}
      </div>
    </div>
  `;
}

function assistantActionKey(action = {}) {
  return `${action.action || "unknown"}:${action.id || ""}`;
}

function assistantActionLabel(action) {
  if (action === "upsert_message") return "Save message";
  if (action === "update_rule_draft") return "Update rule draft";
  if (action === "create_rule_draft") return "Create rule draft";
  return action || "Action";
}

function assistantActionSummary(actions = [], rollback = []) {
  const ruleActions = actions.filter((item) => ["create_rule_draft", "update_rule_draft"].includes(item.action)).length;
  const dependencies = actions.length - ruleActions;
  const rollbackCoverage = assistantRollbackCoverage(rollback);
  return {
    total: actions.length,
    selected: actions.length,
    ruleActions,
    dependencies,
    rollbackCoverage
  };
}

function assistantRollbackCoverage(rollback = []) {
  const total = rollback.length;
  const manual = rollback.filter((item) => item.action === "manual_review").length;
  return {
    total,
    manual,
    automated: Math.max(0, total - manual)
  };
}

function assistantApprovalSummaryHtml(summary, options = {}) {
  const coverage = summary.rollbackCoverage || { total: 0, automated: 0, manual: 0 };
  const rollbackLabel = coverage.total
    ? `${coverage.automated}/${coverage.total} automated${coverage.manual ? ` · ${coverage.manual} manual` : ""}`
    : options.applied ? "No rollback prepared" : "Prepared after apply";
  return `
    <div>
      <span>Selected</span>
      <strong data-assistant-selected-count>${escapeHtml(String(summary.selected))}</strong>
      <small>of ${escapeHtml(String(summary.total))} actions</small>
    </div>
    <div>
      <span>Rules</span>
      <strong>${escapeHtml(String(summary.ruleActions))}</strong>
      <small>draft action${summary.ruleActions === 1 ? "" : "s"}</small>
    </div>
    <div>
      <span>Dependencies</span>
      <strong>${escapeHtml(String(summary.dependencies))}</strong>
      <small>message/content action${summary.dependencies === 1 ? "" : "s"}</small>
    </div>
    <div>
      <span>Rollback</span>
      <strong>${escapeHtml(rollbackLabel)}</strong>
      <small>publishing remains separate</small>
    </div>
  `;
}

function updateAssistantApprovalSummary() {
  const summary = document.querySelector("[data-assistant-approval-summary]");
  if (!summary) return;
  const checkboxes = Array.from(document.querySelectorAll("[data-assistant-action-approval]"));
  const selected = checkboxes.filter((input) => input.checked).length;
  const selectedTarget = summary.querySelector("[data-assistant-selected-count]");
  if (selectedTarget) selectedTarget.textContent = String(selected);
  const applyButton = document.querySelector("#assistant-apply");
  if (applyButton && checkboxes.length) {
    const guardrails = cachedAssistantPlan?.guardrails || {};
    applyButton.disabled = cachedAssistantPlan?.mode !== "draft_only" || Boolean(guardrails.errors?.length) || selected === 0;
  }
}

function assistantRollbackDetailHtml(rollback = []) {
  const manual = rollback.filter((item) => item.action === "manual_review");
  if (!manual.length) return "";
  return `
    <div class="assistant-rollback-detail">
      <strong>Manual rollback review</strong>
      ${manual.map((item) => `
        <span>${escapeHtml(item.id || "item")} · ${escapeHtml(item.reason || "Manual review required.")}</span>
      `).join("")}
    </div>
  `;
}

async function handleAssistantHandoffAction(event) {
  const button = event.target.closest("[data-assistant-action]");
  if (!button || button.disabled) return;
  if (button.dataset.assistantAction === "rollback-assistant") {
    await rollbackAssistantChanges();
    return;
  }
  const key = button.dataset.ruleKey;
  if (!key) return;
  try {
    switchView("rules");
    await loadRule(key);
    if (button.dataset.assistantAction === "publish-review") {
      await publishSelectedRule();
    }
  } catch (error) {
    document.querySelector("#assistant-guardrails").innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function inventoryPageState(key) {
  if (!inventoryPaging[key]) inventoryPaging[key] = { page: 1, pageSize: 10 };
  return inventoryPaging[key];
}

function paginateInventory(items = [], key, options = {}) {
  const state = inventoryPageState(key);
  if (options.resetPage) state.page = 1;
  const total = items.length;
  const pageSize = Math.max(1, Number(state.pageSize || 10));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  state.page = Math.min(Math.max(1, Number(state.page || 1)), pageCount);
  const start = total ? (state.page - 1) * pageSize : 0;
  const end = total ? Math.min(total, start + pageSize) : 0;
  return {
    items: items.slice(start, end),
    total,
    start,
    end,
    page: state.page,
    pageSize,
    pageCount
  };
}

function inventoryPagerMarkup(key, meta, label = "items") {
  if (!meta || meta.total <= meta.pageSize) return "";
  const from = meta.total ? meta.start + 1 : 0;
  const to = meta.end;
  return `
    <div class="inventory-pager" data-inventory-pager="${escapeHtml(key)}">
      <span>Showing ${formatNumber(from)}-${formatNumber(to)} of ${formatNumber(meta.total)} ${escapeHtml(label)}</span>
      <label>
        <span>Rows</span>
        <select data-page-size="${escapeHtml(key)}">
          ${[5, 10, 20, 50].map((size) => `<option value="${size}" ${meta.pageSize === size ? "selected" : ""}>${size}</option>`).join("")}
        </select>
      </label>
      <div class="inventory-pager-actions">
        <button type="button" data-page-step="${escapeHtml(key)}:-1" ${meta.page <= 1 ? "disabled" : ""}>Prev</button>
        <strong>Page ${formatNumber(meta.page)} / ${formatNumber(meta.pageCount)}</strong>
        <button type="button" data-page-step="${escapeHtml(key)}:1" ${meta.page >= meta.pageCount ? "disabled" : ""}>Next</button>
      </div>
    </div>
  `;
}

function bindInventoryPager(target, key, renderFn) {
  target?.querySelectorAll(`[data-page-step^="${key}:"]`).forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number((button.dataset.pageStep || "").split(":")[1] || 0);
      const state = inventoryPageState(key);
      state.page = Math.max(1, Number(state.page || 1) + step);
      renderFn();
    });
  });
  target?.querySelector(`[data-page-size="${key}"]`)?.addEventListener("change", (event) => {
    const state = inventoryPageState(key);
    state.pageSize = Math.max(1, Number(event.target.value || state.pageSize || 10));
    state.page = 1;
    renderFn();
  });
}

function ensureInventorySelectionPage(items = [], key, selectedValue, valueGetter = (item) => item?.id) {
  if (!selectedValue) return;
  const state = inventoryPageState(key);
  const index = items.findIndex((item) => valueGetter(item) === selectedValue);
  if (index < 0) return;
  state.page = Math.floor(index / Math.max(1, Number(state.pageSize || 10))) + 1;
}

function renderExperiments(options = {}) {
  renderCampaignMasterPanel({ resetPage: options.resetCampaignPage });
  const summary = summarizeExperimentList(experimentFilterBaseExperiments());
  const experiments = campaignFilteredExperiments();
  if (experimentKpis) {
    const activeStatus = experimentFilterStatus?.value || "";
    experimentKpis.innerHTML = experimentStatusFilterChips(summary, activeStatus);
    experimentKpis.querySelectorAll("[data-experiment-status-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!experimentFilterStatus) return;
        experimentFilterStatus.value = button.dataset.experimentStatusFilter || "";
        renderExperiments();
      });
    });
  }
  if (!cachedExperiments.length) {
    experimentList.innerHTML = `<div class="status-line">No experiment rule sets yet. Create a rule set with type Experiment to begin.</div>`;
    experimentDetail.innerHTML = `<div class="status-line">Select an experiment to inspect variants and feedback.</div>`;
    return;
  }
  if (!experiments.length) {
    experimentList.innerHTML = `<div class="status-line">No experiments match the current campaign filter.</div>`;
    experimentDetail.innerHTML = `<div class="status-line">Clear the campaign filter or select another campaign to inspect performance.</div>`;
    return;
  }
  const selected = experiments.find((experiment) => experiment.decision_key === selectedExperimentKey) || experiments[0];
  selectedExperimentKey = selected?.decision_key || null;
  experimentList.innerHTML = experiments.map((experiment, index) => experimentOpsCard(experiment, index, experiment.decision_key === selectedExperimentKey)).join("");
  experimentList.querySelectorAll("[data-experiment-index]").forEach((card) => {
    const select = () => {
      const nextKey = experiments[Number(card.dataset.experimentIndex)]?.decision_key || null;
      if (nextKey !== selectedExperimentKey) activeExperimentTab = "design";
      selectedExperimentKey = nextKey;
      renderExperiments();
    };
    card.addEventListener("click", select);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
  });
  renderExperimentDetail(selected);
}

function campaignFilteredExperiments() {
  const status = experimentFilterStatus?.value || "";
  const sort = experimentSort?.value || "recent";
  return experimentFilterBaseExperiments()
    .filter((experiment) => !status || experimentStatusKey(experiment) === status)
    .sort((left, right) => experimentSortCompare(left, right, sort));
}

function experimentFilterBaseExperiments() {
  const campaign = (selectedCampaignName || document.querySelector("#experiment-filter-campaign")?.value.trim() || "").toLowerCase();
  const search = experimentFilterSearch?.value.trim().toLowerCase() || "";
  return cachedExperiments
    .filter((experiment) => {
      if (selectedCampaignName === "Unassigned") return !campaignForDecisionKey(experiment.decision_key);
      return matchesDecisionCampaign(experiment.decision_key, campaign);
    })
    .filter((experiment) => {
      if (!search) return true;
      return [
        experiment.name,
        experiment.decision_key,
        experiment.surface,
        campaignForDecisionKey(experiment.decision_key)
      ].filter(Boolean).join(" ").toLowerCase().includes(search);
    });
}

function renderCampaignMasterPanel(options = {}) {
  if (!campaignMasterList || !campaignMasterDetail) return;
  const campaigns = filteredCampaignInventory(cachedCampaigns || []);
  if (!campaigns.length) {
    campaignMasterList.innerHTML = `<div class="campaign-empty-state">No campaigns match the current filters.</div>`;
    campaignMasterDetail.innerHTML = `<div class="campaign-empty-state">Clear filters or assign experiments, rules, and messages to a campaign.</div>`;
    return;
  }
  const selected = campaigns.find((item) => (item.campaign || "Unassigned") === selectedCampaignName)
    || (selectedCampaignName ? null : campaigns[0]);
  ensureInventorySelectionPage(campaigns, "campaigns", selectedCampaignName, (item) => item.campaign || "Unassigned");
  const page = paginateInventory(campaigns, "campaigns", { resetPage: options.resetPage });
  campaignMasterList.innerHTML = `
    ${inventoryPagerMarkup("campaigns", page, "campaigns")}
    <div class="campaign-inventory-header">
      <span>Campaign</span>
      <span>Assets</span>
      <span>Traffic</span>
      <span>Health</span>
    </div>
    ${page.items.map((campaign) => campaignMasterCard(campaign, (campaign.campaign || "Unassigned") === (selectedCampaignName || ""))).join("")}
  `;
  bindInventoryPager(campaignMasterList, "campaigns", () => renderCampaignMasterPanel());
  campaignMasterList.querySelectorAll("[data-campaign-select]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCampaignName = button.dataset.campaignSelect || "";
      const campaignInput = document.querySelector("#experiment-filter-campaign");
      if (campaignInput) campaignInput.value = selectedCampaignName === "Unassigned" ? "" : selectedCampaignName;
      selectedExperimentKey = null;
      renderExperiments();
    });
  });
  const detailCampaign = selectedCampaignName
    ? campaigns.find((item) => (item.campaign || "Unassigned") === selectedCampaignName)
    : selected;
  campaignMasterDetail.innerHTML = detailCampaign
    ? campaignWorkbenchDetail(detailCampaign)
    : `<div class="status-line">Select a campaign to inspect its assets, readiness, and performance.</div>`;
  campaignMasterDetail.querySelectorAll("[data-campaign-nav]").forEach((button) => {
    button.addEventListener("click", handleCampaignNavigation);
  });
  campaignMasterDetail.querySelectorAll("[data-campaign-graph-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.campaignGraphDetail || "";
      selectedCampaignGraphKey = selectedCampaignGraphKey === key ? "" : key;
      renderCampaignMasterPanel();
    });
  });
}

function filteredCampaignInventory(campaigns = []) {
  const search = campaignFilterSearch?.value.trim().toLowerCase() || "";
  const sort = campaignSort?.value || "traffic";
  return campaigns
    .filter((campaign) => {
      if (!search) return true;
      const assets = campaign.assets || {};
      const haystack = [
        campaign.campaign || "Unassigned",
        ...(campaign.surfaces || []),
        ...(assets.experiments || []).map((item) => `${item.name || ""} ${item.id || ""}`),
        ...(assets.rules || []).map((item) => `${item.name || ""} ${item.id || ""}`),
        ...(assets.messages || []).map((item) => `${item.name || ""} ${item.id || ""}`)
      ].join(" ").toLowerCase();
      return haystack.includes(search);
    })
    .sort((left, right) => campaignSortCompare(left, right, sort));
}

function campaignSortCompare(left = {}, right = {}, sort = "traffic") {
  if (sort === "name") return String(left.campaign || "Unassigned").localeCompare(String(right.campaign || "Unassigned"));
  if (sort === "conflicts") return Number(right.conflict_count || 0) - Number(left.conflict_count || 0);
  if (sort === "assets") return campaignAssetCount(right) - campaignAssetCount(left);
  if (sort === "recent") return latestCampaignActivity(right) - latestCampaignActivity(left);
  return Number(right.requests || 0) - Number(left.requests || 0);
}

function latestCampaignActivity(campaign = {}) {
  const events = campaign.recent_events || [];
  const times = events.map((event) => Date.parse(event.last_seen_at || event.created_at || event.event_time || "")).filter(Number.isFinite);
  return times.length ? Math.max(...times) : 0;
}

function campaignAssetCount(campaign = {}) {
  return Number(campaign.experiments || 0) + Number(campaign.rules || 0) + Number(campaign.messages || 0);
}

function campaignMasterCard(campaign = {}, selected = false) {
  const name = campaign.campaign || "Unassigned";
  const feedback = campaign.client_events || {};
  const feedbackTotal = Object.values(feedback).reduce((sum, value) => sum + Number(value || 0), 0);
  const conflictCount = Number(campaign.conflict_count || 0);
  const review = campaign.review_status || {};
  const reviewIssues = Number(review.blockers || 0) + Number(review.warnings || 0);
  const healthLabel = conflictCount ? `${formatNumber(conflictCount)} conflict${conflictCount === 1 ? "" : "s"}`
    : reviewIssues ? `${formatNumber(reviewIssues)} review item${reviewIssues === 1 ? "" : "s"}`
      : "Ready";
  const healthTone = conflictCount ? "danger" : reviewIssues ? "warn" : "ok";
  return `
    <button type="button" class="campaign-master-card ${selected ? "selected" : ""}" data-campaign-select="${escapeHtml(name)}">
      <div>
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml((campaign.surfaces || []).join(", ") || "No surfaces")}</span>
      </div>
      <span>${formatNumber(campaignAssetCount(campaign))}</span>
      <span>${formatNumber(campaign.requests || feedbackTotal || 0)}</span>
      <mark class="${healthTone}">${escapeHtml(healthLabel)}</mark>
    </button>
  `;
}

function campaignWorkbenchDetail(campaign = {}) {
  const assets = campaign.assets || {};
  const events = campaign.client_events || {};
  const review = campaign.review_status || {};
  const campaignName = campaign.campaign || "Unassigned";
  const recentAsset = [
    ...(assets.experiments || []).slice(0, 2).map((item) => item.name || item.id),
    ...(assets.rules || []).slice(0, 2).map((item) => item.name || item.id),
    ...(assets.messages || []).slice(0, 2).map((item) => item.name || item.id)
  ].filter(Boolean).slice(0, 4);
  return `
    <div class="campaign-workbench-hero">
      <div>
        <span>Selected campaign</span>
        <h3>${escapeHtml(campaignName)}</h3>
        <p>${escapeHtml((campaign.surfaces || []).join(", ") || "No surfaces configured")}</p>
      </div>
      <div class="campaign-workbench-actions">
        <button type="button" data-campaign-nav="open-campaign-rules" data-object-id="${escapeHtml(campaignName)}">Rules</button>
        <button type="button" data-campaign-nav="open-campaign-messages" data-object-id="${escapeHtml(campaignName)}">Messages</button>
      </div>
    </div>
    <div class="campaign-focus-metrics">
        ${campaignDetailKpi("Requests", campaign.requests || 0, "window")}
        ${campaignDetailKpi("Exposure", events.exposure || 0, "events")}
        ${campaignDetailKpi("Conversion", formatPercent(campaign.conversion_rate || 0), `${formatNumber(events.conversion || 0)} conv`)}
        ${campaignDetailKpi("Conflicts", campaign.conflict_count || 0, (campaign.conflict_count || 0) ? "review" : "clear")}
    </div>
    <div class="campaign-workbench-assets">
      ${campaignCompactAssetSection("Experiments", assets.experiments || [], "experiment")}
      ${campaignCompactAssetSection("Rules", assets.rules || [], "rule")}
      ${campaignCompactAssetSection("Messages", assets.messages || [], "message")}
      <section class="campaign-compact-section">
        <div>
          <strong>Review</strong>
          <span>${formatNumber(Number(review.blockers || 0) + Number(review.warnings || 0))} items</span>
        </div>
        <div class="campaign-review-summary">
          <span>${escapeHtml((campaign.conflict_count || 0) ? "Conflicts need review before launch." : "No cross-surface conflicts detected.")}</span>
          <small>${escapeHtml(recentAsset.join(", ") || "No linked assets yet")}</small>
        </div>
      </section>
    </div>
    ${campaignGraphExperimentsSection(campaign, { compact: true })}
  `;
}

function campaignCompactAssetSection(title, items = [], kind) {
  return `
    <section class="campaign-compact-section">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${formatNumber(items.length)} item${items.length === 1 ? "" : "s"}</span>
      </div>
      <div class="campaign-compact-list">
        ${items.length ? items.slice(0, 5).map((item) => campaignAssetRow(item, kind)).join("") : `<div class="status-line">No ${escapeHtml(title.toLowerCase())} linked.</div>`}
      </div>
    </section>
  `;
}

function summarizeExperimentList(experiments = []) {
  return experiments.reduce((summary, experiment) => {
    const status = experimentStatusKey(experiment);
    summary.total += 1;
    summary[status] = (summary[status] || 0) + 1;
    summary.exposures += Number(experiment.events?.exposure?.count || 0);
    summary.conversions += Number(experiment.events?.conversion?.count || 0);
    return summary;
  }, { total: 0, running: 0, draft: 0, paused: 0, archived: 0, exposures: 0, conversions: 0 });
}

function experimentStatusFilterChips(summary = {}, activeStatus = "") {
  const chips = [
    { key: "", label: "All", value: summary.total || 0, detail: "experiments" },
    { key: "running", label: "Running", value: summary.running || 0, detail: "receiving traffic" },
    { key: "draft", label: "Draft", value: summary.draft || 0, detail: "setup needed" },
    { key: "paused", label: "Paused", value: summary.paused || 0, detail: "not assigning" },
    { key: "archived", label: "Archived", value: summary.archived || 0, detail: "completed" }
  ];
  return chips.map((chip) => {
    const statusFilter = chip.key === "feedback" ? "" : chip.key;
    return `
      <button type="button" class="experiment-status-chip ${activeStatus === statusFilter ? "active" : ""}" data-experiment-status-filter="${escapeHtml(statusFilter)}">
        <strong>${escapeHtml(chip.label)}</strong>
        <span>${formatNumber(chip.value)}</span>
        <small>${escapeHtml(chip.detail)}</small>
      </button>
    `;
  }).join("");
}

function experimentStatusKey(experiment = {}) {
  const status = experiment.experiment_status || experiment.status || "draft";
  if (status === "completed") return "archived";
  return status;
}

function experimentStatusLabel(status = "draft") {
  const normalized = status === "completed" ? "archived" : status;
  return normalized === "archived" ? "Archived" : titleCase(normalized || "draft");
}

function titleCase(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function experimentSortCompare(left, right, sort) {
  if (sort === "name") return String(left.name || left.decision_key || "").localeCompare(String(right.name || right.decision_key || ""));
  if (sort === "status") return experimentStatusKey(left).localeCompare(experimentStatusKey(right));
  if (sort === "feedback") return experimentFeedbackVolume(right) - experimentFeedbackVolume(left);
  if (sort === "performance") return Number(right.winner_lift_vs_baseline || 0) - Number(left.winner_lift_vs_baseline || 0);
  return experimentSortTime(right) - experimentSortTime(left);
}

function experimentFeedbackVolume(experiment = {}) {
  return Number(experiment.events?.exposure?.count || 0)
    + Number(experiment.events?.impression?.count || 0)
    + Number(experiment.events?.conversion?.count || 0);
}

function experimentSortTime(experiment = {}) {
  const time = Date.parse(experiment.updated_at || latestExperimentEventAt(experiment) || "");
  return Number.isFinite(time) ? time : 0;
}

function experimentOpsCard(experiment, index, selected = false) {
  const exposureCount = experiment.events?.exposure?.count || 0;
  const impressionCount = experiment.events?.impression?.count || 0;
  const conversionCount = experiment.events?.conversion?.count || 0;
  const allocationState = Math.round(Number(experiment.allocation_total || 0) * 1000) === 100000 ? "ok" : "warn";
  const campaign = campaignForDecisionKey(experiment.decision_key);
  const mode = experimentMode(experiment);
  const status = experimentStatusKey(experiment);
  const confidence = experimentBestConfidence(experiment);
  const significance = experiment.significant_winner_confidence || confidence;
  const winner = experiment.significant_winner_variant || experiment.winner_variant || "-";
  const isDraft = status === "draft";
  const executions = exposureCount || impressionCount || conversionCount;
  return `
    <div role="button" tabindex="0" class="experiment-ops-card ${selected ? "selected" : ""}" data-experiment-index="${index}">
      <div class="experiment-ops-head">
        <div>
          <strong>${escapeHtml(experiment.name)}</strong>
          <span>${escapeHtml([experiment.decision_key, campaign, mode === "bandit" ? "Adaptive" : "Fixed split"].filter(Boolean).join(" · "))}</span>
        </div>
        <mark class="experiment-status ${escapeHtml(status)}">${escapeHtml(experimentStatusLabel(status))}</mark>
      </div>
      <div class="experiment-ops-meta">
        <span>v${escapeHtml(experiment.version || "-")}</span>
        <span>${escapeHtml(experiment.assignment_unit || "profile")} assignment</span>
        <span class="${mode === "bandit" ? "adaptive" : ""}">${escapeHtml(mode === "bandit" ? "adaptive bandit" : "fixed split")}</span>
        <span class="${allocationState}">${formatNumber(experiment.allocation_total || 0)}% allocation</span>
        ${campaign ? `<span>${escapeHtml(campaign)}</span>` : ""}
      </div>
      <div class="experiment-ops-bars">
        ${experiment.variants.map((variant) => variantAllocationBar(variant)).join("")}
      </div>
      ${isDraft ? experimentDraftCardState(experiment, allocationState) : `
        <div class="experiment-card-metrics">
          ${experimentCardMetric("Confidence", confidence ? formatPercent(confidence) : "-")}
          ${experimentCardMetric("Significance", significance ? formatPercent(significance) : "-")}
          ${experimentCardMetric("Executions", formatNumber(executions))}
          ${experimentCardMetric("Lift", formatLift(experiment.winner_lift_vs_baseline))}
          ${experimentCardMetric("Winner", winner, "winner")}
        </div>
      `}
    </div>
  `;
}

function experimentCardMetric(label, value, tone = "") {
  return `
    <div class="experiment-card-metric ${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function experimentDraftCardState(experiment, allocationState) {
  const setup = [
    { label: "Variants", ok: (experiment.variants || []).length >= 2 },
    { label: "Allocation", ok: allocationState === "ok" },
    { label: "Goal", ok: Boolean(experiment.goal?.event || ruleMetadataForDecision(experiment.decision_key)?.experiment?.goal?.event) },
    { label: "Surface", ok: Boolean(experiment.surface) }
  ];
  const done = setup.filter((item) => item.ok).length;
  return `
    <div class="experiment-draft-card-state">
      <div>
        <strong>Setup ${done}/${setup.length}</strong>
        <span>Configure design, targeting, and goal before launch.</span>
      </div>
      <span class="configure-cue">Configure</span>
    </div>
    <div class="experiment-draft-checks">
      ${setup.map((item) => `<span class="${item.ok ? "ok" : "warn"}">${escapeHtml(item.label)}</span>`).join("")}
    </div>
  `;
}

function experimentBestConfidence(experiment = {}) {
  return Math.max(0, ...(experiment.variants || []).map((variant) => Number(variant.significance?.confidence || 0)));
}

function variantAllocationBar(variant) {
  const width = Math.max(0, Math.min(100, Number(variant.weight || 0)));
  return `
    <div class="variant-allocation-row">
      <span>${escapeHtml(variant.key || "(empty)")}</span>
      <div><em style="width: ${width}%"></em></div>
      <strong>${formatNumber(width)}%</strong>
    </div>
  `;
}

function renderExperimentDetail(experiment) {
  if (!experimentDetail) return;
  if (!experiment) {
    experimentDetail.innerHTML = `<div class="status-line">Select an experiment to inspect variants and feedback.</div>`;
    return;
  }
  const campaign = campaignForDecisionKey(experiment.decision_key) || "Unassigned";
  const tabs = [
    { key: "design", label: "Design" },
    { key: "settings", label: "Settings" },
    { key: "results", label: "Results" }
  ];
  if (!tabs.some((tab) => tab.key === activeExperimentTab)) activeExperimentTab = "design";
  experimentDetail.innerHTML = `
    <div class="experiment-workbench-head">
      <div>
        <div class="experiment-breadcrumb">Campaigns &rsaquo; ${escapeHtml(cleanCampaignBreadcrumb(campaign))}</div>
        <h3>${escapeHtml(experiment.name || experiment.decision_key)}</h3>
        <p>${escapeHtml([experiment.decision_key, experiment.surface || "No surface"].filter(Boolean).join(" · "))}</p>
      </div>
      <div class="experiment-workbench-actions">
        <mark class="experiment-status ${escapeHtml(experimentStatusKey(experiment))}">${escapeHtml(experimentStatusLabel(experimentStatusKey(experiment)))}</mark>
        <button type="button" data-experiment-action="open-evaluate" data-rule-key="${escapeHtml(experiment.decision_key)}">Open in Evaluate</button>
      </div>
    </div>
    ${experimentReadinessPanel(experiment)}
    <div class="experiment-workbench-tabs" role="tablist">
      ${tabs.map((tab) => `<button type="button" role="tab" class="${activeExperimentTab === tab.key ? "active" : ""}" data-experiment-tab="${tab.key}">${escapeHtml(tab.label)}</button>`).join("")}
    </div>
    <div class="experiment-workbench-body">
      ${experimentTabContent(experiment, activeExperimentTab)}
    </div>
  `;
  experimentDetail.querySelectorAll("[data-experiment-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeExperimentTab = button.dataset.experimentTab || "results";
      renderExperimentDetail(experiment);
    });
  });
  bindExperimentDetailActions(experiment);
  if (activeExperimentTab === "design") loadExperimentVisualDiff(experiment.decision_key);
}

function experimentTabContent(experiment, tab) {
  if (tab === "design") return experimentDesignTab(experiment);
  if (tab === "settings") return experimentSettingsTab(experiment);
  return experimentResultsTab(experiment);
}

function cleanCampaignBreadcrumb(campaign) {
  return String(campaign || "Unassigned").split("/").map((part) => part.trim()).filter(Boolean).join(" \u203a ");
}

function experimentDesignTab(experiment) {
  const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
  const defaultEditableVariant = variants.find((variant) => !variant.baseline && variant.key !== "control")?.key || "";
  return `
    <section class="experiment-tab-panel">
      <div class="experiment-tab-intro">
        <div>
          <strong>Design</strong>
          <span>Variants, content payloads, and SDK rendering contracts for this experiment.</span>
        </div>
        <div class="experiment-tab-actions">
          <button type="button" data-experiment-action="open-visual-editor" data-rule-key="${escapeHtml(experiment.decision_key)}">Open Visual Editor</button>
          <button type="button" data-experiment-action="create-preview-link" data-rule-key="${escapeHtml(experiment.decision_key)}">Create Preview Link</button>
          <button type="button" data-experiment-action="focus-visual-import" data-rule-key="${escapeHtml(experiment.decision_key)}">Import Visual Payload</button>
          <button type="button" data-experiment-action="open-editor" data-editor-section="design" data-rule-key="${escapeHtml(experiment.decision_key)}">Edit Design</button>
        </div>
      </div>
      <div class="experiment-design-grid">
        ${variants.length ? variants.map((variant) => `
          <article class="experiment-design-card">
            <div>
              <strong>${escapeHtml(variant.key || "(empty)")}</strong>
              <mark>${formatNumber(variant.weight || 0)}%</mark>
            </div>
            <p class="experiment-variant-summary">${escapeHtml(experimentVariantDesignSummary(variant, experiment))}</p>
            <dl>
              <div><dt>Baseline</dt><dd>${escapeHtml(variant.baseline ? "Yes" : "No")}</dd></div>
              <div><dt>Template</dt><dd>${escapeHtml(variant.outputs?.template || experiment.outputs?.template || "-")}</dd></div>
              <div><dt>Outputs</dt><dd>${formatNumber(Object.keys(variant.outputs || {}).length)}</dd></div>
              <div><dt>DOM mods</dt><dd>${formatNumber((variant.outputs?.modifications || variant.outputs?.dom_modifications || []).length)}</dd></div>
            </dl>
            <details class="experiment-payload-drawer">
              <summary>Show payload</summary>
              <pre>${escapeHtml(compactJson(variant.outputs || {}, 1200))}</pre>
            </details>
          </article>
        `).join("") : `<div class="status-line">No variants configured.</div>`}
      </div>
      <div class="experiment-visual-session-note">
        <strong>Visual editor session</strong>
        <span>Open Visual Editor launches the website with a short-lived editor token. The overlay can save DOM changes directly to the selected draft treatment variant; publish and review still happen here in DEE.</span>
      </div>
      <div class="experiment-preview-link-panel" data-experiment-preview-link>
        <strong>Reviewer preview</strong>
        <span>Create a short-lived read-only link that opens the website with a forced draft treatment variant. It does not publish, save draft changes, or alter live allocation.</span>
      </div>
      <div class="experiment-visual-diff" data-experiment-visual-diff="${escapeHtml(experiment.decision_key)}">
        <div class="status-line">Loading draft visual change summary...</div>
      </div>
      <details class="experiment-visual-import-panel" data-visual-import-panel>
        <summary>Import visual editor payload</summary>
        <div class="experiment-visual-import-grid">
          <label>
            Target variant
            <select data-visual-import-variant>
              ${variants.map((variant) => `
                <option value="${escapeHtml(variant.key || "")}" ${variant.key === defaultEditableVariant ? "selected" : ""} ${variant.baseline || variant.key === "control" ? "disabled" : ""}>${escapeHtml(variant.key || "(empty)")}${variant.baseline || variant.key === "control" ? " (control)" : ""}</option>
              `).join("")}
            </select>
          </label>
          <div class="experiment-visual-import-help">
            Paste the JSON copied from the mock-site visual editor. DEE updates only the selected draft variant outputs; publishing still happens through the normal review flow.
          </div>
        </div>
        <textarea data-visual-import-json spellcheck="false" placeholder='{"variant":"treatment","outputs":{"template":"dom_modifications","modifications":[]}}'></textarea>
        <div data-visual-import-review class="experiment-visual-import-review">
          ${visualImportEmptyReview()}
        </div>
        <div class="experiment-tab-actions">
          <button type="button" data-experiment-action="apply-visual-payload" data-rule-key="${escapeHtml(experiment.decision_key)}">Apply to Draft Variant</button>
          <span data-visual-import-status>Waiting for copied visual editor JSON.</span>
        </div>
      </details>
      <details class="experiment-snippet-panel">
        <summary>Website rendering contract</summary>
        <div class="experiment-snippet-guidance">
          <span>The SDK reads the decision payload and applies variant outputs, DOM modifications, or message templates at the configured placement.</span>
          <button type="button" data-experiment-action="copy-snippet" data-rule-key="${escapeHtml(experiment.decision_key)}">Copy Snippet</button>
        </div>
        <pre class="experiment-snippet-code">${escapeHtml(experimentWebsiteSnippet(experiment))}</pre>
      </details>
    </section>
  `;
}

function experimentVariantDesignSummary(variant = {}, experiment = {}) {
  const outputs = variant.outputs || {};
  const template = outputs.template || experiment.outputs?.template || "default";
  const modifications = outputs.modifications || outputs.dom_modifications || [];
  if (variant.baseline || variant.key === "control") return "Control keeps the website fallback unless explicit output overrides are configured.";
  if (template === "dom_modifications") {
    return modifications.length
      ? `${modifications.length} selector-based page change${modifications.length === 1 ? "" : "s"} configured.`
      : "No visual page changes configured yet.";
  }
  if (template === "web_layer" || template === "html_fragment" || template === "inpage") return "Renders a guarded in-page web layer or HTML fragment.";
  if (Array.isArray(outputs.cards)) return `${outputs.cards.length} card${outputs.cards.length === 1 ? "" : "s"} returned for this variant.`;
  if (outputs.message_id) return `References message ${outputs.message_id}.`;
  return Object.keys(outputs).length ? `${Object.keys(outputs).length} output field${Object.keys(outputs).length === 1 ? "" : "s"} configured.` : "No output payload configured yet.";
}

async function loadExperimentVisualDiff(decisionKey) {
  const target = [...experimentDetail.querySelectorAll("[data-experiment-visual-diff]")]
    .find((node) => node.dataset.experimentVisualDiff === decisionKey);
  if (!target) return;
  try {
    const body = await api(`/v1/rule-sets/${encodeURIComponent(decisionKey)}/visual-diff`);
    target.innerHTML = renderExperimentVisualDiff(body);
  } catch (error) {
    target.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function renderExperimentVisualDiff(diff = {}) {
  const variants = Array.isArray(diff.variants) ? diff.variants : [];
  const changed = variants.filter((variant) => variant.added || variant.changed || variant.removed);
  const rows = (changed.length ? changed : variants).slice(0, 6);
  return `
    <div class="experiment-visual-diff-head">
      <div>
        <strong>Draft visual changes</strong>
        <span>${escapeHtml(diff.published_version ? `Compared with published v${diff.published_version}` : "No published visual baseline yet")}</span>
      </div>
      <div class="experiment-visual-diff-kpis">
        ${statusItem("Variants", formatNumber(diff.summary?.changed_variants || 0))}
        ${statusItem("Added", formatNumber(diff.summary?.added || 0))}
        ${statusItem("Changed", formatNumber(diff.summary?.changed || 0))}
        ${statusItem("Removed", formatNumber(diff.summary?.removed || 0))}
        ${statusItem("Warnings", formatNumber(diff.summary?.warnings || 0))}
      </div>
    </div>
    <div class="experiment-visual-diff-list">
      ${rows.length ? rows.map(visualDiffVariantRow).join("") : `<div class="status-line">No visual variants configured.</div>`}
    </div>
  `;
}

function visualDiffVariantRow(variant = {}) {
  const total = Number(variant.added || 0) + Number(variant.changed || 0) + Number(variant.removed || 0);
  const changes = Array.isArray(variant.changes) ? variant.changes : [];
  const warningCount = Number(variant.warnings || 0);
  return `
    <article class="experiment-visual-diff-row ${total ? "changed" : ""} ${warningCount ? "has-warnings" : ""}">
      <div>
        <strong>${escapeHtml(variant.variant_key || "(empty)")}</strong>
        <span>${escapeHtml(variant.baseline ? "Control/baseline" : `${formatNumber(variant.before_count || 0)} published -> ${formatNumber(variant.after_count || 0)} draft mods`)}</span>
        ${warningCount ? `<small>${formatNumber(warningCount)} selector warning${warningCount === 1 ? "" : "s"}</small>` : ""}
      </div>
      <div class="experiment-visual-diff-counts">
        <mark>+${formatNumber(variant.added || 0)}</mark>
        <mark>~${formatNumber(variant.changed || 0)}</mark>
        <mark>-${formatNumber(variant.removed || 0)}</mark>
      </div>
      ${changes.length ? `<ul>${changes.slice(0, 4).map((item) => `
        <li>
          <code>${escapeHtml(item.change)}</code>
          <span>
            ${escapeHtml([item.type, item.selector || item.target_selector, item.field].filter(Boolean).join(" · ") || item.key || "-")}
            ${Array.isArray(item.warnings) && item.warnings.length ? `<em>${item.warnings.map(escapeHtml).join(" · ")}</em>` : ""}
          </span>
        </li>
      `).join("")}</ul>` : `<small>No draft visual changes for this variant.</small>`}
    </article>
  `;
}

function experimentSettingsTab(experiment) {
  const metadata = ruleMetadataForDecision(experiment.decision_key) || {};
  const metadataExperiment = metadata.experiment || {};
  const delivery = experiment.delivery || metadataExperiment.delivery || {};
  const targeting = delivery.targeting || experiment.targeting || metadataExperiment.targeting || {};
  const display = delivery.display || experiment.display || metadataExperiment.display || {};
  const trigger = delivery.trigger || experiment.trigger || metadataExperiment.trigger || {};
  const goal = delivery.goal || experiment.goal || metadataExperiment.goal || {};
  const consent = delivery.consent || experiment.consent || metadataExperiment.consent || {};
  const schedule = experiment.schedule || metadataExperiment.schedule || {};
  return `
    <section class="experiment-tab-panel">
      <div class="experiment-tab-intro">
        <div>
          <strong>Settings</strong>
          <span>Audience, trigger, placement, schedule, consent, display frequency, and conversion goal.</span>
        </div>
        <button type="button" data-experiment-action="open-editor" data-editor-section="settings" data-rule-key="${escapeHtml(experiment.decision_key)}">Edit Settings</button>
      </div>
      <div class="experiment-settings-list">
        ${experimentSettingRow("Trigger", trigger.type || "page_load", trigger.event ? `Event: ${trigger.event}` : "Default website SDK trigger")}
        ${experimentSettingRow("Conversion goal", goal.event || "conversion", goal.type ? `Type: ${goal.type}` : "Used for reporting and winner guidance")}
        ${experimentSettingRow("Schedule", schedule.starts_at || schedule.ends_at ? `${schedule.starts_at || "Now"} - ${schedule.ends_at || "manual stop"}` : "Display immediately, stop manually", `${formatNumber(schedule.daily_eligible_profiles || 0)} daily eligible estimate`)}
        ${experimentSettingRow("Show on", urlRulesLabel(targeting.url_rules), "URL targeting")}
        ${experimentSettingRow("Page variables", arrayLabel(targeting.page_variables), "Enhanced web targeting")}
        ${experimentSettingRow("JavaScript conditions", arrayLabel(targeting.sdk_conditions), "Named SDK conditions")}
        ${experimentSettingRow("Target devices", arrayLabel(targeting.devices) || "Any device", "Device targeting")}
        ${experimentSettingRow("Display", display.mode || "always", display.reset_on_version_change ? "Resets on version change" : "Persistent assignment")}
        ${experimentSettingRow("Consent category", consent.category || "-", consent.required ? "Required" : "Not required")}
        ${experimentSettingRow("Audience", experiment.assignment_unit || "profile", `${experimentMode(experiment) === "bandit" ? "Adaptive bandit" : "Fixed split"} assignment`)}
      </div>
    </section>
  `;
}

function experimentEvaluateTab(experiment) {
  const sampleRequest = experimentSampleEvaluateRequest(experiment);
  return `
    <section class="experiment-tab-panel">
      <div class="experiment-tab-intro">
        <div>
          <strong>Evaluate</strong>
          <span>Use the Evaluate workspace to force variants, test payloads, and inspect eligibility reasons.</span>
        </div>
        <button type="button" data-experiment-action="open-evaluate" data-rule-key="${escapeHtml(experiment.decision_key)}">Open Evaluate</button>
      </div>
      <div class="experiment-evaluate-grid">
        ${statusItem("Decision key", experiment.decision_key || "-")}
        ${statusItem("Surface", experiment.surface || "-")}
        ${statusItem("Assignment", experiment.assignment_unit || "profile")}
        ${statusItem("Variants", formatNumber(experiment.variants?.length || 0))}
      </div>
      <div class="experiment-detail-actions">
        <button type="button" data-experiment-action="open-evaluate" data-rule-key="${escapeHtml(experiment.decision_key)}">Open in Evaluate</button>
        <button type="button" data-experiment-action="copy-snippet" data-rule-key="${escapeHtml(experiment.decision_key)}">Copy Website Snippet</button>
        <span>Evaluate with published or draft mode, then compare the response payload with SDK rendering behavior.</span>
      </div>
      <details class="experiment-snippet-panel" open>
        <summary>Sample request payload</summary>
        <pre class="experiment-snippet-code">${escapeHtml(JSON.stringify(sampleRequest, null, 2))}</pre>
      </details>
      <details class="experiment-snippet-panel" open>
        <summary>Website install snippet</summary>
        <pre class="experiment-snippet-code">${escapeHtml(experimentWebsiteSnippet(experiment))}</pre>
      </details>
    </section>
  `;
}

function experimentResultsTab(experiment) {
  const warnings = experimentOpsWarnings(experiment);
  const recommendation = experiment.winner_recommendation || {};
  const winnerKey = recommendation.eligible ? recommendation.variant_key : "";
  const mode = experimentMode(experiment);
  return `
    <div class="experiment-tab-intro">
      <div>
        <strong>Results</strong>
        <span>Variant performance, winner guidance, guardrails, and feedback depth.</span>
      </div>
      <button type="button" data-experiment-action="open-editor" data-editor-section="operations" data-rule-key="${escapeHtml(experiment.decision_key)}">Open Draft</button>
    </div>
    <div class="experiment-detail-table">
      <div class="experiment-detail-table-header">
        <span>Variant Name</span>
        <span>Status</span>
        <span>Rank</span>
        <span>Placement</span>
        <span>Campaign</span>
        <span>Assignment</span>
        <span>Mode</span>
        <span>Baseline</span>
        <span>Winner</span>
        <span>Significance</span>
      </div>
      ${experiment.variants.length ? experiment.variants.map((variant, index) => experimentTopVariantRow(experiment, variant, index, mode)).join("") : `<div class="status-line">No variants configured.</div>`}
    </div>
    <div class="experiment-detail-info-row">
      ${statusItem("Last updated", experiment.updated_at ? formatTime(experiment.updated_at) : "-")}
      <div class="significance-methodology">
        <strong>How significance is calculated</strong>
        <span>DEE compares each non-baseline variant against the baseline with a two-sided z-test for conversion-rate difference. The confidence label is 1 - p-value; "95% significant" requires at least 95% confidence and the minimum exposure guardrail.</span>
      </div>
    </div>
    ${experimentGoalReportPanel(experiment)}
    ${experimentAssignmentDetail(experiment, mode)}
    ${experimentWinnerAutomationPanel(experiment)}
    <div class="experiment-detail-actions">
      <button type="button" data-experiment-action="declare-winner" data-rule-key="${escapeHtml(experiment.decision_key)}" data-winner-key="${escapeHtml(winnerKey)}" ${winnerKey ? "" : "disabled"}>Declare Winner</button>
      <button type="button" data-experiment-action="copy-snippet" data-rule-key="${escapeHtml(experiment.decision_key)}">Copy Website Snippet</button>
      <span>${escapeHtml(recommendation.message || "No winner recommendation available yet.")}</span>
    </div>
    <details class="experiment-snippet-panel">
      <summary>Website install snippet</summary>
      <div class="experiment-snippet-guidance">
        <span>Create a client token scoped to this decision, paste it below, and place the marker where the experiment should render.</span>
        <button type="button" data-experiment-action="copy-snippet" data-rule-key="${escapeHtml(experiment.decision_key)}">Copy</button>
      </div>
      <pre class="experiment-snippet-code">${escapeHtml(experimentWebsiteSnippet(experiment))}</pre>
    </details>
    ${warnings.length ? `<div class="experiment-warning-list">${warnings.map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>` : ""}
    <section class="experiment-depth-panel">
      <div class="experiment-depth-head">
        <strong>Variant result in depth</strong>
        <span>${escapeHtml(experiment.status === "published" ? "Live client feedback" : "Draft or sample data; verify before launch.")}</span>
      </div>
      <div class="experiment-variant-table">
        <div class="experiment-variant-header">
          <span>Variant</span>
          <span>Weight</span>
          <span>Exposures</span>
          <span>Conversions</span>
          <span>Conv. rate</span>
          <span>Lift</span>
          <span>Confidence</span>
          <span>Impressions</span>
          <span>Last event</span>
        </div>
        ${experiment.variants.length ? experiment.variants.map((variant) => experimentVariantRow(variant)).join("") : `<div class="status-line">No variants configured.</div>`}
      </div>
    </section>
  `;
}

function experimentGoalReportPanel(experiment = {}) {
  const report = experiment.goal_report || {};
  const rows = Array.isArray(report.by_variant) ? report.by_variant : [];
  const valueLabel = report.value_field ? `Value from ${report.value_field}` : "No value field";
  const windowLabel = report.attribution_window_hours ? `${formatNumber(report.attribution_window_hours)}h attribution` : "All conversion events";
  return `
    <section class="experiment-depth-panel experiment-goal-report">
      <div class="experiment-depth-head">
        <div>
          <strong>Conversion goal report</strong>
          <span>${escapeHtml([report.event || "conversion", report.type || "conversion", windowLabel, valueLabel].filter(Boolean).join(" · "))}</span>
        </div>
      </div>
      <div class="experiment-goal-kpis">
        ${statusItem("Goal conversions", formatNumber(report.count || 0))}
        ${statusItem("Unique profiles", formatNumber(report.unique_profiles || 0))}
        ${statusItem("Attributed value", formatGoalValue(report.value_sum || 0))}
        ${statusItem("Attribution window", report.attribution_window_hours ? `${formatNumber(report.attribution_window_hours)}h` : "None")}
      </div>
      <div class="experiment-goal-table">
        <div class="experiment-goal-header">
          <span>Variant</span>
          <span>Goal conv.</span>
          <span>Goal rate</span>
          <span>Value</span>
          <span>Last goal</span>
        </div>
        ${rows.length ? rows.map((row) => `
          <div class="experiment-goal-row">
            <strong>${escapeHtml(row.key || "(empty)")}</strong>
            <span>${escapeHtml(`${formatNumber(row.count || 0)} / ${formatNumber(row.unique_profiles || 0)} profiles`)}</span>
            <span>${escapeHtml(formatPercent(row.conversion_rate || 0))}</span>
            <span>${escapeHtml(formatGoalValue(row.value_sum || 0))}</span>
            <span>${escapeHtml(row.last_seen_at ? formatTime(row.last_seen_at) : "-")}</span>
          </div>
        `).join("") : `<div class="status-line">No goal conversions recorded yet.</div>`}
      </div>
    </section>
  `;
}

function formatGoalValue(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function bindExperimentDetailActions(experiment) {
  experimentDetail.querySelector('[data-experiment-action="declare-winner"]')?.addEventListener("click", declareExperimentWinner);
  experimentDetail.querySelectorAll('[data-experiment-action="copy-snippet"]').forEach((button) => {
    button.addEventListener("click", () => copyExperimentSnippet(experiment));
  });
  experimentDetail.querySelector('[data-experiment-action="open-evaluate"]')?.addEventListener("click", () => openExperimentInEvaluate(experiment));
  experimentDetail.querySelector('[data-experiment-action="open-visual-editor"]')?.addEventListener("click", () => openExperimentVisualEditor(experiment));
  experimentDetail.querySelector('[data-experiment-action="create-preview-link"]')?.addEventListener("click", () => createExperimentPreviewLink(experiment));
  experimentDetail.querySelector('[data-experiment-action="focus-readiness"]')?.addEventListener("click", (event) => {
    activeExperimentTab = event.currentTarget.dataset.targetTab || "settings";
    renderExperimentDetail(experiment);
  });
  experimentDetail.querySelector('[data-experiment-action="focus-visual-import"]')?.addEventListener("click", () => focusVisualPayloadImport());
  experimentDetail.querySelector('[data-experiment-action="apply-visual-payload"]')?.addEventListener("click", () => applyVisualEditorPayload(experiment));
  experimentDetail.querySelector("[data-visual-import-json]")?.addEventListener("input", (event) => {
    renderVisualImportReview(event.target.closest("[data-visual-import-panel]"));
  });
  experimentDetail.querySelector("[data-visual-import-variant]")?.addEventListener("change", (event) => {
    renderVisualImportReview(event.target.closest("[data-visual-import-panel]"));
  });
  experimentDetail.querySelectorAll('[data-experiment-action="open-editor"]').forEach((button) => {
    button.addEventListener("click", () => openExperimentInRuleEditor(experiment, button.dataset.editorSection || "operations"));
  });
}

function focusVisualPayloadImport() {
  const panel = experimentDetail?.querySelector("[data-visual-import-panel]");
  if (!panel) return;
  panel.open = true;
  panel.scrollIntoView({ behavior: "smooth", block: "center" });
  renderVisualImportReview(panel);
  panel.querySelector("[data-visual-import-json]")?.focus();
}

function renderVisualImportReview(panel) {
  const review = panel?.querySelector("[data-visual-import-review]");
  if (!review) return;
  const text = panel.querySelector("[data-visual-import-json]")?.value || "";
  const selectedVariant = panel.querySelector("[data-visual-import-variant]")?.value || "";
  if (!text.trim()) {
    review.innerHTML = visualImportEmptyReview();
    return;
  }
  try {
    const imported = parseVisualEditorPayload(text, { strict: false });
    review.innerHTML = visualImportReviewHtml(imported, selectedVariant || imported.variant);
  } catch (error) {
    review.innerHTML = `
      <div class="visual-import-review-error">
        <strong>Cannot read payload</strong>
        <span>${escapeHtml(error.message)}</span>
      </div>
    `;
  }
}

function visualImportEmptyReview() {
  return `
    <div class="visual-import-empty">
      <strong>No payload loaded</strong>
      <span>Open the visual editor, copy its structured JSON, and paste it here to review selector changes before saving to the draft.</span>
    </div>
  `;
}

function visualImportReviewHtml(imported, selectedVariant) {
  const modifications = imported.outputs.modifications || [];
  const quality = domModificationQuality(modifications);
  const targetVariant = selectedVariant || imported.variant || "Choose target";
  return `
    <div class="visual-import-review-head ${quality.invalid ? "error" : quality.warnings ? "warn" : "ok"}">
      <div>
        <strong>Payload review</strong>
        <span>Target variant: ${escapeHtml(targetVariant)}</span>
      </div>
      <div class="visual-import-review-kpis">
        ${visualImportKpi("Changes", quality.total)}
        ${visualImportKpi("Ready", quality.ready)}
        ${visualImportKpi("Warnings", quality.warnings)}
        ${visualImportKpi("Invalid", quality.invalid)}
      </div>
    </div>
    <div class="visual-import-review-list">
      ${modifications.length ? modifications.map((modification, index) => visualImportModificationRow(modification, index)).join("") : `<div class="visual-import-empty"><strong>No changes</strong><span>The payload is valid but contains no DOM modifications.</span></div>`}
    </div>
  `;
}

function visualImportKpi(label, value) {
  return `<span><strong>${escapeHtml(formatNumber(value || 0))}</strong><small> ${escapeHtml(label)}</small></span>`;
}

function visualImportModificationRow(modification = {}, index = 0) {
  const warning = domModificationRowWarning(modification);
  const invalid = warning && /missing selector|syntax looks invalid|unsupported action type|attribute name may be unsafe|styles must be valid json/i.test(warning);
  const tone = invalid ? "error" : warning ? "warn" : "ok";
  const selector = modification.selector || modification.source_selector || modification.sourceSelector || "-";
  const targetSelector = modification.target_selector || modification.targetSelector || modification.target || "";
  const scope = modification.scope || {};
  const scopeLabel = [
    scope.url_rules?.length ? `${scope.url_rules.length} URL rule${scope.url_rules.length === 1 ? "" : "s"}` : "",
    scope.devices?.length ? `Devices: ${scope.devices.join(", ")}` : ""
  ].filter(Boolean).join(" · ") || "No page/device scope";
  return `
    <article class="visual-import-review-row ${tone}">
      <div>
        <strong>${escapeHtml(index + 1)}. ${escapeHtml(domModificationTypeLabel(modification.type || "change_text"))}</strong>
        <span>${escapeHtml(domModificationSummary(modification))}</span>
      </div>
      <code>${escapeHtml(selector)}</code>
      <small>${escapeHtml(targetSelector ? `Target: ${targetSelector} · ${scopeLabel}` : scopeLabel)}</small>
      <mark>${escapeHtml(warning || "Ready")}</mark>
    </article>
  `;
}

async function applyVisualEditorPayload(experiment) {
  const panel = experimentDetail?.querySelector("[data-visual-import-panel]");
  const status = panel?.querySelector("[data-visual-import-status]");
  try {
    if (!panel) throw new Error("Visual import panel is not available.");
    const imported = parseVisualEditorPayload(panel.querySelector("[data-visual-import-json]")?.value || "");
    const selectedVariant = panel.querySelector("[data-visual-import-variant]")?.value || imported.variant;
    if (!selectedVariant) throw new Error("Choose a treatment variant before applying the payload.");
    if (selectedVariant === "control") throw new Error("Control variants cannot be edited by visual payload import.");
    const body = await api(`/v1/rule-sets/${encodeURIComponent(experiment.decision_key)}`);
    const ruleSet = body.rule_set || {};
    const metadata = JSON.parse(JSON.stringify(ruleSet.metadata || {}));
    const experimentMetadata = metadata.experiment || {};
    const variants = Array.isArray(experimentMetadata.variants) ? experimentMetadata.variants : [];
    const variant = variants.find((item) => item.key === selectedVariant);
    if (!variant) throw new Error(`Variant not found in draft metadata: ${selectedVariant}`);
    if (variant.baseline || variant.key === "control") throw new Error("Baseline/control variants cannot receive visual editor modifications.");
    variant.outputs = {
      ...(variant.outputs || {}),
      ...imported.outputs,
      template: "dom_modifications",
      modifications: imported.outputs.modifications
    };
    experimentMetadata.variants = variants;
    metadata.experiment = experimentMetadata;
    const update = await api(`/v1/rule-sets/${encodeURIComponent(experiment.decision_key)}/draft`, {
      method: "PUT",
      body: JSON.stringify({
        name: ruleSet.name,
        decision_key: ruleSet.decision_key,
        description: ruleSet.description || "",
        type: ruleSet.type || "experiment",
        priority: Number(ruleSet.priority || 0),
        surface: ruleSet.surface || "",
        cache_policy: ruleSet.cache_policy || {},
        input_schema: ruleSet.input_schema || {},
        output_schema: ruleSet.output_schema || {},
        metadata,
        draft: body.draft,
        tags: ruleSet.tags || []
      })
    });
    if (status) {
      status.textContent = `Saved ${imported.outputs.modifications.length} DOM modification${imported.outputs.modifications.length === 1 ? "" : "s"} to ${selectedVariant}.`;
    }
    await Promise.all([loadRules(), loadExperiments()]);
    selectedExperimentKey = experiment.decision_key;
    renderExperiments();
    editorOutput.textContent = JSON.stringify(update, null, 2);
  } catch (error) {
    if (status) status.textContent = error.message;
    else editorOutput.textContent = error.message;
  }
}

function parseVisualEditorPayload(text, options = {}) {
  const strict = options.strict !== false;
  const payload = parseJsonStrict(text || "{}", "Visual editor payload");
  const outputs = payload.outputs || payload;
  if (outputs.template !== "dom_modifications") {
    throw new Error("Visual editor payload must use outputs.template = dom_modifications.");
  }
  if (!Array.isArray(outputs.modifications)) {
    throw new Error("Visual editor payload must include outputs.modifications as an array.");
  }
  for (const modification of outputs.modifications) {
    if (!modification || typeof modification !== "object") throw new Error("Each modification must be an object.");
    if (strict && (!modification.type || !modification.selector)) throw new Error("Each modification must include type and selector.");
    if (strict) {
      const warning = domModificationRowWarning(modification);
      if (/missing selector|syntax looks invalid|unsupported action type|attribute name may be unsafe|styles must be valid json/i.test(warning)) {
        throw new Error(`Invalid visual modification: ${warning}`);
      }
    }
  }
  return {
    variant: payload.variant || "",
    outputs: {
      ...outputs,
      template: "dom_modifications",
      modifications: outputs.modifications
    }
  };
}

async function openExperimentVisualEditor(experiment) {
  try {
    const body = await api(`/v1/experiments/${encodeURIComponent(experiment.decision_key)}/editor-session`, {
      method: "POST",
      body: JSON.stringify({
        website_url: "http://localhost:8092/experiment-mock-site/",
        variant_key: experiment.variants?.find((variant) => !variant.baseline && variant.key !== "control")?.key || "treatment"
      })
    });
    window.open(body.editor_url, "_blank", "noopener,noreferrer");
  } catch (error) {
    experimentDetail.querySelector(".experiment-workbench-body")?.insertAdjacentHTML(
      "afterbegin",
      `<div class="experiment-warning-list"><div>${escapeHtml(error.message)}</div></div>`
    );
  }
}

async function createExperimentPreviewLink(experiment) {
  const panel = experimentDetail.querySelector("[data-experiment-preview-link]");
  const variantKey = experiment.variants?.find((variant) => !variant.baseline && variant.key !== "control")?.key || "";
  if (panel) {
    panel.classList.add("loading");
    panel.innerHTML = `
      <strong>Reviewer preview</strong>
      <span>Creating a read-only preview link...</span>
    `;
  }
  try {
    const body = await api(`/v1/experiments/${encodeURIComponent(experiment.decision_key)}/preview-link`, {
      method: "POST",
      body: JSON.stringify({
        website_url: "http://localhost:8092/experiment-mock-site/",
        variant_key: variantKey,
        ttl_seconds: 3600
      })
    });
    await navigator.clipboard?.writeText(body.preview_url).catch(() => {});
    if (panel) {
      panel.classList.remove("loading");
      panel.innerHTML = `
        <div>
          <strong>Reviewer preview ready</strong>
          <span>${escapeHtml(body.variant_key ? `Forced variant ${body.variant_key}` : "No variant forced")} · expires ${escapeHtml(body.expires_at ? formatTime(body.expires_at) : "-")}</span>
        </div>
        <div class="experiment-preview-link-actions">
          <a href="${escapeHtml(body.preview_url)}" target="_blank" rel="noopener noreferrer">Open</a>
          <button type="button" data-copy-preview-link>Copy Link</button>
        </div>
        <code>${escapeHtml(body.preview_url)}</code>
      `;
      panel.querySelector("[data-copy-preview-link]")?.addEventListener("click", async () => {
        await navigator.clipboard?.writeText(body.preview_url).catch(() => {});
      });
    }
  } catch (error) {
    if (panel) {
      panel.classList.remove("loading");
      panel.innerHTML = `
        <strong>Reviewer preview</strong>
        <span>${escapeHtml(error.message)}</span>
      `;
    }
  }
}

function openExperimentInEvaluate(experiment) {
  switchView("test");
  const ruleSelect = document.querySelector("#eval-rule-key");
  if (ruleSelect) ruleSelect.value = experiment.decision_key;
  const preset = document.querySelector("#eval-preset");
  if (preset) preset.value = "experiment_holdout";
  loadEvaluatePreset();
}

async function openExperimentInRuleEditor(experiment, section = "operations") {
  switchView("rules");
  await loadRule(experiment.decision_key);
  const target = document.querySelector(`[data-experiment-editor-section="${cssEscape(section)}"]`) || document.querySelector("#experiment-panel");
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.remove("editor-section-focus");
  window.setTimeout(() => target.classList.add("editor-section-focus"), 0);
  window.setTimeout(() => target.classList.remove("editor-section-focus"), 1800);
}

function experimentSettingRow(label, value, detail = "") {
  return `
    <div class="experiment-setting-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value || "-")}</span>
      <small>${escapeHtml(detail || "")}</small>
    </div>
  `;
}

function experimentReadinessPanel(experiment = {}) {
  const checks = experimentReadinessChecks(experiment);
  const blocking = checks.filter((item) => item.level === "error").length;
  const warnings = checks.filter((item) => item.level === "warn").length;
  const ready = blocking === 0 && warnings === 0;
  return `
    <section class="experiment-readiness-panel ${ready ? "ok" : blocking ? "error" : "warn"}">
      <div class="experiment-readiness-head">
        <div>
          <strong>${ready ? "Ready to monitor" : blocking ? "Launch blockers" : "Review before launch"}</strong>
          <span>${escapeHtml(blocking ? `${blocking} blocking issue${blocking === 1 ? "" : "s"}` : warnings ? `${warnings} warning${warnings === 1 ? "" : "s"}` : "No obvious readiness issues detected.")}</span>
        </div>
        <button type="button" data-experiment-action="focus-readiness" data-target-tab="${blocking || warnings ? "settings" : "results"}">View Checklist</button>
      </div>
      <div class="experiment-readiness-list">
        ${checks.map((item) => `
          <div class="${escapeHtml(item.level)}">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail)}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function experimentReadinessChecks(experiment = {}) {
  const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
  const allocationTotal = variants.reduce((sum, variant) => sum + Number(variant.weight || 0), 0);
  const outputVariants = variants.filter((variant) => Object.keys(variant.outputs || {}).length > 0).length;
  const goal = experiment.goal || {};
  const schedule = experiment.schedule || {};
  const targeting = experiment.targeting || {};
  const trigger = experiment.trigger || {};
  const consent = experiment.consent || {};
  const exposureCount = Number(experiment.events?.exposure?.count || 0);
  const impressionCount = Number(experiment.events?.impression?.count || 0);
  const conversionCount = Number(experiment.events?.conversion?.count || 0);
  const lastEventAt = latestExperimentEventAt(experiment);
  const live = experiment.status === "published" && experiment.experiment_status === "running";
  const checks = [
    readinessCheck(experiment.status === "published", "Published version", experiment.status === "published" ? "Client traffic can use the published experiment." : "Publish the experiment before sending live web traffic.", "error"),
    readinessCheck(Boolean(lastEventAt || exposureCount), "Last feedback", lastEventAt ? `Last event ${formatTime(lastEventAt)}.` : exposureCount ? `${formatNumber(exposureCount)} exposures received.` : "No client feedback received yet.", "warn"),
    readinessCheck(variants.length >= 2, "Variants", variants.length >= 2 ? `${variants.length} variants configured.` : "Configure at least control and one treatment variant.", "error"),
    readinessCheck(Math.round(allocationTotal * 1000) === 100000, "Allocation", `Allocation total is ${formatNumber(allocationTotal)}%.`, "error"),
    readinessCheck(outputVariants > 0, "Design payload", outputVariants ? `${outputVariants} variant${outputVariants === 1 ? "" : "s"} define outputs.` : "Add outputs or DOM modifications for at least one treatment.", "warn"),
    readinessCheck(Boolean(goal.event), "Conversion goal", goal.event ? `Goal event: ${goal.event}.` : "Set the conversion goal used for reporting.", "warn"),
    readinessCheck(Boolean(schedule.daily_eligible_profiles || exposureCount), "Traffic estimate", schedule.daily_eligible_profiles ? `${formatNumber(schedule.daily_eligible_profiles)} daily eligible profiles estimated.` : exposureCount ? `${formatNumber(exposureCount)} exposure events received.` : "Add daily traffic estimate or wait for exposure feedback.", "warn"),
    readinessCheck(Boolean(targeting.url_rules?.length || experiment.surface), "Placement targeting", targeting.url_rules?.length ? `${targeting.url_rules.length} URL rule${targeting.url_rules.length === 1 ? "" : "s"} configured.` : experiment.surface ? `Surface: ${experiment.surface}.` : "Set surface or URL targeting before using the SDK.", "warn"),
    readinessCheck(!["data_layer_event", "custom_event"].includes(trigger.type) || Boolean(trigger.event), "Trigger", trigger.event ? `${trigger.type}: ${trigger.event}.` : "Trigger can run without extra event configuration.", "warn"),
    readinessCheck(!consent.required || Boolean(consent.category), "Consent", consent.required ? `Requires ${consent.category || "a consent category"}.` : "No consent gate required.", "warn"),
    readinessCheck(!live || exposureCount > 0, "Feedback flow", exposureCount ? `${formatNumber(exposureCount)} exposures, ${formatNumber(impressionCount)} impressions, ${formatNumber(conversionCount)} conversions.` : "No feedback yet; verify SDK exposure/impression events after launch.", "warn")
  ];
  return checks.slice(0, 12);
}

function latestExperimentEventAt(experiment = {}) {
  return Object.values(experiment.events || {})
    .map((event) => event?.last_seen_at)
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}

function readinessCheck(passed, title, detail, failLevel = "warn") {
  return {
    level: passed ? "ok" : failLevel,
    title,
    detail
  };
}

function arrayLabel(value) {
  return Array.isArray(value) && value.length ? value.join(", ") : "";
}

function urlRulesLabel(rules = []) {
  if (!Array.isArray(rules) || !rules.length) return "Any page";
  return rules.map((rule) => typeof rule === "string" ? rule : `${rule.mode || "include"} ${rule.operator || "contains"} ${rule.value || ""}`.trim()).join(", ");
}

function compactJson(value, limit = 900) {
  const text = JSON.stringify(value || {}, null, 2);
  return text.length > limit ? `${text.slice(0, limit)}\n...` : text;
}

function experimentSampleEvaluateRequest(experiment) {
  const metadata = ruleMetadataForDecision(experiment.decision_key) || {};
  const schema = metadata.input_schema || {};
  return {
    decision_key: experiment.decision_key,
    profile_key: "demo-profile@example.com",
    identifiers: [{ typeId: "email", value: "demo-profile@example.com" }],
    attributes: sampleAttributesFromSchema(schema),
    segments: {},
    context: {
      channel: "web",
      request_source: "dee_ui",
      surface: experiment.surface || "homepage",
      page_url: "https://example.com/",
      force_variant: experiment.variants?.[0]?.key || undefined
    }
  };
}

function experimentTopVariantRow(experiment, variant, index, mode) {
  const campaign = campaignForDecisionKey(experiment.decision_key) || "-";
  const significance = variant.significance?.confidence ? formatPercent(variant.significance.confidence) : variant.baseline ? "Baseline" : "-";
  const isWinner = variant.key && variant.key === experiment.winner_variant;
  return `
    <div class="experiment-detail-table-row">
      <strong>${escapeHtml(variant.key || "(empty)")}</strong>
      <span><mark class="experiment-status ${escapeHtml(experiment.experiment_status || "draft")}">${escapeHtml(experiment.experiment_status || "draft")}</mark></span>
      <span>${escapeHtml(index === 0 ? "primary" : `variant ${index + 1}`)}</span>
      <span>${escapeHtml(experiment.surface || "-")}</span>
      <span>${escapeHtml(campaign)}</span>
      <span>${escapeHtml(experiment.assignment_unit || "profile")}</span>
      <span>${escapeHtml(mode === "bandit" ? "Adaptive bandit" : "Fixed split")}</span>
      <span>${escapeHtml(variant.baseline ? "Yes" : "-")}</span>
      <span>${escapeHtml(isWinner ? `${variant.key} ${formatLift(variant.lift_vs_baseline)}` : "-")}</span>
      <span>${escapeHtml(significance)}</span>
    </div>
  `;
}

function experimentWebsiteSnippet(experiment) {
  const baseUrl = deeRuntimeBaseUrl();
  const placement = experiment.surface || experiment.decision_key || "homepage_placement";
  const decisionKey = experiment.decision_key || "experiment_decision_key";
  return `<div data-dee-placement="${htmlAttrSnippet(placement)}" data-dee-decision-key="${htmlAttrSnippet(decisionKey)}">
  <div class="dee-fallback">Loading offer...</div>
</div>

<script src="https://your-cdn.example.com/dee-web-sdk.js"></script>
<script>
  const dee = DEEWebSDK.createClient({
    baseUrl: ${jsStringSnippet(baseUrl)},
    token: "CLIENT_TOKEN_WITH_CLIENT_SCOPE",
    profileKey: window.meiroProfileId || window.customerEmail || "",
    context: {
      channel: "web",
      surface: ${jsStringSnippet(placement)},
      page_url: window.location.href
    },
    debug: false
  });

  dee.init();
</script>`;
}

function experimentWinnerAutomationPanel(experiment = {}) {
  const recommendation = experiment.winner_recommendation || {};
  const checks = Array.isArray(recommendation.checks) ? recommendation.checks : [];
  const statusLabel = recommendation.eligible ? "Ready" : recommendation.status === "already_promoted" ? "Complete" : "Monitoring";
  return `
    <section class="winner-automation-panel ${escapeHtml(recommendation.status || "not_ready")}">
      <div class="winner-automation-head">
        <div>
          <strong>Winner automation</strong>
          <span>${escapeHtml(recommendation.message || "DEE will recommend a winner draft after significance and governance checks pass.")}</span>
        </div>
        <mark>${escapeHtml(statusLabel)}</mark>
      </div>
      <div class="winner-automation-metrics">
        ${statusItem("Recommended variant", recommendation.variant_key || "-")}
        ${statusItem("Observed leader", recommendation.observed_winner_variant || "-")}
        ${statusItem("Confidence", recommendation.confidence ? formatPercent(recommendation.confidence) : "-")}
        ${statusItem("Lift", formatLift(recommendation.lift_vs_baseline))}
      </div>
      <div class="winner-check-list">
        ${checks.length ? checks.map((check) => `
          <div class="${check.passed ? "passed" : "pending"}">
            <strong>${escapeHtml(check.label || check.key || "Check")}</strong>
            <span>${escapeHtml(check.detail || "")}</span>
          </div>
        `).join("") : `<div class="pending"><strong>No checks available</strong><span>Refresh experiments to recalculate recommendation state.</span></div>`}
      </div>
    </section>
  `;
}

function experimentAssignmentDetail(experiment = {}, mode = experimentMode(experiment)) {
  const bandit = experiment.bandit || {};
  const history = experiment.assignment_history || {};
  return `
    <div class="experiment-bandit-detail">
      <div>
        <strong>${escapeHtml(mode === "bandit" ? "Adaptive allocation guardrails" : "Assignment history")}</strong>
        <span>${escapeHtml(mode === "bandit"
          ? "Bandit experiments bypass decision-result caching so allocation can react to exposure and conversion feedback."
          : "Fixed and graph-managed experiments record assignments so allocation trends can be reviewed after launch.")}</span>
      </div>
      ${mode === "bandit" ? `
        <div class="experiment-detail-summary">
          ${statusItem("Exploration", `${formatNumber(bandit.exploration_rate ?? 10)}%`)}
          ${statusItem("Min exposures", formatNumber(bandit.min_exposures_per_variant ?? 100))}
          ${statusItem("Window", bandit.window_days ? `${formatNumber(bandit.window_days)}d` : "All feedback")}
          ${statusItem("Frozen winner", bandit.freeze_variant || "-")}
        </div>
      ` : ""}
      <div class="bandit-history-panel">
        <div class="bandit-history-head">
          <strong>Assignment history</strong>
          <span>${escapeHtml(formatNumber(history.total || 0))} assignments in the last ${escapeHtml(formatNumber(history.window_hours || 24))} hours</span>
        </div>
        ${banditAssignmentTrend(history.trend)}
        <div class="bandit-history-grid">
          ${banditHistoryGroup("Variants", history.by_variant)}
          ${banditHistoryGroup("Reasons", history.by_reason)}
          ${banditHistoryGroup("Strategies", history.by_strategy)}
          ${graphAssignmentHistoryGroup(history.by_graph_node)}
        </div>
        <div class="bandit-recent-list">
          ${banditRecentAssignments(history.recent)}
        </div>
      </div>
    </div>
  `;
}

function banditAssignmentTrend(trend = []) {
  const rows = Array.isArray(trend) ? trend : [];
  const max = Math.max(...rows.map((item) => Number(item.total || 0)), 0);
  const variantKeys = [...new Set(rows.flatMap((item) => (item.variants || []).map((variant) => variant.key || "(empty)")))].slice(0, 6);
  if (!rows.length || max <= 0) {
    return `
      <section class="bandit-trend-panel">
        <div class="editor-title">Allocation trend</div>
        <div class="status-line">No assignment trend yet.</div>
      </section>
    `;
  }
  return `
    <section class="bandit-trend-panel">
      <div class="bandit-trend-head">
        <div class="editor-title">Allocation trend</div>
        <span>Hourly assignments by variant</span>
      </div>
      <div class="bandit-trend-bars" aria-label="Hourly assignment trend">
        ${rows.map((item) => banditTrendBar(item, max, variantKeys)).join("")}
      </div>
      <div class="bandit-trend-legend">
        ${variantKeys.map((key, index) => `<span><i style="background:${banditTrendColor(index)}"></i>${escapeHtml(key)}</span>`).join("")}
      </div>
    </section>
  `;
}

function banditTrendBar(item, max, variantKeys) {
  const total = Number(item.total || 0);
  const height = Math.max(4, Math.round((total / Math.max(max, 1)) * 100));
  const variants = Array.isArray(item.variants) ? item.variants : [];
  return `
    <div class="bandit-trend-column" title="${escapeHtml(`${formatHourLabel(item.bucket)} · ${formatNumber(total)} assignments`)}">
      <div class="bandit-trend-track">
        <div class="bandit-trend-stack" style="height:${height}%">
          ${variants.length ? variants.map((variant) => {
            const index = Math.max(0, variantKeys.indexOf(variant.key || "(empty)"));
            const segmentHeight = Math.max(8, Math.round(Number(variant.share || 0) * 100));
            return `<em style="height:${segmentHeight}%;background:${banditTrendColor(index)}" title="${escapeHtml(`${variant.key}: ${formatNumber(variant.count || 0)}`)}"></em>`;
          }).join("") : `<em style="height:100%;background:#d6dee9"></em>`}
        </div>
      </div>
      <small>${escapeHtml(formatHourLabel(item.bucket))}</small>
    </div>
  `;
}

function banditTrendColor(index) {
  return ["#0e9a8e", "#2563eb", "#7c3aed", "#f59e0b", "#dc2626", "#64748b"][index % 6];
}

function formatHourLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function banditHistoryGroup(title, items = []) {
  return `
    <section class="traffic-group">
      <div class="editor-title">${escapeHtml(title)}</div>
      <div class="traffic-group-list">${
        items?.length
          ? items.map((item) => `
            <div class="traffic-group-row">
              <strong title="${escapeHtml(item.key || "-")}">${escapeHtml(title === "Strategies" ? assignmentStrategyLabel(item.key) : title === "Reasons" ? assignmentReasonLabel(item.key) : item.key || "-")}</strong>
              <span>${formatNumber(item.count || 0)}</span>
            </div>
          `).join("")
          : `<div class="status-line">No assignments yet</div>`
      }</div>
    </section>
  `;
}

function graphAssignmentHistoryGroup(items = []) {
  return `
    <section class="traffic-group">
      <div class="editor-title">Graph nodes</div>
      <div class="traffic-group-list">${
        items?.length
          ? items.map((item) => `
            <div class="traffic-group-row graph-node-assignment-row">
              <strong title="${escapeHtml([item.key, item.graph_node_id].filter(Boolean).join(" · "))}">${escapeHtml(item.key || item.graph_node_id || "-")}</strong>
              <span>${formatNumber(item.count || 0)}</span>
              <small>${escapeHtml(graphAssignmentVariantSummary(item.variants || []))}</small>
            </div>
          `).join("")
          : `<div class="status-line">No graph split assignments yet</div>`
      }</div>
    </section>
  `;
}

function graphAssignmentVariantSummary(variants = []) {
  const rows = Array.isArray(variants) ? variants : [];
  return rows.slice(0, 3).map((item) => `${item.key}: ${formatNumber(item.count || 0)}`).join(" · ") || "No variants";
}

function banditRecentAssignments(items = []) {
  return items?.length ? items.map((item) => `
    <div class="bandit-recent-row">
      <strong>${escapeHtml(item.variant_key || item.reason || "-")}</strong>
      <span>${escapeHtml(assignmentReasonLabel(item.reason) || assignmentStrategyLabel(item.strategy) || "-")}</span>
      <em>${escapeHtml(item.profile_key || "-")}</em>
      <small>${item.assigned_at ? escapeHtml(formatTime(item.assigned_at)) : "-"}</small>
    </div>
  `).join("") : `<div class="status-line">No recent assignments yet.</div>`;
}

function assignmentStrategyLabel(value = "") {
  return {
    fixed: "Fixed split",
    bandit: "Adaptive bandit",
    graph_split: "Graph split",
    graph_bandit: "Graph bandit",
    holdout: "Holdout"
  }[value] || value || "";
}

function assignmentReasonLabel(value = "") {
  return {
    graph_split: "Graph split",
    forced: "Forced variant",
    exploration: "Exploration",
    exploitation: "Exploitation",
    minimum_sample: "Minimum sample",
    forced_holdout: "Forced holdout"
  }[value] || value || "";
}

function deeRuntimeBaseUrl() {
  const runtime = cachedSettings.runtime || {};
  const candidates = [
    runtime.public_url,
    runtime.docker_url,
    runtime.direct_url,
    window.location.origin
  ].filter(Boolean);
  return String(candidates[0]).replace(/\/$/, "");
}

function htmlAttrSnippet(value) {
  return String(value || "").replace(/"/g, "&quot;");
}

function jsStringSnippet(value) {
  return JSON.stringify(String(value || ""));
}

async function copyExperimentSnippet(experiment) {
  const snippet = experimentWebsiteSnippet(experiment);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(snippet);
    } else {
      window.prompt("Copy website snippet", snippet);
    }
    const panel = experimentDetail.querySelector(".experiment-snippet-guidance span");
    if (panel) panel.textContent = "Snippet copied. Paste a client token before deploying.";
  } catch {
    window.prompt("Copy website snippet", snippet);
  }
}

async function declareExperimentWinner(event) {
  const button = event.currentTarget;
  const ruleKey = button.dataset.ruleKey;
  const winnerKey = button.dataset.winnerKey;
  if (!ruleKey || !winnerKey) return;
  try {
    switchView("rules");
    await loadRule(ruleKey);
    const experiment = readExperimentMetadata({ tolerateInvalid: true });
    experiment.variants = (experiment.variants || []).map((variant) => ({
      ...variant,
      weight: variant.key === winnerKey ? 100 : 0
    }));
    experiment.status = "running";
    setExperimentMetadata(experiment);
    renderRuleInspector();
    syncJsonFromBuilder();
    editorOutput.textContent = `Winner draft prepared: ${winnerKey} now has 100% allocation. Save, submit review, and publish when ready.`;
  } catch (error) {
    experimentDetail.innerHTML += `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function experimentVariantRow(variant) {
  const exposure = variant.events?.exposure || {};
  const conversion = variant.events?.conversion || {};
  const impression = variant.events?.impression || {};
  const lastSeen = [exposure.last_seen_at, conversion.last_seen_at, impression.last_seen_at].filter(Boolean).sort().at(-1);
  return `
    <div class="experiment-variant-row">
      <strong>${escapeHtml(variant.key || "(empty)")}${variant.configured === false ? " *" : ""}</strong>
      <span>${formatNumber(variant.weight || 0)}%</span>
      <span>${formatNumber(exposure.count || 0)} / ${formatNumber(exposure.unique_profiles || 0)} profiles</span>
      <span>${formatNumber(conversion.count || 0)} / ${formatNumber(conversion.unique_profiles || 0)} profiles</span>
      <span>${formatPercent(variant.conversion_rate || 0)}</span>
      <span>${formatLift(variant.lift_vs_baseline)}</span>
      <span>${experimentSignificanceLabel(variant.significance)}</span>
      <span>${formatNumber(impression.count || 0)} / ${formatNumber(impression.unique_profiles || 0)} profiles</span>
      <span>${lastSeen ? formatTime(lastSeen) : "-"}</span>
    </div>
  `;
}

function experimentSignificanceLabel(significance = {}) {
  if (!significance || significance.status === "baseline") return "Baseline";
  if (significance.p_value == null) return significance.note || "Insufficient data";
  const label = significance.significant ? "95% significant" : "Not significant";
  return `${label} · ${formatPercent(significance.confidence || 0)} · p=${Number(significance.p_value).toFixed(3)}`;
}

function experimentOpsWarnings(experiment) {
  const warnings = [];
  if (experiment.status !== "published") warnings.push("This rule is not published; client traffic will not use the current draft.");
  if (experiment.experiment_status !== "running") warnings.push("Experiment assignment is not running.");
  if (Math.round(Number(experiment.allocation_total || 0) * 1000) !== 100000) warnings.push("Variant allocation does not sum to 100%.");
  if (!experiment.variants.length) warnings.push("No variants are configured.");
  if (experiment.variants.some((variant) => variant.configured === false)) warnings.push("Some recorded variants are no longer in the active allocation.");
  return warnings;
}

async function loadClientEventMetrics() {
  if (!clientEventsPanel) return;
  try {
    const body = await api("/v1/metrics/client-events?limit=8&recent_limit=24");
    renderClientEventMetrics(body.metrics);
  } catch (error) {
    clientEventsPanel.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function renderClientEventMetrics(metrics) {
  const deliveryDiagnostics = messageDeliveryDiagnostics(metrics.recent_events || []);
  const skippedCount = (metrics.recent_events || []).filter((item) => (item.event_type || item.type) === "skipped").length;
  const tabs = [
    { id: "rules", label: "Rules", count: metrics.by_rule?.length || 0, rows: clientEventMetricRows(metrics.by_rule) },
    { id: "variants", label: "Variants", count: metrics.by_variant?.length || 0, rows: clientEventMetricRows(metrics.by_variant) },
    { id: "messages", label: "Messages", count: metrics.by_message?.length || 0, rows: clientEventMetricRows(metrics.by_message) },
    { id: "surfaces", label: "Surfaces", count: metrics.by_surface?.length || 0, rows: clientEventMetricRows(metrics.by_surface) },
    { id: "delivery", label: "Delivery", count: skippedCount, rows: clientEventDiagnosticRows(deliveryDiagnostics, skippedCount) },
    { id: "recent", label: "Recent", count: metrics.recent_events?.length || 0, rows: clientEventRecentRows(metrics.recent_events) }
  ];
  clientEventsPanel.innerHTML = `
    <div class="client-event-tabs" role="tablist" aria-label="Client event categories">
      ${tabs.map((tab, index) => `
        <button type="button" class="${index === 0 ? "active" : ""}" role="tab" aria-selected="${index === 0 ? "true" : "false"}" data-client-event-tab="${escapeHtml(tab.id)}">
          ${escapeHtml(tab.label)}
          <span>${escapeHtml(formatNumber(tab.count))}</span>
        </button>
      `).join("")}
    </div>
    <div class="client-event-tab-panels">
      ${tabs.map((tab, index) => `
        <div class="client-event-tab-panel ${index === 0 ? "active" : ""}" role="tabpanel" data-client-event-panel="${escapeHtml(tab.id)}">
          ${tab.rows}
        </div>
      `).join("")}
    </div>
  `;
  clientEventsPanel.querySelectorAll("[data-client-event-tab]").forEach((button) => {
    button.addEventListener("click", () => activateClientEventTab(button.dataset.clientEventTab));
  });
}

function activateClientEventTab(tabId) {
  clientEventsPanel.querySelectorAll("[data-client-event-tab]").forEach((button) => {
    const active = button.dataset.clientEventTab === tabId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  clientEventsPanel.querySelectorAll("[data-client-event-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.clientEventPanel === tabId);
  });
}

function clientEventMetricRows(items = []) {
  return items.length
    ? items.map((item) => clientEventMetricRow({
        type: item.event_type,
        title: item.key || "(empty)",
        count: item.count,
        profiles: item.unique_profiles,
        time: item.last_seen_at
      })).join("")
    : `<div class="client-event-empty">No data yet</div>`;
}

function clientEventRecentRows(items = []) {
  return items.length
    ? items.map((item) => clientEventMetricRow({
        type: item.event_type,
        title: item.decision_key || item.message_id || item.variant_key || "(empty)",
        meta: item.variant_key || item.message_id || item.surface || "-",
        profiles: item.profile_key,
        time: item.occurred_at,
        recent: true
      })).join("")
    : `<div class="client-event-empty">No events yet</div>`;
}

function clientEventMetricRow({ type, title, count, profiles, meta, time, recent = false }) {
  const profileText = recent ? profiles || "-" : `· ${formatNumber(profiles || 0)} profiles`;
  return `
    <div class="client-event-row ${recent ? "recent" : ""}">
      <span class="client-event-type ${clientEventTypeClass(type)}">${escapeHtml(type || "event")}</span>
      <strong>${escapeHtml(title || "(empty)")}</strong>
      <em>${escapeHtml(recent ? (meta || "-") : formatNumber(count || 0))}</em>
      <small>${escapeHtml(profileText)}</small>
      <time>${escapeHtml(clientEventClock(time))}</time>
    </div>
  `;
}

function clientEventTypeClass(type = "") {
  if (type === "conversion") return "conversion";
  if (type === "impression") return "impression";
  if (type === "skipped") return "skipped";
  return "exposure";
}

function clientEventClock(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function clientEventStatusItems(items) {
  const counts = eventCountsByType(items);
  return [
    statusItem("Exposures", formatNumber(counts.exposure || 0)),
    statusItem("Impressions", formatNumber(counts.impression || 0)),
    statusItem("Skipped", formatNumber(counts.skipped || 0)),
    statusItem("Conversions", formatNumber(counts.conversion || 0))
  ];
}

function clientEventDiagnosticRows(items = [], skippedCount = 0) {
  if (!skippedCount) {
    return `<div class="client-event-empty">No skipped delivery events recorded in the recent sample.</div>`;
  }
  if (!items.length) {
    return `<div class="client-event-empty">Skipped delivery events were received, but the SDK did not include a reason in the recent sample.</div>`;
  }
  return `
    <div class="client-event-diagnostic-list">
      ${items.map((item) => `
        <div class="client-event-diagnostic-row">
          <span>${escapeHtml(messageDeliveryDiagnosticLabel(item.reason))}</span>
          <strong>${escapeHtml(formatNumber(item.count || 0))}</strong>
          <em>${escapeHtml(`${formatNumber(item.profiles || 0)} profiles${item.latest_at ? ` · latest ${formatTime(item.latest_at)}` : ""}`)}</em>
          <small>${escapeHtml(messageDeliveryDiagnosticHint(item.reason, item.category))}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function renderClientTraffic(metrics = {}) {
  if (!clientTrafficPanel) return;
  const total = Number(metrics.total || 0);
  clientTrafficPanel.innerHTML = `
    <div class="client-traffic-summary">
      ${trafficKpi("Client calls", formatNumber(total), "All /v1/client endpoints")}
      ${trafficKpi("Error rate", formatPercent(metrics.error_rate || 0), `${formatNumber(metrics.errors || 0)} rejected or failed`)}
      ${trafficKpi("P95 latency", `${formatNumber(metrics.p95_ms || 0)}ms`, "Recent in-memory sample")}
      ${trafficKpi("Active origins", formatNumber((metrics.by_origin || []).filter((item) => item.requests).length), "Browser sources seen")}
    </div>
    <div class="client-traffic-groups">
      ${trafficGroup("Endpoints", metrics.by_action)}
      ${trafficGroup("Tokens", metrics.by_token)}
      ${trafficGroup("Origins", metrics.by_origin)}
      ${trafficGroup("Environments", metrics.by_environment)}
      ${trafficGroup("Apps", metrics.by_app)}
    </div>
    <div class="client-traffic-recent">
      <div class="editor-title">Recent Client Calls</div>
      <div class="traffic-call-list">${trafficRecentRows(metrics.recent)}</div>
    </div>
  `;
}

function renderPrecomputeMetrics(metrics = {}) {
  if (!precomputePanel) return;
  const profileCount = Number(metrics.profile_count || 0);
  if (!profileCount) {
    precomputePanel.innerHTML = `
      <div class="status-line">No Meiro Pipes in-app precompute profiles in the selected window.</div>
      <div class="precompute-hint">Check that Pipes calls <code>/v1/client/surface/batch</code>, uses the same DEE URL as this UI, and sends <code>context.request_source</code> as <code>meiro_pipes_inapp_precompute</code>.</div>
    `;
    return;
  }
  precomputePanel.innerHTML = `
    <div class="client-traffic-summary">
      ${trafficKpi("Profiles", formatNumber(profileCount), `${formatNumber(metrics.candidate_evaluations || 0)} candidate evaluations`)}
      ${trafficKpi("Eligible", formatNumber(metrics.eligible_profiles || 0), `${formatPercent(rate(metrics.eligible_profiles || 0, profileCount))} of profiles`)}
      ${trafficKpi("Suppressed", formatNumber(metrics.suppressed_profiles || 0), "No eligible selected message")}
      ${trafficKpi("Runs", formatNumber(metrics.run_count || 0), metrics.last_seen_at ? `Last ${formatTime(metrics.last_seen_at)}` : "No runs")}
    </div>
    <div class="client-traffic-groups precompute-groups">
      ${precomputeGroup("Surfaces", metrics.by_surface)}
      ${precomputeGroup("Sync IDs", metrics.by_sync_id)}
      ${precomputeGroup("Candidate Results", (metrics.by_result || []).map((item) => ({ key: item.result, count: item.count })))}
    </div>
    ${precomputeDiagnosticHint(metrics)}
    ${precomputeErrorSummary(metrics)}
    <div class="precompute-recent">
      <div class="editor-title">Recent Runs</div>
      <div class="precompute-activity-list">${precomputeRunRows(metrics.recent_runs)}</div>
    </div>
    <div class="precompute-recent">
      <div class="editor-title">Recent Eligible Profiles</div>
      <div class="precompute-activity-list">${precomputeRecentRows(metrics.recent_profiles)}</div>
    </div>
  `;
}

function precomputeErrorSummary(metrics = {}) {
  const errors = metrics.error_summary || [];
  const errorProfiles = Number(metrics.error_profiles || 0);
  if (!errorProfiles && !errors.length) return "";
  return `
    <div class="precompute-hint warn">
      <strong>${formatNumber(errorProfiles)} profiles had precompute evaluation errors.</strong>
      ${errors.length ? `<div class="traffic-group-list compact-list">
        ${errors.slice(0, 6).map((item) => `
          <div class="traffic-group-row">
            <strong title="${escapeHtml(item.key || "-")}">${escapeHtml(item.key || "-")}</strong>
            <span>${formatNumber(item.count || 0)}</span>
          </div>
        `).join("")}
      </div>` : ""}
      <small>${escapeHtml(precomputeErrorFixHint(errors))}</small>
    </div>
  `;
}

function precomputeErrorFixHint(errors = []) {
  if ((errors || []).some((item) => item.category === "missing_attribute")) {
    return "Most errors are missing attributes. Check the Pipes sender payload, Profile API enrichment mode, and the rule input schema for this surface.";
  }
  if ((errors || []).some((item) => item.category === "message")) {
    return "Some rules point to unavailable messages. Open the linked rule or message and confirm the message is active and published.";
  }
  if ((errors || []).some((item) => item.category === "lookup")) {
    return "Some rules depend on reference data. Check Reference Data tables and lookup output mappings.";
  }
  return "Inspect recent profile rows and rule audit payloads to find the failing branch or output dependency.";
}

function precomputeDiagnosticHint(metrics = {}) {
  const recent = (metrics.recent_runs || []).find((item) => item.diagnostics?.no_candidate_reason);
  if (!recent) return "";
  const diagnostics = recent.diagnostics || {};
  const surface = diagnostics.requested_surface || recent.surface || "-";
  const surfaces = (diagnostics.available_surfaces || []).map((item) => item.surface).filter(Boolean).slice(0, 5);
  return `
    <div class="precompute-hint">
      Latest zero-candidate run for <strong>${escapeHtml(surface)}</strong>: ${escapeHtml(precomputeReasonLabel(diagnostics.no_candidate_reason))}
      ${surfaces.length ? ` Available published surfaces: ${escapeHtml(surfaces.join(", "))}.` : ""}
    </div>
  `;
}

function precomputeReasonLabel(reason = "") {
  const labels = {
    no_published_inapp_rules: "no published in-app message rules exist",
    client_token_filters_all_inapp_rules: "the client token cannot access any published in-app rules",
    client_token_filters_requested_surface: "published rules exist for this surface, but the client token filters them out",
    no_published_inapp_rules_for_surface: "no published in-app rules match this surface",
    surface_required: "surface is missing"
  };
  return labels[reason] || reason || "no diagnostic reason";
}

function precomputeGroup(title, items = []) {
  return `
    <section class="traffic-group">
      <div class="editor-title">${escapeHtml(title)}</div>
      <div class="traffic-group-list">${
        items?.length
          ? items.map((item) => `
            <div class="traffic-group-row">
              <strong title="${escapeHtml(item.key || "-")}">${escapeHtml(item.key || "-")}</strong>
              <span>${formatNumber(item.count || 0)}</span>
            </div>
          `).join("")
          : `<div class="status-line">No rows</div>`
      }</div>
    </section>
  `;
}

function precomputeRecentRows(items = []) {
  return items.length ? items.map((item) => {
    const status = item.eligible ? "eligible" : item.errors ? "error" : "suppressed";
    return `
    <div class="precompute-activity-row profile">
      <strong title="${escapeHtml(item.profile_key || "-")}">${escapeHtml(item.profile_key || "-")}</strong>
      <span class="precompute-status ${escapeHtml(status)}" title="${escapeHtml((item.error_messages || []).join("; "))}">${escapeHtml(status)}</span>
      <em>${formatNumber(item.evaluations || 0)} evaluations</em>
      <time>${item.last_seen_at ? escapeHtml(clientEventClock(item.last_seen_at)) : "-"}</time>
    </div>
  `;
  }).join("") : `<div class="status-line">No recent profiles</div>`;
}

function precomputeRunRows(items = []) {
  return items.length ? items.map((item) => `
    <div class="precompute-activity-row run">
      <strong title="${escapeHtml(item.surface || "-")}">${escapeHtml(item.surface || "-")}</strong>
      <span>${formatNumber(item.profile_count || 0)} profiles</span>
      <em title="${escapeHtml(precomputeReasonLabel(item.diagnostics?.no_candidate_reason || ""))}">${formatNumber(item.candidate_evaluations || 0)} candidates</em>
      <time>${item.received_at ? escapeHtml(clientEventClock(item.received_at)) : "-"}</time>
    </div>
    ${item.raw_sample ? `
      <details class="precompute-raw-sample">
        <summary>Raw profile sample</summary>
        <pre>${escapeHtml(JSON.stringify(item.raw_sample, null, 2))}</pre>
      </details>
    ` : ""}
  `).join("") : `<div class="status-line">No recent runs</div>`;
}

function trafficKpi(label, value, detail) {
  return `
    <div class="traffic-kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function trafficGroup(title, items = []) {
  return `
    <section class="traffic-group">
      <div class="editor-title">${escapeHtml(title)}</div>
      <div class="traffic-group-list">${
        items.length
          ? items.map((item) => `
            <div class="traffic-group-row">
              <strong title="${escapeHtml(item.key || "-")}">${escapeHtml(item.key || "-")}</strong>
              <span>${formatNumber(item.requests || 0)} calls</span>
              <em>${formatPercent(item.error_rate || 0)} errors</em>
              <small>${formatNumber(item.avg_ms || 0)}ms avg${item.last_seen_at ? ` · ${escapeHtml(formatTime(item.last_seen_at))}` : ""}</small>
            </div>
          `).join("")
          : `<div class="status-line">No client traffic yet</div>`
      }</div>
    </section>
  `;
}

function trafficRecentRows(items = []) {
  return items?.length
    ? items.map((item) => `
      <div class="traffic-call-row ${Number(item.status || 0) >= 400 ? "warn" : "ok"}">
        <span>${escapeHtml(item.at ? formatTime(item.at) : "-")}</span>
        <strong>${escapeHtml(item.action || "-")}</strong>
        <em>${escapeHtml(String(item.status || "-"))}</em>
        <small title="${escapeHtml(item.token || "-")}">${escapeHtml(item.token || "-")}</small>
        <small title="${escapeHtml(item.origin || "-")}">${escapeHtml(item.origin || "-")}</small>
        <small>${escapeHtml([item.environment, item.app_id].filter(Boolean).join(" / ") || "-")}</small>
        <small>${formatNumber(item.duration_ms || 0)}ms</small>
      </div>
    `).join("")
    : `<div class="status-line">No recent client calls yet</div>`;
}

function readinessChecklist(metrics = {}) {
  const schema = metrics.schema || {};
  const cache = metrics.client_cache || {};
  const profileCache = metrics.profile_cache || {};
  const events = metrics.client_events || {};
  const runtime = metrics.runtime_requests || {};
  const rateLimit = metrics.client_rate_limit || {};
  const counts = eventCountsByType(events.by_type || []);
  const schemaOk = Number(schema.total || 0) > 0 && ["ok", "success"].includes(String(schema.last_sync_status || "").toLowerCase());
  const feedbackOk = Number(counts.impression || 0) > 0 || Number(counts.exposure || 0) > 0 || Number(counts.conversion || 0) > 0;
  const skipped = Number(counts.skipped || 0);
  const delivered = Number(counts.exposure || 0) + Number(counts.impression || 0);
  const deliveryOk = delivered === 0 || skipped / Math.max(delivered, 1) < 0.2;
  const runtimeOk = Number(runtime.error_rate || 0) < 0.01 && Number(rateLimit.blocked || 0) === 0;
  const profileErrors = Number(profileCache.errors || 0);
  const profileNotFound = Number(profileCache.not_found || 0);
  const profileLookups = Number(profileCache.hits || 0) + Number(profileCache.misses || 0);
  const profileOk = profileErrors === 0;
  const profileDetail = profileLookups > 0 || Number(profileCache.skipped || 0) > 0 || profileErrors > 0 || profileNotFound > 0
    ? `${formatNumber(profileLookups)} Meiro lookups · ${formatNumber(profileCache.skipped || 0)} local/skipped · ${formatNumber(profileNotFound)} not found · ${formatNumber(profileErrors)} errors`
    : "No sparse client requests have needed Profile API enrichment yet";
  const items = [
    readinessItem("Profile fields", schemaOk ? "Ready" : "Needs sync", `${formatNumber(schema.total || 0)} fields · ${schema.last_synced_at ? formatTime(schema.last_synced_at) : "never synced"}`, schemaOk),
    readinessItem("Feedback loop", feedbackOk ? "Receiving events" : "No feedback yet", `${formatNumber(counts.exposure || 0)} exposures · ${formatNumber(counts.impression || 0)} impressions · ${formatNumber(counts.skipped || 0)} skipped · ${formatNumber(counts.conversion || 0)} conversions`, feedbackOk),
    readinessItem("Delivery health", deliveryOk ? "Renderable" : "Skipped too often", `${formatNumber(skipped)} skipped across ${formatNumber(delivered)} exposures or impressions`, deliveryOk),
    readinessItem("Profile enrichment", profileOk ? `${Math.round((profileCache.hit_rate || 0) * 100)}% cache hit` : "Errors found", profileDetail, profileOk),
    readinessItem("Service reliability", runtimeOk ? "Healthy" : "Needs attention", `${formatPercent(runtime.error_rate || 0)} error rate · ${formatNumber(rateLimit.blocked || 0)} blocked`, runtimeOk),
    readinessItem("Reference data", Number(metrics.lookups?.total || 0) > 0 ? "Available" : "Not configured", `${formatNumber(metrics.lookups?.total || 0)} tables`, Number(metrics.lookups?.total || 0) > 0),
    readinessItem("Decision cache", `${Math.round((cache.hit_rate || 0) * 100)}% hit rate`, `${formatNumber(cache.entries || 0)} cached entries`, true)
  ];
  return `<div class="readiness-list">${items.join("")}</div>`;
}

function readinessItem(label, value, detail, ok) {
  return `
    <div class="readiness-item ${ok ? "ok" : "warn"}">
      <span>${escapeHtml(ok ? "OK" : "!")}</span>
      <div>
        <strong>${escapeHtml(label)}</strong>
        <em>${escapeHtml(value)}</em>
        <small>${escapeHtml(detail)}</small>
      </div>
    </div>
  `;
}

function renderRuleUsage(items) {
  const target = document.querySelector("#metrics-rule-usage");
  const total = Math.max(1, items.reduce((sum, item) => sum + Number(item.requests || 0), 0));
  target.innerHTML = items.length
    ? `${ruleUsageHeader()}${items.map((item) => ruleUsageCard(item, total)).join("")}`
    : `<div class="status-line">No rule traffic yet</div>`;
  target.querySelectorAll("[data-metric-rule-key]").forEach((element) => {
    element.addEventListener("click", async () => {
      await loadRuleMetrics(element.dataset.metricRuleKey);
      overviewRuleDetailPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

function ruleUsageHeader() {
  return `
    <div class="rule-usage-header">
      <span>Decision</span>
      <span>Campaign</span>
      <span>Requests</span>
      <span>Reach</span>
      <span>Last Request</span>
      <span>Share</span>
      <span>%</span>
    </div>
  `;
}

function ruleUsageCard(item, total) {
  const share = Math.round((Number(item.requests || 0) / total) * 100);
  const campaign = campaignForDecisionKey(item.decision_key) || "-";
  return `
    <button type="button" class="rule-usage-card" data-metric-rule-key="${escapeHtml(item.decision_key)}">
      <span>${escapeHtml(item.decision_key)}</span>
      <em>${escapeHtml(campaign)}</em>
      <strong>${escapeHtml(formatNumber(item.requests))}</strong>
      <em>${escapeHtml(`${formatNumber(item.unique_profiles)} profiles`)}</em>
      <small>${escapeHtml(item.last_evaluated_at ? formatTime(item.last_evaluated_at) : "No recent traffic")}</small>
      <i><b style="width:${share}%"></b></i>
      <mark>${share}%</mark>
    </button>
  `;
}

async function loadRuleMetrics(key) {
  try {
    const body = await api(`/v1/metrics/rule/${encodeURIComponent(key)}`);
    renderRuleMetricsDetail(body.metrics);
  } catch (error) {
    ruleDetailPanel.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function renderRuleMetricsDetail(metrics) {
  const fallbackRate = metrics.requests ? Math.round((metrics.fallback_count / metrics.requests) * 100) : 0;
  ruleDetailPanel.innerHTML = `
    <div class="detail-summary">
      ${statusItem("Rule", metrics.decision_key)}
      ${statusItem("Requests", formatNumber(metrics.requests))}
      ${statusItem("Fallback rate", `${fallbackRate}%`)}
      ${statusItem("Errors", formatNumber(metrics.error_count))}
    </div>
    <div class="overview-grid">
      <div>
        <div class="editor-title">Results</div>
        <div class="table compact-table">${header(["Result", "Count", "Share", "", ""])}${resultRows(metrics.result_distribution, metrics.requests)}</div>
      </div>
      <div>
        <div class="editor-title">Matched Branches</div>
        <div class="table compact-table">${header(["Branch", "Count", "Share", "", ""])}${branchRows(metrics.matched_branch_distribution, metrics.requests)}</div>
      </div>
    </div>
    <div>
      <div class="editor-title">Recent Decisions</div>
      <div class="table compact-table">${header(["Time", "Profile", "Result", "Version", "Matched"])}${recentDecisionRows(metrics.recent_decisions)}</div>
    </div>
  `;
}

function resultRows(items, total) {
  return items.length ? items.map((item) => row([item.result, formatNumber(item.count), `${Math.round((item.count / Math.max(1, total)) * 100)}%`, "", ""])).join("") : row(["No data", "", "", "", ""]);
}

function branchRows(items, total) {
  return items.length ? items.map((item) => row([item.branch, formatNumber(item.count), `${Math.round((item.count / Math.max(1, total)) * 100)}%`, "", ""])).join("") : row(["No data", "", "", "", ""]);
}

function recentDecisionRows(items) {
  return items.length ? items.map((item) => row([
    formatTime(item.evaluated_at),
    item.profile_key,
    item.result,
    item.rule_version,
    (item.matched_rules || []).join(", ") || "fallback"
  ])).join("") : row(["No recent decisions", "", "", "", ""]);
}

function metricCard(label, value, meta, icon = "M", tone = "blue") {
  return `
    <div class="metric-card">
      <div class="metric-icon ${escapeHtml(tone)}">${escapeHtml(icon)}</div>
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(meta)}</small>
      </div>
    </div>
  `;
}

function pipelineCell(icon, label, value, meta, tone = "teal") {
  return `
    <div class="pipeline-cell">
      <span class="pipeline-icon ${escapeHtml(tone)}">${escapeHtml(icon)}</span>
      <div>
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(String(value))}</strong>
        <em>${escapeHtml(meta)}</em>
      </div>
    </div>
  `;
}

function renderTable(selector, headings, rows) {
  const target = document.querySelector(selector);
  target.innerHTML = header(headings);
  target.innerHTML += rows.length ? rows.map((item) => row(item)).join("") : row(["No data yet", "", "", "", ""]);
}

function resultDistributionRows(metrics) {
  const total = Math.max(1, metrics.requests?.total || 0);
  return (metrics.result_distribution || []).map((item) => [
    item.result,
    formatNumber(item.count),
    `${Math.round((item.count / total) * 100)}%`,
    "",
    ""
  ]);
}

function renderRequestTrend(metrics) {
  if (!requestTrendPanel) return;
  const requests = metrics.requests || {};
  const cache = metrics.client_cache || {};
  const rules = metrics.rules || {};
  const events = metrics.client_events || {};
  const counts = eventCountsByType(events.by_type || []);
  const windowRequests = Number(requests.window ?? requests.last_24h ?? 0);
  const points = trendPoints(Number(requests.last_7d || requests.total || 0), windowRequests);
  requestTrendPanel.innerHTML = `
    <div class="traffic-hero">
      <div>
        <span>Decision volume</span>
        <strong>${escapeHtml(formatNumber(windowRequests))}</strong>
        <small>${escapeHtml(metrics.window?.label || "Selected window")}</small>
      </div>
      ${trafficLineChart(points)}
    </div>
    <div class="traffic-funnel">
      ${trafficStep("Evaluations", windowRequests, windowRequests)}
      ${trafficStep("Exposures", counts.exposure || 0, windowRequests)}
      ${trafficStep("Impressions", counts.impression || 0, Math.max(1, counts.exposure || windowRequests))}
      ${trafficStep("Conversions", counts.conversion || 0, Math.max(1, counts.impression || counts.exposure || windowRequests))}
    </div>
    <div class="traffic-insights">
      ${statusItem("Cache", `${Math.round((cache.hit_rate || 0) * 100)}% hit rate`)}
      ${statusItem("Live assets", formatNumber(rules.published || 0))}
      ${statusItem("Drafts", formatNumber(rules.draft || 0))}
    </div>
  `;
}

function trafficLineChart(points = []) {
  const values = points.map((point) => Number(point || 0));
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const width = 360;
  const height = 126;
  const pad = { top: 16, right: 18, bottom: 24, left: 34 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const coordinates = values.map((value, index) => {
    const x = pad.left + (index / Math.max(1, values.length - 1)) * chartWidth;
    const y = pad.top + (1 - ((value - min) / span)) * chartHeight;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, value };
  });
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${pad.left},${pad.top + chartHeight} ${line} ${pad.left + chartWidth},${pad.top + chartHeight}`;
  const grid = [0, 0.5, 1].map((ratio) => {
    const y = pad.top + ratio * chartHeight;
    return `<line x1="${pad.left}" y1="${y}" x2="${pad.left + chartWidth}" y2="${y}" />`;
  }).join("");
  const labels = coordinates.map((point, index) => `<text x="${point.x}" y="${height - 7}" text-anchor="middle">${index === coordinates.length - 1 ? "Now" : `-${coordinates.length - index - 1}`}</text>`).join("");
  const dots = coordinates.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3"><title>${escapeHtml(formatNumber(point.value))}</title></circle>`).join("");
  return `
    <div class="traffic-line-chart" aria-label="Decision activity trend">
      <svg viewBox="0 0 ${width} ${height}" role="img">
        <title>Decision activity trend</title>
        <g class="traffic-grid">${grid}</g>
        <polygon class="traffic-area" points="${area}"></polygon>
        <polyline class="traffic-line" points="${line}"></polyline>
        <g class="traffic-points">${dots}</g>
        <g class="traffic-labels">${labels}</g>
      </svg>
    </div>
  `;
}

function trafficStep(label, value, denominator) {
  const share = denominator > 0 ? Math.min(100, Math.round((Number(value || 0) / denominator) * 100)) : 0;
  return `
    <div class="traffic-step">
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(formatNumber(value))}</strong>
      </div>
      <i><b style="width:${share}%"></b></i>
      <small>${escapeHtml(formatPercent(rate(value, denominator)))} of previous</small>
    </div>
  `;
}

function trendPoints(total, latest) {
  const average = Math.max(1, Math.round(total / 7));
  return [45, 62, 52, 74, 88, 70, Math.max(28, Math.min(100, Math.round((latest / average) * 65)))];
}

function renderResultDistribution(metrics) {
  const target = document.querySelector("#metrics-result-distribution");
  if (!target) return;
  const items = metrics.result_distribution || [];
  target.innerHTML = portfolioComposition(
    "Decision outcomes",
    items.map((item) => ({ label: item.result, value: Number(item.count || 0), tone: portfolioResultTone(item.result) })),
    "No results yet"
  );
}

function portfolioComposition(title, rows = [], emptyLabel = "No data yet") {
  const visibleRows = rows.filter((row) => Number(row.value || 0) > 0);
  const total = visibleRows.reduce((sum, row) => sum + Number(row.value || 0), 0);
  if (!visibleRows.length) return `<div class="status-line">${escapeHtml(emptyLabel)}</div>`;
  return `
    <div class="portfolio-composition">
      <strong>${escapeHtml(title)} - ${escapeHtml(formatNumber(total))} total</strong>
      <div class="portfolio-stack" aria-label="${escapeHtml(title)}">
        ${visibleRows.map((row) => {
          const share = Math.max(0.5, (Number(row.value || 0) / Math.max(1, total)) * 100);
          return `<span class="${escapeHtml(row.tone || "neutral")}" style="width:${share}%"></span>`;
        }).join("")}
      </div>
      <div class="portfolio-composition-list">
        ${visibleRows.map((row) => portfolioCompositionRow(row, total)).join("")}
      </div>
    </div>
  `;
}

function portfolioCompositionRow(row, total) {
  const share = Math.round((Number(row.value || 0) / Math.max(1, total)) * 100);
  return `
    <div class="portfolio-composition-row">
      <span><i class="${escapeHtml(row.tone || "neutral")}"></i>${escapeHtml(titleCase(row.label || "-"))}</span>
      <strong>${escapeHtml(formatNumber(row.value || 0))}</strong>
      <small>${share}%</small>
    </div>
  `;
}

function portfolioResultTone(result = "") {
  const normalized = String(result || "").toLowerCase();
  if (normalized === "eligible") return "eligible";
  if (normalized === "deferred") return "deferred";
  if (normalized === "suppressed") return "suppressed";
  if (normalized === "ineligible") return "ineligible";
  return "neutral";
}

function renderRulesInventory(rules) {
  const target = document.querySelector("#metrics-rule-inventory");
  if (!target) return;
  target.innerHTML = portfolioComposition("Rules & experiments", [
    { label: "Published", value: Number(rules.published || 0), tone: "published" },
    { label: "Draft", value: Number(rules.draft || 0), tone: "draft" },
    { label: "Archived", value: Number(rules.archived || 0), tone: "archived" }
  ], "No rules or experiments yet");
}

function renderOverviewFooter(metrics) {
  if (!overviewServiceFooter) return;
  const schema = metrics.schema || {};
  overviewServiceFooter.innerHTML = [
    serviceFooterItem("System status", "All systems operational", "OK"),
    serviceFooterItem("Data freshness", schema.last_synced_at ? `Schema synced ${formatTime(schema.last_synced_at)}` : "Schema not synced", "DF"),
    serviceFooterItem("Environment", cachedSettings.settings?.environment_label || "local", "ENV"),
    serviceFooterItem("Version", "v0.1.0", "VER")
  ].join("");
}

function serviceFooterItem(label, value, icon) {
  return `
    <div class="service-footer-item">
      <span>${escapeHtml(icon)}</span>
      <div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(value)}</small></div>
    </div>
  `;
}

function statusItem(label, value) {
  return `<div class="status-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function openRuleDetail() {
  if (!ruleDetailModal) return;
  ruleDetailModal.hidden = false;
  ruleDetailModal.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeRuleDetail() {
  if (!ruleDetailModal) return;
  closeRuleBuilder();
  closePublishConfirm();
  ruleDetailModal.hidden = true;
}

function openRuleBuilder() {
  renderRuleInspector();
  document.querySelector(".rule-editor-pane")?.classList.add("logic-open");
  ruleBuilderPanel.hidden = false;
  ruleBuilderPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeRuleBuilder() {
  ruleBuilderPanel.hidden = true;
  document.querySelector(".rule-editor-pane")?.classList.remove("logic-open");
  renderRuleInspector();
}

function openPublishConfirm() {
  document.querySelector(".rule-editor-pane")?.classList.add("publish-open");
  publishConfirmModal.hidden = false;
  publishConfirmModal.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closePublishConfirm() {
  publishConfirmModal.hidden = true;
  document.querySelector(".rule-editor-pane")?.classList.remove("publish-open");
}

function approvalWorkflowEnabled() {
  return cachedSettings.settings?.approval_workflow_enabled === true;
}

function renderApprovalWorkflowControls() {
  const enabled = approvalWorkflowEnabled();
  ["#submit-rule-review", "#approve-rule-draft", "#approve-publish-rule"].forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) element.hidden = !enabled;
  });
  const governanceSection = ruleGovernanceTimeline?.closest(".inspector-section");
  if (governanceSection) governanceSection.hidden = !enabled;
}

function renderRuleInspector() {
  if (!ruleInspectorSummary) return;
  const key = document.querySelector("#rule-key").value.trim() || "new_eligibility_rule";
  const selected = cachedRuleSets.find((item) => item.decision_key === selectedRuleKey || item.decision_key === key);
  const type = document.querySelector("#rule-type").value || "decision";
  const priority = document.querySelector("#rule-priority").value || 0;
  const surface = document.querySelector("#rule-surface").value.trim() || "-";
  const mode = document.querySelector("#builder-mode").value;
  const ttl = Number(document.querySelector("#rule-client-ttl").value || 0);
  const scope = document.querySelector("#rule-cache-scope").value;
  const failureMode = document.querySelector("#rule-dependency-failure-mode")?.value || "evaluate";
  const fallback = mode === "graph" ? "graph output" : (document.querySelector("#fallback-result").value.trim() || "deferred");
  const approval = selected?.metadata?.approval || {};
  const summaryItems = [
    statusItem("Status", selected?.status || (selectedRuleKey ? "draft" : "new")),
    statusItem("Version", selected?.version ?? "-"),
    statusItem("Type", type),
    statusItem("Priority", priority)
  ];
  if (approvalWorkflowEnabled()) summaryItems.splice(1, 0, statusItem("Approval", approvalLabel(approval)));
  ruleInspectorSummary.innerHTML = summaryItems.join("");
  renderApprovalWorkflowControls();
  renderExperimentPanel();
  inspectorKey.textContent = key;
  inspectorSurface.textContent = surface;
  inspectorCache.textContent = [
    ttl > 0 ? `${ttl}s / ${scope === "none" ? "profile" : scope}` : "No cache hint",
    failureMode !== "evaluate" ? failureMode.replace("_", " ") : ""
  ].filter(Boolean).join(" · ");
  inspectorFallback.textContent = fallback;
  inspectorBranches.textContent = String(builderBranches.length || 0);
  inspectorNodes.textContent = String(graphBuilder.nodes?.length || 0);
  inspectorMode.textContent = mode === "graph" ? "Advanced graph" : "Branch rules";
  const branchLabel = `${builderBranches.length || 0} branch${builderBranches.length === 1 ? "" : "es"}`;
  const nodeLabel = `${graphBuilder.nodes?.length || 0} node${graphBuilder.nodes?.length === 1 ? "" : "s"}`;
  logicSummaryTitle.textContent = mode === "graph" ? "Advanced graph" : "Branch rules";
  logicSummaryMeta.textContent = mode === "graph" ? nodeLabel : `${branchLabel} · fallback ${fallback}`;
  logicModalSubtitle.textContent = mode === "graph" ? "Advanced graph routing and node outputs" : "Branch rules, conditions, lookup outputs, and fallback";
}

function renderExperimentPanel() {
  if (!experimentPanel) return;
  const type = document.querySelector("#rule-type").value || "decision";
  experimentPanel.hidden = type !== "experiment";
  if (type !== "experiment") {
    renderExperimentWeightTotal([]);
    return;
  }
  const experiment = readExperimentMetadata({ tolerateInvalid: true });
  const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
  const total = variants.reduce((sum, variant) => sum + Number(variant.weight || 0), 0);
  const status = experiment.status || "draft";
  const mode = experimentMode(experiment);
  const banditPanel = document.querySelector("#experiment-bandit-panel");
  if (banditPanel) banditPanel.hidden = mode !== "bandit";
  const warnings = [
    ...experimentMetadataWarnings(experiment),
    ...experimentFreezeWarnings({
      type,
      metadata: { experiment },
      draft: currentDraftForWarnings()
    })
  ];
  const planning = experimentPlanningSummary(experiment);
  if (!document.querySelector("#experiment-variant-builder")?.innerHTML.trim()) renderExperimentVariantBuilder(variants);
  renderExperimentUrlPreview(experiment);
  experimentSummary.innerHTML = [
    statusItem("Status", status),
    statusItem("Assignment", experiment.unit || "profile"),
    statusItem("Mode", mode === "bandit" ? "Adaptive bandit" : "Fixed split"),
    statusItem("Goal", experiment.goal?.event || "conversion"),
    statusItem("Display", displayPolicyLabel(experiment.display)),
    statusItem("Targeting", experimentTargetingLabel(experiment.targeting)),
    statusItem("Trigger", experimentTriggerLabel(experiment.trigger)),
    statusItem("Consent", experimentConsentLabel(experiment.consent)),
    statusItem("Variants", variants.length),
    statusItem("Allocation", `${Number.isFinite(total) ? total : 0}%`),
    ...(mode === "bandit" ? [
      statusItem("Exploration", `${formatNumber(experiment.bandit?.exploration_rate ?? 10)}%`),
      statusItem("Min exposures", formatNumber(experiment.bandit?.min_exposures_per_variant ?? 100))
    ] : []),
    statusItem("Sample target", planning.sampleSize ? formatNumber(planning.sampleSize) : "-"),
    statusItem("Duration", planning.durationLabel),
    ...warnings.map((warning) => statusItem("Warning", warning))
  ].join("");
  renderExperimentWeightTotal(variants);
  renderExperimentPlanningSummary(planning, warnings);
}

function setExperimentMetadata(experiment = {}) {
  document.querySelector("#experiment-status").value = experiment.status || "draft";
  document.querySelector("#experiment-unit").value = experiment.unit || "profile";
  document.querySelector("#experiment-mode").value = experimentMode(experiment);
  document.querySelector("#experiment-bandit-exploration-rate").value = Number(experiment.bandit?.exploration_rate ?? experiment.bandit?.explorationRate ?? 10);
  document.querySelector("#experiment-bandit-min-exposures").value = Number(experiment.bandit?.min_exposures_per_variant ?? experiment.bandit?.minExposuresPerVariant ?? 100);
  document.querySelector("#experiment-bandit-window-days").value = Number(experiment.bandit?.window_days ?? experiment.bandit?.windowDays ?? 0) || "";
  document.querySelector("#experiment-bandit-freeze-variant").value = experiment.bandit?.freeze_variant || experiment.freeze_variant || "";
  document.querySelector("#experiment-goal-event").value = experiment.goal?.event || "conversion";
  document.querySelector("#experiment-goal-type").value = experiment.goal?.type || "conversion";
  document.querySelector("#experiment-goal-attribution").value = Number(experiment.goal?.attribution_window_hours || 0) || "";
  document.querySelector("#experiment-goal-value-field").value = experiment.goal?.value_field || "";
  document.querySelector("#experiment-goal-lift").value = Number(experiment.goal?.minimum_detectable_lift_pct || 10);
  document.querySelector("#experiment-baseline-rate").value = Number(experiment.goal?.baseline_conversion_rate_pct || 5);
  document.querySelector("#experiment-daily-traffic").value = Number(experiment.schedule?.daily_eligible_profiles || 0) || "";
  document.querySelector("#experiment-starts-at").value = dateTimeLocalValue(experiment.schedule?.starts_at || "");
  document.querySelector("#experiment-ends-at").value = dateTimeLocalValue(experiment.schedule?.ends_at || "");
  document.querySelector("#experiment-display-mode").value = experiment.display?.mode || "always";
  document.querySelector("#experiment-display-reset").value = experiment.display?.reset_on_version_change === false ? "false" : "true";
  document.querySelector("#experiment-target-devices").value = Array.isArray(experiment.targeting?.devices) ? experiment.targeting.devices.join(", ") : "any";
  document.querySelector("#experiment-url-includes").value = urlRulesToText(experiment.targeting?.url_rules, "include");
  document.querySelector("#experiment-url-excludes").value = urlRulesToText(experiment.targeting?.url_rules, "exclude");
  document.querySelector("#experiment-page-variables").value = Array.isArray(experiment.targeting?.page_variables) ? experiment.targeting.page_variables.join(", ") : "";
  document.querySelector("#experiment-url-preview-samples").value = defaultExperimentUrlSamples(experiment).join("\n");
  document.querySelector("#experiment-sdk-conditions").value = Array.isArray(experiment.targeting?.sdk_conditions) ? experiment.targeting.sdk_conditions.join(", ") : "";
  renderWebTargetingOptions();
  document.querySelector("#experiment-trigger-type").value = experiment.trigger?.type || "page_load";
  document.querySelector("#experiment-trigger-event").value = experiment.trigger?.event || "";
  document.querySelector("#experiment-consent-category").value = experiment.consent?.category || "";
  document.querySelector("#experiment-consent-required").value = experiment.consent?.required ? "true" : "false";
  document.querySelector("#experiment-variants").value = JSON.stringify(
    Array.isArray(experiment.variants) && experiment.variants.length
      ? experiment.variants
      : defaultExperimentVariants(),
    null,
    2
  );
  renderExperimentVariantBuilder(readExperimentMetadata({ tolerateInvalid: true }).variants);
  renderExperimentPanel();
}

function defaultExperimentVariants() {
  return [
    { key: "control", weight: 50, outputs: {} },
    { key: "treatment", weight: 50, outputs: {} }
  ];
}

function displayPolicyLabel(display = {}) {
  if (display.mode === "once") return "Once";
  if (display.mode === "once_per_session") return "Once / session";
  return "Always";
}

function experimentTargetingLabel(targeting = {}) {
  const devices = Array.isArray(targeting.devices) && targeting.devices.length ? targeting.devices.join(", ") : "any device";
  const urls = Array.isArray(targeting.url_rules) ? targeting.url_rules.length : 0;
  const conditions = Array.isArray(targeting.sdk_conditions) ? targeting.sdk_conditions.length : 0;
  return [devices, urls ? `${urls} URL rule${urls === 1 ? "" : "s"}` : "", conditions ? `${conditions} condition${conditions === 1 ? "" : "s"}` : ""]
    .filter(Boolean)
    .join(" · ");
}

function experimentTriggerLabel(trigger = {}) {
  if (!trigger?.type || trigger.type === "page_load") return "Page load";
  return trigger.event ? `${trigger.type}: ${trigger.event}` : trigger.type;
}

function experimentConsentLabel(consent = {}) {
  if (!consent?.required) return "Not required";
  return consent.category ? `Requires ${consent.category}` : "Required";
}

function setExperimentStatus(status) {
  document.querySelector("#experiment-status").value = status;
  renderRuleInspector();
}

function syncExperimentVariantBuilderFromJson() {
  const experiment = readExperimentMetadata({ tolerateInvalid: true });
  renderExperimentVariantBuilder(experiment.variants || []);
  renderRuleInspector();
}

function renderExperimentVariantBuilder(variants = []) {
  const target = document.querySelector("#experiment-variant-builder");
  if (!target) return;
  const renderedVariants = variants.length ? variants : defaultExperimentVariants();
  target.innerHTML = renderedVariants.map((variant, index) => `
    <div class="variant-builder-row" data-variant-index="${index}">
      <label>
        Variant key
        <input data-variant-field="key" value="${escapeHtml(variant.key || `variant_${index + 1}`)}" />
      </label>
      <label>
        Weight
        <div class="variant-weight-control">
          <input data-variant-field="weight" type="range" min="0" max="100" step="1" value="${escapeHtml(Number(variant.weight || 0))}" />
          <input data-variant-field="weight_number" type="number" min="0" max="100" step="1" value="${escapeHtml(Number(variant.weight || 0))}" />
        </div>
      </label>
      <label>
        Response fields
        <div data-role="variant-output-fields" class="variant-output-fields">
          ${variantOutputFields(variant.outputs || {}).map((field, fieldIndex) => variantOutputFieldRow(field, fieldIndex)).join("")}
        </div>
      </label>
      <div class="variant-dom-panel">
        <div class="variant-dom-head">
          <div>
            <strong>DOM modifications</strong>
            <span>Structured visual-editor output for the website SDK.</span>
          </div>
          <div class="variant-dom-toolbar">
            <select data-dom-preset>
              ${domModificationPresets().map((preset) => `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.label)}</option>`).join("")}
            </select>
            <button type="button" data-variant-action="add-dom-preset">Add Preset</button>
            <button type="button" data-variant-action="add-dom-modification">Blank</button>
          </div>
        </div>
        <div data-role="variant-dom-modifications" class="variant-dom-list">
          ${domModificationFields(variant.outputs || {}).map((modification, modificationIndex) => domModificationRow(modification, modificationIndex)).join("")}
        </div>
        <div class="variant-dom-preview">
          ${domModificationPreview(variant.outputs || {})}
        </div>
        <details class="variant-dom-json">
          <summary>Generated SDK output</summary>
          <pre>${escapeHtml(JSON.stringify(domModificationSdkOutputPreview(variant.outputs || {}), null, 2))}</pre>
        </details>
        ${domModificationQualityPanel(variant.outputs || {})}
      </div>
      <div class="variant-builder-actions">
        <button type="button" data-variant-action="add-output">Add Output</button>
        <button type="button" data-variant-action="remove-variant" ${variants.length <= 1 ? "disabled" : ""}>Remove</button>
      </div>
    </div>
  `).join("");
  renderExperimentWeightTotal(renderedVariants);
}

function renderExperimentWeightTotal(variants = readExperimentVariantsFromBuilder()) {
  const target = document.querySelector("#experiment-weight-total");
  const saveButton = document.querySelector("#save-draft");
  const type = document.querySelector("#rule-type")?.value || "decision";
  const total = variants.reduce((sum, variant) => sum + Number(variant.weight || 0), 0);
  const ok = Math.round(total * 1000) === 100000;
  if (target) {
    target.className = `variant-weight-total ${ok ? "ok" : "error"}`;
    target.innerHTML = `
      <strong>Total: ${escapeHtml(formatNumber(total))}%</strong>
      <span>${ok ? "Allocation is valid." : "Variant weights must sum to 100% before saving."}</span>
    `;
  }
  if (saveButton && type === "experiment") {
    saveButton.disabled = !ok;
    saveButton.title = ok ? "" : "Variant weights must sum to 100% before saving.";
  } else if (saveButton) {
    saveButton.disabled = false;
    saveButton.title = "";
  }
}

function variantOutputFields(outputs = {}) {
  const entries = Object.entries(outputs).filter(([key]) => !["template", "modifications", "dom_modifications", "domModifications", "web_modifications", "webModifications"].includes(key));
  return entries.length ? entries.map(([key, value]) => ({ key, value })) : [{ key: "variant", value: "" }];
}

function variantOutputFieldRow(field = {}, index = 0) {
  return `
    <div class="variant-output-field" data-output-index="${index}">
      <input data-output-field="key" placeholder="output_key" value="${escapeHtml(field.key || "")}" />
      <input data-output-field="value" placeholder="value" value="${escapeHtml(stringifyOutputValue(field.value))}" />
      <button type="button" data-variant-action="remove-output">Remove</button>
    </div>
  `;
}

function stringifyOutputValue(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function domModificationFields(outputs = {}) {
  const modifications = [
    outputs.modifications,
    outputs.dom_modifications,
    outputs.domModifications,
    outputs.web_modifications,
    outputs.webModifications
  ].find(Array.isArray);
  return Array.isArray(modifications) ? modifications : [];
}

function domModificationPresets() {
  return [
    {
      id: "hero_copy",
      label: "Hero copy",
      modification: {
        type: "change_text",
        selector: "[data-hero-title]",
        value: "Personalized offer for your next visit",
        scope: { url_rules: [{ mode: "include", operator: "contains", value: "/" }] },
        max_matches: 1
      }
    },
    {
      id: "cta_link",
      label: "CTA link",
      modification: {
        type: "change_attribute",
        selector: "[data-primary-cta]",
        attribute: "href",
        value: "/offers",
        scope: { url_rules: [{ mode: "include", operator: "contains", value: "/" }] },
        max_matches: 1
      }
    },
    {
      id: "highlight_block",
      label: "Highlight block",
      modification: {
        type: "change_style",
        selector: "[data-promo-block]",
        property: "backgroundColor",
        value: "#effbf8",
        scope: { url_rules: [{ mode: "include", operator: "contains", value: "/" }] },
        max_matches: 1
      }
    },
    {
      id: "insert_proof",
      label: "Insert proof",
      modification: {
        type: "insert_html",
        selector: "[data-proof-slot]",
        html: "<strong>Trusted by returning customers</strong><p>Personalized by DEE.</p>",
        position: "replace",
        scope: { url_rules: [{ mode: "include", operator: "contains", value: "/" }] },
        max_matches: 1
      }
    },
    {
      id: "hide_section",
      label: "Hide section",
      modification: {
        type: "remove",
        selector: "[data-optional-section]",
        mode: "hide",
        scope: { url_rules: [{ mode: "include", operator: "contains", value: "/" }] },
        max_matches: 1
      }
    },
    {
      id: "move_element",
      label: "Move element",
      modification: {
        type: "move",
        selector: "[data-secondary-cta]",
        target_selector: "[data-primary-actions]",
        position: "last_child",
        scope: { url_rules: [{ mode: "include", operator: "contains", value: "/" }] },
        max_matches: 1
      }
    }
  ];
}

function domModificationPresetById(id) {
  return domModificationPresets().find((preset) => preset.id === id) || domModificationPresets()[0];
}

function domModificationRow(modification = {}, index = 0) {
  const scope = modification.scope || {};
  return `
    <div class="variant-dom-row" data-dom-index="${index}">
      <label>
        Type
        <select data-dom-field="type">
          ${["change_text", "change_attribute", "change_style", "insert_html", "remove", "move"].map((type) => `<option value="${type}" ${type === (modification.type || "change_text") ? "selected" : ""}>${escapeHtml(domModificationTypeLabel(type))}</option>`).join("")}
        </select>
      </label>
      <label>
        Selector
        <input data-dom-field="selector" placeholder="[data-hero-title]" value="${escapeHtml(modification.selector || modification.source_selector || modification.sourceSelector || "")}" />
      </label>
      <label>
        Value / HTML
        <textarea data-dom-field="value" placeholder="Text, JSON styles, or sanitized HTML">${escapeHtml(domModificationValue(modification))}</textarea>
      </label>
      <label>
        Attribute / CSS property
        <input data-dom-field="attribute" placeholder="href, src, backgroundColor" value="${escapeHtml(modification.attribute || modification.name || modification.property || "")}" />
      </label>
      <label>
        Target / position
        <div class="variant-dom-target-grid">
          <input data-dom-field="target_selector" placeholder="Target selector for move" value="${escapeHtml(modification.target_selector || modification.targetSelector || modification.target || "")}" />
          <select data-dom-field="position">
            ${["replace", "before", "after", "first_child", "last_child", "hide", "preserve_space"].map((position) => `<option value="${position}" ${position === (modification.position || modification.mode || "replace") ? "selected" : ""}>${escapeHtml(position)}</option>`).join("")}
          </select>
        </div>
      </label>
      <label>
        Scope
        <div class="variant-dom-target-grid">
          <input data-dom-field="scope_urls" placeholder="URL contains, comma separated" value="${escapeHtml(urlRulesToText(scope.url_rules, "include"))}" />
          <input data-dom-field="scope_devices" placeholder="any, desktop, mobile" value="${escapeHtml(Array.isArray(scope.devices) ? scope.devices.join(", ") : "")}" />
        </div>
      </label>
      <label>
        Max matches
        <input data-dom-field="max_matches" type="number" min="1" max="100" step="1" value="${escapeHtml(Number(modification.max_matches || modification.maxMatches || 20))}" />
      </label>
      <div class="variant-dom-row-actions">
        <span>${escapeHtml(domModificationRowWarning(modification) || "Ready")}</span>
        <button type="button" data-variant-action="remove-dom-modification">Remove</button>
      </div>
    </div>
  `;
}

function domModificationPreview(outputs = {}) {
  const modifications = domModificationFields(outputs);
  if (!modifications.length) return `<span>No visual modifications yet.</span>`;
  return modifications.map((modification, index) => {
    const selector = modification.selector || modification.source_selector || modification.sourceSelector || "selector";
    const detail = domModificationSummary(modification);
    return `
      <article>
        <strong>${escapeHtml(index + 1)}. ${escapeHtml(domModificationTypeLabel(modification.type || "change_text"))}</strong>
        <span>${escapeHtml(selector)}</span>
        <small>${escapeHtml(detail)}</small>
      </article>
    `;
  }).join("");
}

function domModificationSdkOutputPreview(outputs = {}) {
  const modifications = domModificationFields(outputs);
  return modifications.length
    ? { template: "dom_modifications", modifications }
    : { template: "dom_modifications", modifications: [] };
}

function domModificationSummary(modification = {}) {
  if (modification.type === "change_text") return `Set text to "${truncateForUi(modification.value || modification.text || "", 70)}"`;
  if (modification.type === "change_attribute") return `Set ${modification.attribute || modification.name || "attribute"} to "${truncateForUi(modification.value || "", 70)}"`;
  if (modification.type === "change_style") return modification.property
    ? `Set ${modification.property} to "${truncateForUi(modification.value || "", 70)}"`
    : `Apply ${Object.keys(modification.styles || {}).length} style value${Object.keys(modification.styles || {}).length === 1 ? "" : "s"}`;
  if (modification.type === "insert_html") return `Insert HTML ${modification.position || "replace"} target`;
  if (modification.type === "remove") return `${modification.mode || "collapse"} selected element`;
  if (modification.type === "move") return `Move to ${modification.target_selector || modification.targetSelector || modification.target || "target"}`;
  return "Modify selected element";
}

function truncateForUi(value, limit = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
}

function domModificationTypeLabel(type) {
  return {
    change_text: "Change text",
    change_attribute: "Change attribute",
    change_style: "Change style",
    insert_html: "Insert HTML",
    remove: "Remove / hide",
    move: "Move element"
  }[type] || type;
}

function domModificationValue(modification = {}) {
  if (modification.type === "change_style" && modification.styles && typeof modification.styles === "object") return JSON.stringify(modification.styles);
  return stringifyOutputValue(modification.value ?? modification.text ?? modification.content ?? modification.html ?? modification.fragment ?? modification.markup ?? "");
}

function domModificationWarnings(outputs = {}) {
  const modifications = domModificationFields(outputs);
  return modifications.flatMap((modification, index) => {
    const warning = domModificationRowWarning(modification);
    const prefix = modification.id || `mod_${index + 1}`;
    return warning ? [`${prefix}: ${warning}`] : [];
  });
}

function domModificationQualityPanel(outputs = {}) {
  const modifications = domModificationFields(outputs);
  const quality = domModificationQuality(modifications);
  const messages = domModificationWarnings(outputs);
  return `
    <div class="variant-dom-quality ${quality.invalid ? "error" : quality.warnings ? "warn" : "ok"}">
      <div class="variant-dom-quality-kpis">
        <span><strong>${escapeHtml(quality.total)}</strong> modifications</span>
        <span><strong>${escapeHtml(quality.ready)}</strong> ready</span>
        <span><strong>${escapeHtml(quality.warnings)}</strong> warnings</span>
        <span><strong>${escapeHtml(quality.invalid)}</strong> invalid</span>
      </div>
      <div class="variant-dom-guidance">
        ${messages.map((warning) => `<span>${escapeHtml(warning)}</span>`).join("") || "<span>No DOM modification warnings.</span>"}
      </div>
    </div>
  `;
}

function domModificationQuality(modifications = []) {
  return modifications.reduce((acc, modification) => {
    const warning = domModificationRowWarning(modification);
    const invalid = warning && /missing selector|syntax looks invalid|attribute name may be unsafe|styles must be valid json/i.test(warning);
    acc.total += 1;
    if (!warning) acc.ready += 1;
    if (warning) acc.warnings += 1;
    if (invalid) acc.invalid += 1;
    return acc;
  }, { total: 0, ready: 0, warnings: 0, invalid: 0 });
}

function domModificationRowWarning(modification = {}) {
  const type = modification.type || "";
  const selector = modification.selector || modification.source_selector || modification.sourceSelector || "";
  if (!type) return "Missing action type.";
  if (!["change_text", "change_attribute", "change_style", "insert_html", "remove", "move"].includes(type)) return "Unsupported action type.";
  if (!selector) return "Missing selector.";
  if (!isLikelyValidSelector(selector)) return "Selector syntax looks invalid.";
  if (isBroadSelector(selector)) return "Broad selector; use a stable data attribute when possible.";
  if (type === "change_attribute" && !(modification.attribute || modification.name)) return "Attribute name is required.";
  if (type === "change_attribute" && !isSafeDomAttributeName(modification.attribute || modification.name)) return "Attribute name may be unsafe.";
  if (type === "change_style" && !(modification.property || modification.styles)) return "CSS property or styles JSON is required.";
  if (type === "change_style" && modification.styles && typeof modification.styles !== "object") return "Styles must be valid JSON when CSS property is empty.";
  if (type === "insert_html" && !(modification.html || modification.fragment || modification.markup)) return "HTML is required.";
  if (type === "move" && !(modification.target_selector || modification.targetSelector || modification.target)) return "Move target selector is required.";
  if (!modification.scope?.url_rules?.length) return "No URL scope; consider limiting this change to target pages.";
  return "";
}

function isSafeDomAttributeName(name) {
  const normalized = String(name || "").toLowerCase();
  if (!/^[a-z_:][a-z0-9_:.-]*$/i.test(normalized)) return false;
  return !normalized.startsWith("on") && !["srcdoc", "style"].includes(normalized);
}

function isLikelyValidSelector(selector) {
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

function isBroadSelector(selector) {
  const value = String(selector || "").trim();
  return ["div", "section", "article", "a", "img", "p", "span", "*"].includes(value) || /^[a-z]+$/i.test(value);
}

function readExperimentVariantsFromBuilder() {
  return [...document.querySelectorAll(".variant-builder-row")].map((row, index) => {
    const key = row.querySelector('[data-variant-field="key"]').value.trim() || `variant_${index + 1}`;
    const weightInput = row.querySelector('[data-variant-field="weight_number"]');
    const outputs = {};
    row.querySelectorAll(".variant-output-field").forEach((fieldRow) => {
      const outputKey = fieldRow.querySelector('[data-output-field="key"]').value.trim();
      if (!outputKey) return;
      outputs[outputKey] = parseOutputFieldValue(fieldRow.querySelector('[data-output-field="value"]').value);
    });
    const modifications = readDomModificationsFromVariantRow(row);
    if (modifications.length) {
      outputs.template = "dom_modifications";
      outputs.modifications = modifications;
    }
    return {
      key: slugForUi(key),
      weight: Number(weightInput.value || 0),
      outputs
    };
  });
}

function readDomModificationsFromVariantRow(row) {
  return [...row.querySelectorAll(".variant-dom-row")].map((domRow, index) => {
    const type = domRow.querySelector('[data-dom-field="type"]').value || "change_text";
    const selector = domRow.querySelector('[data-dom-field="selector"]').value.trim();
    const value = domRow.querySelector('[data-dom-field="value"]').value;
    const attribute = domRow.querySelector('[data-dom-field="attribute"]').value.trim();
    const targetSelector = domRow.querySelector('[data-dom-field="target_selector"]').value.trim();
    const position = domRow.querySelector('[data-dom-field="position"]').value;
    const scopeUrls = textList(domRow.querySelector('[data-dom-field="scope_urls"]').value);
    const scopeDevices = uniqueList(domRow.querySelector('[data-dom-field="scope_devices"]').value).map((item) => item.toLowerCase());
    const maxMatches = Math.max(1, Math.min(100, Number(domRow.querySelector('[data-dom-field="max_matches"]').value || 20)));
    const modification = {
      id: `mod_${index + 1}`,
      type,
      selector,
      max_matches: maxMatches
    };
    if (type === "change_text") modification.value = value;
    if (type === "change_attribute") {
      modification.attribute = attribute;
      modification.value = value;
    }
    if (type === "change_style") {
      if (attribute) {
        modification.property = attribute;
        modification.value = value;
      } else {
        modification.styles = parseOutputFieldValue(value);
      }
    }
    if (type === "insert_html") {
      modification.html = value;
      modification.position = ["before", "after", "first_child", "last_child"].includes(position) ? position : "replace";
    }
    if (type === "remove") modification.mode = ["hide", "preserve_space"].includes(position) ? position : "collapse";
    if (type === "move") {
      modification.target_selector = targetSelector;
      modification.position = ["before", "after", "first_child", "last_child"].includes(position) ? position : "after";
    }
    const scope = {};
    if (scopeUrls.length) scope.url_rules = scopeUrls.map((url) => ({ mode: "include", operator: "contains", value: url }));
    if (scopeDevices.length && !scopeDevices.includes("any")) scope.devices = scopeDevices;
    if (Object.keys(scope).length) modification.scope = scope;
    return modification;
  }).filter((modification) => modification.selector || modification.type === "move");
}

function parseOutputFieldValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function syncExperimentVariantsFromBuilder(event) {
  const field = event.target?.dataset?.variantField;
  if (field === "weight") {
    event.target.closest(".variant-weight-control")?.querySelector('[data-variant-field="weight_number"]')?.setAttribute("value", event.target.value);
    event.target.closest(".variant-weight-control").querySelector('[data-variant-field="weight_number"]').value = event.target.value;
  }
  if (field === "weight_number") {
    const value = Math.max(0, Math.min(100, Number(event.target.value || 0)));
    event.target.value = value;
    event.target.closest(".variant-weight-control")?.querySelector('[data-variant-field="weight"]')?.setAttribute("value", value);
    event.target.closest(".variant-weight-control").querySelector('[data-variant-field="weight"]').value = value;
  }
  writeExperimentVariantsFromBuilder();
}

function writeExperimentVariantsFromBuilder() {
  document.querySelector("#experiment-variants").value = JSON.stringify(readExperimentVariantsFromBuilder(), null, 2);
  renderExperimentWeightTotal();
  renderRuleInspector();
}

function addExperimentVariant() {
  const variants = readExperimentVariantsFromBuilder();
  variants.push({ key: uniqueVariantKey(variants), weight: 0, outputs: { variant: "" } });
  document.querySelector("#experiment-variants").value = JSON.stringify(variants, null, 2);
  syncExperimentVariantBuilderFromJson();
}

function balanceExperimentVariants() {
  const variants = readExperimentVariantsFromBuilder();
  if (!variants.length) return;
  const base = Math.floor(100 / variants.length);
  let remainder = 100 - (base * variants.length);
  const balanced = variants.map((variant) => ({
    ...variant,
    weight: base + (remainder-- > 0 ? 1 : 0)
  }));
  document.querySelector("#experiment-variants").value = JSON.stringify(balanced, null, 2);
  syncExperimentVariantBuilderFromJson();
}

function handleExperimentVariantBuilderClick(event) {
  const button = event.target.closest("[data-variant-action]");
  if (!button) return;
  const action = button.dataset.variantAction;
  const row = button.closest(".variant-builder-row");
  if (action === "add-output") {
    row.querySelector('[data-role="variant-output-fields"]').insertAdjacentHTML("beforeend", variantOutputFieldRow({}, row.querySelectorAll(".variant-output-field").length));
    writeExperimentVariantsFromBuilder();
  }
  if (action === "add-dom-modification") {
    row.querySelector('[data-role="variant-dom-modifications"]').insertAdjacentHTML("beforeend", domModificationRow({ type: "change_text" }, row.querySelectorAll(".variant-dom-row").length));
    writeExperimentVariantsFromBuilder();
  }
  if (action === "add-dom-preset") {
    const preset = domModificationPresetById(row.querySelector("[data-dom-preset]")?.value);
    row.querySelector('[data-role="variant-dom-modifications"]').insertAdjacentHTML("beforeend", domModificationRow(preset.modification, row.querySelectorAll(".variant-dom-row").length));
    writeExperimentVariantsFromBuilder();
    syncExperimentVariantBuilderFromJson();
  }
  if (action === "remove-output") {
    button.closest(".variant-output-field")?.remove();
    writeExperimentVariantsFromBuilder();
  }
  if (action === "remove-dom-modification") {
    button.closest(".variant-dom-row")?.remove();
    writeExperimentVariantsFromBuilder();
    syncExperimentVariantBuilderFromJson();
  }
  if (action === "remove-variant") {
    row?.remove();
    writeExperimentVariantsFromBuilder();
    syncExperimentVariantBuilderFromJson();
  }
}

function uniqueVariantKey(variants = []) {
  const existing = new Set(variants.map((variant) => variant.key));
  for (let index = 1; index < 100; index += 1) {
    const candidate = `variant_${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `variant_${Date.now()}`;
}

function slugForUi(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "variant";
}

function readExperimentMetadata({ tolerateInvalid = false } = {}) {
  try {
    const variants = parseJsonStrict(document.querySelector("#experiment-variants").value || "[]", "Variants JSON");
    return {
      status: document.querySelector("#experiment-status").value || "draft",
      unit: document.querySelector("#experiment-unit").value || "profile",
      mode: document.querySelector("#experiment-mode").value || "fixed",
      ...readExperimentBandit(),
      goal: readExperimentGoal(),
      schedule: readExperimentSchedule(),
      ...readExperimentDeliverySettings(),
      variants
    };
  } catch (error) {
    if (!tolerateInvalid) throw error;
    return {
      status: document.querySelector("#experiment-status").value || "draft",
      unit: document.querySelector("#experiment-unit").value || "profile",
      mode: document.querySelector("#experiment-mode").value || "fixed",
      ...readExperimentBandit(),
      goal: readExperimentGoal(),
      schedule: readExperimentSchedule(),
      ...readExperimentDeliverySettings(),
      variants: []
    };
  }
}

function experimentMode(experiment = {}) {
  if (experiment.mode === "bandit" || experiment.experiment_mode === "bandit" || experiment.assignment_mode === "bandit" || experiment.bandit?.enabled) return "bandit";
  return "fixed";
}

function readExperimentBandit() {
  const mode = document.querySelector("#experiment-mode").value || "fixed";
  if (mode !== "bandit") return {};
  const explorationRate = Math.max(0, Math.min(100, Number(document.querySelector("#experiment-bandit-exploration-rate").value || 10)));
  const minExposures = Math.max(0, Math.round(Number(document.querySelector("#experiment-bandit-min-exposures").value || 100)));
  const windowDays = Math.max(0, Math.round(Number(document.querySelector("#experiment-bandit-window-days").value || 0)));
  const freezeVariant = document.querySelector("#experiment-bandit-freeze-variant").value.trim();
  return {
    bandit: {
      enabled: true,
      exploration_rate: explorationRate,
      min_exposures_per_variant: minExposures,
      ...(windowDays ? { window_days: windowDays } : {}),
      ...(freezeVariant ? { freeze_variant: freezeVariant } : {})
    }
  };
}

function readExperimentGoal() {
  const attributionWindow = Number(document.querySelector("#experiment-goal-attribution").value || 0);
  const valueField = document.querySelector("#experiment-goal-value-field").value.trim();
  const goal = {
    event: document.querySelector("#experiment-goal-event").value.trim() || "conversion",
    type: document.querySelector("#experiment-goal-type").value || "conversion",
    minimum_detectable_lift_pct: Number(document.querySelector("#experiment-goal-lift").value || 0),
    baseline_conversion_rate_pct: Number(document.querySelector("#experiment-baseline-rate").value || 0)
  };
  if (Number.isFinite(attributionWindow) && attributionWindow > 0) goal.attribution_window_hours = attributionWindow;
  if (valueField) goal.value_field = valueField;
  return goal;
}

function readExperimentSchedule() {
  const schedule = {
    starts_at: isoFromDateTimeLocal(document.querySelector("#experiment-starts-at").value),
    ends_at: isoFromDateTimeLocal(document.querySelector("#experiment-ends-at").value),
    daily_eligible_profiles: Number(document.querySelector("#experiment-daily-traffic").value || 0)
  };
  if (!schedule.starts_at) delete schedule.starts_at;
  if (!schedule.ends_at) delete schedule.ends_at;
  if (!schedule.daily_eligible_profiles) delete schedule.daily_eligible_profiles;
  return schedule;
}

function readExperimentDeliverySettings() {
  const displayMode = document.querySelector("#experiment-display-mode").value || "always";
  const display = {
    mode: displayMode,
    reset_on_version_change: document.querySelector("#experiment-display-reset").value !== "false"
  };
  const devices = uniqueList(document.querySelector("#experiment-target-devices").value || "any")
    .map((item) => item.toLowerCase());
  const urlRules = [
    ...textList(document.querySelector("#experiment-url-includes").value).map((value) => ({ mode: "include", operator: "contains", value })),
    ...textList(document.querySelector("#experiment-url-excludes").value).map((value) => ({ mode: "exclude", operator: "contains", value }))
  ];
  const sdkConditions = uniqueList(document.querySelector("#experiment-sdk-conditions").value);
  const pageVariables = uniqueList(document.querySelector("#experiment-page-variables").value);
  const targeting = {};
  if (devices.length && !devices.includes("any")) targeting.devices = devices;
  if (urlRules.length) targeting.url_rules = urlRules;
  if (pageVariables.length) targeting.page_variables = pageVariables;
  if (sdkConditions.length) targeting.sdk_conditions = sdkConditions;
  const triggerType = document.querySelector("#experiment-trigger-type").value || "page_load";
  const triggerEvent = document.querySelector("#experiment-trigger-event").value.trim();
  const trigger = { type: triggerType };
  if (triggerEvent) trigger.event = triggerEvent;
  const consentRequired = document.querySelector("#experiment-consent-required").value === "true";
  const consentCategory = document.querySelector("#experiment-consent-category").value.trim();
  const consent = consentRequired || consentCategory
    ? { required: consentRequired, category: consentCategory, missing_result: "suppressed" }
    : null;
  return {
    display,
    ...(Object.keys(targeting).length ? { targeting } : {}),
    ...(trigger.type !== "page_load" || trigger.event ? { trigger } : {}),
    ...(consent ? { consent } : {})
  };
}

function textList(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueList(value) {
  return [...new Set(textList(value))];
}

function urlRulesToText(rules = [], mode) {
  return (Array.isArray(rules) ? rules : [])
    .filter((rule) => (rule.mode || "include") === mode)
    .map((rule) => rule.value || "")
    .filter(Boolean)
    .join(", ");
}

function defaultExperimentUrlSamples(experiment = {}) {
  const rules = Array.isArray(experiment.targeting?.url_rules) ? experiment.targeting.url_rules : [];
  const includeValues = rules.filter((rule) => (rule.mode || "include") === "include").map((rule) => rule.value).filter(Boolean);
  const excludeValues = rules.filter((rule) => rule.mode === "exclude").map((rule) => rule.value).filter(Boolean);
  const surface = experiment.surface || document.querySelector("#rule-surface")?.value || "";
  return [
    includeValues[0] ? sampleUrlFromRuleValue(includeValues[0]) : surface ? `https://example.com/${surface}` : "https://example.com/",
    excludeValues[0] ? sampleUrlFromRuleValue(excludeValues[0]) : "https://example.com/admin"
  ];
}

function sampleUrlFromRuleValue(value) {
  const text = String(value || "").trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith("/")) return `https://example.com${text}`;
  return `https://example.com/${text.replace(/^\/+/, "")}`;
}

function renderExperimentUrlPreview(experiment = readExperimentMetadata({ tolerateInvalid: true })) {
  const target = document.querySelector("#experiment-url-preview");
  if (!target) return;
  const samples = textList(document.querySelector("#experiment-url-preview-samples")?.value || "");
  const rules = experiment.targeting?.url_rules || [];
  if (!rules.length && !samples.length) {
    target.innerHTML = `<div class="status-line">Add URL include/exclude rules to preview where this experiment will show.</div>`;
    return;
  }
  const previewSamples = samples.length ? samples : defaultExperimentUrlSamples(experiment);
  target.innerHTML = `
    <div class="experiment-url-preview-head">
      <strong>URL targeting preview</strong>
      <span>${escapeHtml(rules.length ? `${rules.length} rule${rules.length === 1 ? "" : "s"}` : "No URL rules; all URLs pass.")}</span>
    </div>
    <div class="experiment-url-preview-list">
      ${previewSamples.map((url) => experimentUrlPreviewRow(url, rules)).join("")}
    </div>
  `;
}

function experimentUrlPreviewRow(url, rules = []) {
  const result = evaluateExperimentUrlRules(url, rules);
  return `
    <div class="${result.ok ? "ok" : "warn"}">
      <strong>${escapeHtml(result.ok ? "Show" : "Suppress")}</strong>
      <span>${escapeHtml(url)}</span>
      <small>${escapeHtml(result.reason)}</small>
    </div>
  `;
}

function evaluateExperimentUrlRules(url, rules = []) {
  const normalizedRules = Array.isArray(rules) ? rules : [];
  const includeRules = normalizedRules.filter((rule) => (rule.mode || "include") === "include");
  const excludeRules = normalizedRules.filter((rule) => rule.mode === "exclude");
  const includeMatch = includeRules.length === 0 || includeRules.some((rule) => experimentUrlRuleMatches(url, rule));
  if (!includeMatch) return { ok: false, reason: "No include rule matched." };
  const excludeMatch = excludeRules.find((rule) => experimentUrlRuleMatches(url, rule));
  if (excludeMatch) return { ok: false, reason: `Excluded by ${excludeMatch.operator || "contains"} "${excludeMatch.value}".` };
  return { ok: true, reason: includeRules.length ? "Matched include rules and no excludes." : "No include rules; not excluded." };
}

function experimentUrlRuleMatches(url, rule = {}) {
  const value = String(rule.value || "");
  const operator = rule.operator || "contains";
  if (!value) return false;
  if (operator === "exact") return url === value;
  if (operator === "starts_with") return url.startsWith(value);
  if (operator === "regex") {
    try {
      return new RegExp(value).test(url);
    } catch {
      return false;
    }
  }
  return url.includes(value);
}

function experimentMetadataWarnings(experiment = {}) {
  const warnings = [];
  const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
  if (!variants.length) warnings.push("No variants configured.");
  const keys = new Set();
  let total = 0;
  for (const variant of variants) {
    if (!variant.key) warnings.push("A variant is missing a key.");
    if (keys.has(variant.key)) warnings.push(`Duplicate variant key: ${variant.key}`);
    keys.add(variant.key);
    const weight = Number(variant.weight || 0);
    if (!Number.isFinite(weight) || weight < 0) warnings.push(`${variant.key || "variant"} has an invalid weight.`);
    domModificationWarnings(variant.outputs || {}).forEach((warning) => warnings.push(`${variant.key || "variant"} DOM modification: ${warning}`));
    total += Number.isFinite(weight) ? weight : 0;
  }
  if (variants.length && Math.round(total * 1000) !== 100000) warnings.push("Variant weights must sum to 100%.");
  if (experiment.status === "running" && variants.length < 2) warnings.push("Running experiments should have at least two variants.");
  const goal = experiment.goal || {};
  const schedule = experiment.schedule || {};
  if (!goal.event) warnings.push("Goal event is not configured.");
  if (!Number.isFinite(Number(goal.baseline_conversion_rate_pct)) || Number(goal.baseline_conversion_rate_pct) <= 0) warnings.push("Baseline conversion rate is required for sample guidance.");
  if (!Number.isFinite(Number(goal.minimum_detectable_lift_pct)) || Number(goal.minimum_detectable_lift_pct) <= 0) warnings.push("Minimum detectable lift must be greater than 0.");
  if (schedule.starts_at && schedule.ends_at && new Date(schedule.ends_at) <= new Date(schedule.starts_at)) warnings.push("Experiment end date must be after start date.");
  const display = experiment.display || {};
  if (display.mode && !["always", "once", "once_per_session"].includes(display.mode)) warnings.push("Display frequency must be always, once, or once per session.");
  const targeting = experiment.targeting || {};
  if (Array.isArray(targeting.devices) && targeting.devices.some((device) => !["any", "desktop", "tablet", "mobile"].includes(device))) {
    warnings.push("Target devices must use any, desktop, tablet, or mobile.");
  }
  if (Array.isArray(targeting.page_variables)) {
    const known = new Set(webTargetingCatalog().pageVariables.map((item) => item.key));
    const unknown = targeting.page_variables
      .map((item) => String(item || "").split("=")[0].trim())
      .filter((key) => key && known.size && !known.has(key));
    if (unknown.length) warnings.push(`Page variables are not in the Settings catalog: ${unknown.slice(0, 4).join(", ")}`);
  }
  if (Array.isArray(targeting.sdk_conditions)) {
    const known = new Set(webTargetingCatalog().sdkConditions.map((item) => item.key));
    const unknown = targeting.sdk_conditions.filter((key) => key && known.size && !known.has(key));
    if (unknown.length) warnings.push(`SDK conditions are not in the Settings catalog: ${unknown.slice(0, 4).join(", ")}`);
  }
  for (const rule of targeting.url_rules || []) {
    if (!rule.value) warnings.push("URL targeting rule is missing a value.");
    if (rule.operator === "regex") {
      try {
        new RegExp(rule.value);
      } catch {
        warnings.push(`URL targeting regex is invalid: ${rule.value}`);
      }
    }
  }
  const trigger = experiment.trigger || {};
  if (["data_layer_event", "custom_event"].includes(trigger.type) && !trigger.event) warnings.push("Event-triggered experiments need a trigger event name.");
  const consent = experiment.consent || {};
  if (consent.required && !consent.category) warnings.push("Consent-required experiments need a consent category.");
  if (experimentMode(experiment) === "bandit") {
    const explorationRate = Number(experiment.bandit?.exploration_rate ?? 10);
    const minExposures = Number(experiment.bandit?.min_exposures_per_variant ?? 100);
    const windowDays = Number(experiment.bandit?.window_days ?? 0);
    const freezeVariant = experiment.bandit?.freeze_variant || experiment.freeze_variant || "";
    if (!Number.isFinite(explorationRate) || explorationRate < 0 || explorationRate > 100) warnings.push("Bandit exploration rate must be between 0% and 100%.");
    if (Number.isFinite(explorationRate) && explorationRate > 50) warnings.push("Bandit exploration is high; most traffic will remain randomized.");
    if (!Number.isFinite(minExposures) || minExposures < 0) warnings.push("Bandit minimum exposures must be zero or greater.");
    if (windowDays && (!Number.isFinite(windowDays) || windowDays < 1)) warnings.push("Bandit performance window must be at least one day.");
    if (freezeVariant && !variants.some((variant) => variant.key === freezeVariant)) warnings.push(`Frozen winner ${freezeVariant} is not a configured variant.`);
  }
  return [...new Set(warnings)];
}

function experimentPlanningSummary(experiment = {}) {
  const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
  const comparableVariants = Math.max(2, variants.length || 2);
  const baselineRate = Number(experiment.goal?.baseline_conversion_rate_pct || 0) / 100;
  const lift = Number(experiment.goal?.minimum_detectable_lift_pct || 0) / 100;
  const dailyTraffic = Number(experiment.schedule?.daily_eligible_profiles || 0);
  const samplePerVariant = estimateSamplePerVariant(baselineRate, lift);
  const sampleSize = samplePerVariant ? samplePerVariant * comparableVariants : 0;
  const daysNeeded = sampleSize && dailyTraffic > 0 ? Math.ceil(sampleSize / dailyTraffic) : 0;
  const scheduledDays = scheduledExperimentDays(experiment.schedule || {});
  return {
    samplePerVariant,
    sampleSize,
    daysNeeded,
    scheduledDays,
    durationLabel: daysNeeded ? `${daysNeeded}d target` : scheduledDays ? `${scheduledDays}d scheduled` : "Needs traffic",
    enoughSchedule: Boolean(daysNeeded && scheduledDays && scheduledDays >= daysNeeded)
  };
}

function estimateSamplePerVariant(baselineRate, lift) {
  if (!Number.isFinite(baselineRate) || baselineRate <= 0 || baselineRate >= 1) return 0;
  if (!Number.isFinite(lift) || lift <= 0) return 0;
  const targetRate = Math.min(0.999, baselineRate * (1 + lift));
  const diff = Math.abs(targetRate - baselineRate);
  if (!diff) return 0;
  const pooled = (baselineRate + targetRate) / 2;
  const zAlpha = 1.96;
  const zBeta = 0.84;
  const numerator = zAlpha * Math.sqrt(2 * pooled * (1 - pooled)) + zBeta * Math.sqrt(baselineRate * (1 - baselineRate) + targetRate * (1 - targetRate));
  return Math.ceil((numerator * numerator) / (diff * diff));
}

function scheduledExperimentDays(schedule = {}) {
  if (!schedule.starts_at || !schedule.ends_at) return 0;
  const start = new Date(schedule.starts_at).getTime();
  const end = new Date(schedule.ends_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.ceil((end - start) / 86400000);
}

function renderExperimentPlanningSummary(planning, warnings = []) {
  const target = document.querySelector("#experiment-planning-summary");
  if (!target) return;
  target.innerHTML = `
    <div class="experiment-planning-card">
      <span>Sample guidance</span>
      <strong>${escapeHtml(planning.samplePerVariant ? `${formatNumber(planning.samplePerVariant)} per variant` : "Add baseline and lift")}</strong>
      <small>${escapeHtml(planning.daysNeeded ? `${formatNumber(planning.sampleSize)} total profiles · about ${planning.daysNeeded} day${planning.daysNeeded === 1 ? "" : "s"} at configured traffic` : "Daily traffic enables duration guidance.")}</small>
    </div>
    <div class="experiment-planning-card ${planning.enoughSchedule ? "ok" : planning.daysNeeded ? "warn" : ""}">
      <span>Schedule fit</span>
      <strong>${escapeHtml(planning.scheduledDays ? `${planning.scheduledDays} scheduled day${planning.scheduledDays === 1 ? "" : "s"}` : "No date window")}</strong>
      <small>${escapeHtml(planning.enoughSchedule ? "Schedule meets sample guidance." : planning.daysNeeded ? "Schedule may be too short for the target lift." : "Set start/end dates for launch planning.")}</small>
    </div>
    ${warnings.slice(0, 2).map((warning) => `
      <div class="experiment-planning-card warn">
        <span>Review</span>
        <strong>${escapeHtml(warning)}</strong>
        <small>Resolve before launch where possible.</small>
      </div>
    `).join("")}
  `;
}

function renderRuleList(options = {}) {
  const target = document.querySelector("#rule-list");
  const filtered = filteredRuleSets();
  const page = paginateInventory(filtered, "rules", { resetPage: options.resetPage });
  target.innerHTML = `
    <div class="inventory-toolbar">
      ${ruleInventorySummary(filtered)}
      ${inventoryPagerMarkup("rules", page, "rules")}
    </div>
    ${ruleListHeader()}
    <div class="inventory-list">
      ${filtered.length ? page.items.map(ruleSetRow).join("") : inventoryEmptyState("No rules match the current filters", "Broaden the search, status, type, tag, or campaign filter.")}
    </div>
  `;
  bindInventoryPager(target, "rules", renderRuleList);
  target.querySelectorAll("[data-rule-sort]").forEach((button) => {
    button.addEventListener("click", () => setRuleSort(button.dataset.ruleSort));
  });
  target.querySelectorAll("[data-rule-key]").forEach((element) => {
    element.addEventListener("click", () => loadRule(element.dataset.ruleKey));
  });
  target.querySelectorAll("[data-rule-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      runRuleAction(button.dataset.ruleAction, button.dataset.ruleKey);
    });
  });
}

function ruleListHeader() {
  return `
    <div class="inventory-header rule-list-header">
      ${[
        ["name", "Rule"],
        ["status", "Status"],
        ["type", "Type"],
        ["campaign", "Campaign"],
        ["conflicts", "Review"],
        ["updated_at", "Updated"]
      ].map(([key, label]) => `<button type="button" data-rule-sort="${key}">${escapeHtml(label)}${ruleSort.key === key ? ` ${ruleSort.direction === "asc" ? "ASC" : "DESC"}` : ""}</button>`).join("")}
      <div>Actions</div>
    </div>
  `;
}

function ruleInventorySummary(filtered) {
  const published = filtered.filter((item) => item.status === "published").length;
  const draft = filtered.filter((item) => item.status === "draft").length;
  const conflicts = filtered.reduce((count, item) => count + ruleConflictsFor(item.decision_key).length, 0);
  return `
    <div class="inventory-summary">
      <span>${formatNumber(filtered.length)} of ${formatNumber(cachedRuleSets.length)} rules</span>
      <span>${formatNumber(published)} published</span>
      <span>${formatNumber(draft)} draft</span>
      <span class="${conflicts ? "warn" : ""}">${conflicts ? `${formatNumber(conflicts)} conflicts` : "No conflicts"}</span>
    </div>
  `;
}

function setRuleSort(key) {
  if (ruleSort.key === key) {
    ruleSort.direction = ruleSort.direction === "asc" ? "desc" : "asc";
  } else {
    ruleSort = { key, direction: key === "updated_at" ? "desc" : "asc" };
  }
  inventoryPageState("rules").page = 1;
  renderRuleList();
}

function filteredRuleSets() {
  const search = document.querySelector("#rule-filter-search").value.trim().toLowerCase();
  const status = document.querySelector("#rule-filter-status").value;
  const type = document.querySelector("#rule-filter-type").value;
  const tag = document.querySelector("#rule-filter-tag").value.trim().toLowerCase();
  const campaign = document.querySelector("#rule-filter-campaign")?.value.trim().toLowerCase() || "";
  return cachedRuleSets.filter((item) => {
    const haystack = `${item.name} ${item.decision_key} ${item.description || ""} ${campaignSearchText(item.metadata || {})}`.toLowerCase();
    const tags = (item.tags || []).map((value) => String(value).toLowerCase());
    return (!search || haystack.includes(search))
      && (!status || item.status === status)
      && (!type || item.type === type)
      && (!tag || tags.some((value) => value.includes(tag)))
      && (!campaign || campaignSearchText(item.metadata || {}).includes(campaign));
  }).sort(compareRuleSetsForSort);
}

function compareRuleSetsForSort(left, right) {
  const direction = ruleSort.direction === "asc" ? 1 : -1;
  const key = ruleSort.key;
  const leftRaw = key === "campaign" ? campaignSearchText(left.metadata || {}) : key === "conflicts" ? ruleConflictsFor(left.decision_key).length : left[key];
  const rightRaw = key === "campaign" ? campaignSearchText(right.metadata || {}) : key === "conflicts" ? ruleConflictsFor(right.decision_key).length : right[key];
  const leftValue = key === "priority" || key === "version" || key === "conflicts"
    ? Number(leftRaw || 0)
    : String(leftRaw || "").toLowerCase();
  const rightValue = key === "priority" || key === "version" || key === "conflicts"
    ? Number(rightRaw || 0)
    : String(rightRaw || "").toLowerCase();
  if (leftValue < rightValue) return -1 * direction;
  if (leftValue > rightValue) return 1 * direction;
  return String(left.decision_key || "").localeCompare(String(right.decision_key || ""));
}

function ruleSetRow(item) {
  const conflicts = ruleConflictsFor(item.decision_key);
  const campaign = campaignValue(item.metadata) || folderValue(item.metadata) || "Unassigned";
  const actions = [
    `<button type="button" data-rule-action="duplicate" data-rule-key="${escapeHtml(item.decision_key)}">Duplicate</button>`,
    `<button type="button" data-rule-action="move_campaign" data-rule-key="${escapeHtml(item.decision_key)}">Move</button>`,
    item.status === "archived"
      ? ""
      : `<button type="button" data-rule-action="archive" data-rule-key="${escapeHtml(item.decision_key)}">Archive</button>`
  ].join("");
  return `
    <div class="inventory-row rule-inventory-row actionable" data-rule-key="${escapeHtml(item.decision_key)}">
      <div class="inventory-main">
        <strong>${escapeHtml(item.name || item.decision_key)}</strong>
        <small>${escapeHtml(item.decision_key)} · priority ${escapeHtml(item.priority ?? 0)} · v${escapeHtml(item.version ?? "-")}</small>
      </div>
      <div><span class="inventory-chip ${escapeHtml(item.status || "draft")}">${escapeHtml(item.status || "draft")}</span></div>
      <div><span class="inventory-chip neutral">${escapeHtml(item.type || "decision")}</span></div>
      <div class="inventory-muted">${escapeHtml(campaign)}</div>
      <div>${ruleConflictBadge(conflicts)}</div>
      <div class="inventory-muted">${escapeHtml(item.updated_at ? formatTime(item.updated_at) : "-")}</div>
      <div class="inventory-actions">${actions}</div>
    </div>
  `;
}

function ruleConflictsFor(ruleKey) {
  return cachedRuleConflicts.by_rule?.[ruleKey] || [];
}

function ruleConflictBadge(conflicts = []) {
  if (!conflicts.length) return `<span class="rule-conflict-badge none">None</span>`;
  const surfaces = [...new Set(conflicts.flatMap((conflict) => conflict.surfaces || []))].slice(0, 4).join(" vs ");
  const title = conflicts.map((conflict) => `${conflict.campaign}: ${conflict.summary}`).join("\n");
  return `
    <span class="rule-conflict-badge warn" title="${escapeHtml(title)}">
      ${escapeHtml(formatNumber(conflicts.length))} conflict${conflicts.length === 1 ? "" : "s"}
      <small>${escapeHtml(surfaces || "review")}</small>
    </span>
  `;
}

async function refreshRuleConflictsFor(ruleKey) {
  try {
    const body = await api("/v1/rule-conflicts");
    cachedRuleConflicts = {
      conflicts: body.conflicts || [],
      by_rule: body.by_rule || {}
    };
    renderRuleList();
    return ruleConflictsFor(ruleKey);
  } catch {
    return ruleConflictsFor(ruleKey);
  }
}

function confirmRuleConflictProceed(conflicts = [], actionLabel = "continue") {
  if (!conflicts.length) return true;
  const summary = conflicts.slice(0, 3).map((conflict) => `${conflict.campaign}: ${conflict.summary}`).join("\n");
  return window.confirm(`This rule has ${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"}:\n${summary}\n\nContinue to ${actionLabel}?`);
}

async function runRuleAction(action, key) {
  try {
    if (action === "archive") {
      const body = await api(`/v1/rule-sets/${encodeURIComponent(key)}/archive`, { method: "POST", body: "{}" });
      editorOutput.textContent = JSON.stringify(body, null, 2);
    } else if (action === "duplicate") {
      const copyKey = uniqueCopyKey(key);
      const body = await api(`/v1/rule-sets/${encodeURIComponent(key)}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ decision_key: copyKey, name: `${key.replaceAll("_", " ")} copy` })
      });
      editorOutput.textContent = JSON.stringify(body, null, 2);
      await loadRule(body.rule_set.decision_key);
    } else if (action === "move_campaign") {
      const item = cachedRuleSets.find((candidate) => candidate.decision_key === key);
      const target = promptCampaignMoveTarget(campaignLabelForMetadata(item?.metadata || {}));
      if (!target) return;
      const assetType = item?.type === "experiment" ? "experiment" : "rule";
      const preview = await api("/v1/campaign-assets/move", {
        method: "POST",
        body: JSON.stringify({
          assets: [{ object_type: assetType, object_id: key }],
          dry_run: true,
          ...target
        })
      });
      const ok = window.confirm(`Move ${preview.summary?.affected || 0} asset(s) to "${preview.target_campaign || "Unassigned"}"? ${preview.summary?.skipped || 0} item(s) will be skipped.`);
      if (!ok) return;
      const body = await api("/v1/campaign-assets/move", {
        method: "POST",
        body: JSON.stringify({
          assets: [{ object_type: assetType, object_id: key }],
          dry_run: false,
          ...target
        })
      });
      editorOutput.textContent = JSON.stringify(body, null, 2);
    }
    await Promise.all([loadRules(), loadMetrics()]);
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function uniqueCopyKey(key) {
  const existing = new Set(cachedRuleSets.map((item) => item.decision_key));
  for (let index = 1; index < 100; index += 1) {
    const candidate = `${key}_copy${index === 1 ? "" : `_${index}`}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${key}_copy_${Date.now()}`;
}

async function loadRule(key) {
  try {
    const body = await api(`/v1/rule-sets/${encodeURIComponent(key)}`);
    selectedRuleKey = key;
    selectedPublishedDefinition = body.version?.definition || null;
    selectedPublishedMetadata = body.version?.metadata || null;
    selectedRuleMetadata = body.rule_set.metadata || {};
    document.querySelector("#rule-name").value = body.rule_set.name;
    document.querySelector("#rule-key").value = body.rule_set.decision_key;
    updateRuleKeyLockState(true);
    document.querySelector("#rule-type").value = body.rule_set.type || "decision";
    document.querySelector("#rule-priority").value = body.rule_set.priority || 0;
    document.querySelector("#rule-surface").value = body.rule_set.surface || "";
    document.querySelector("#rule-client-ttl").value = body.rule_set.cache_policy?.client_ttl ?? "";
    document.querySelector("#rule-cache-scope").value = body.rule_set.cache_policy?.scope || (body.rule_set.cache_policy?.client_ttl ? "profile" : "none");
    document.querySelector("#rule-dependency-failure-mode").value = body.rule_set.cache_policy?.dependency_failure_mode || "evaluate";
    document.querySelector("#rule-dependency-failure-outputs").value = body.rule_set.cache_policy?.dependency_failure_outputs
      ? JSON.stringify(body.rule_set.cache_policy.dependency_failure_outputs)
      : "";
    document.querySelector("#rule-campaign").value = campaignValue(body.rule_set.metadata);
    document.querySelector("#rule-folder").value = folderValue(body.rule_set.metadata);
    document.querySelector("#rule-description").value = body.rule_set.description || "";
    setExperimentMetadata(body.rule_set.metadata?.experiment || body.version?.metadata?.experiment || {});
    document.querySelector("#rule-draft").value = JSON.stringify(
      body.draft || body.version?.definition || { fallback: { result: "deferred", outputs: {} }, branches: [] },
      null,
      2
    );
    syncBuilderFromJson();
    await loadVersions(key);
    renderRuleInspector();
    editorOutput.textContent = `Loaded ${key}`;
    openRuleDetail();
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function newRule(options = {}) {
  selectedRuleKey = null;
  selectedPublishedDefinition = null;
  selectedPublishedMetadata = null;
  selectedRuleMetadata = {};
  const type = options.type || "decision";
  const defaults = ruleCreationDefaults(type);
  document.querySelector("#rule-name").value = defaults.name;
  document.querySelector("#rule-key").value = uniqueCopyKey(defaults.key);
  document.querySelector("#rule-key").disabled = false;
  updateRuleKeyLockState(false);
  document.querySelector("#rule-type").value = type;
  document.querySelector("#rule-priority").value = defaults.priority;
  document.querySelector("#rule-surface").value = defaults.surface;
  document.querySelector("#rule-client-ttl").value = defaults.ttl;
  document.querySelector("#rule-cache-scope").value = defaults.scope;
  document.querySelector("#rule-dependency-failure-mode").value = defaults.dependencyFailureMode || "evaluate";
  document.querySelector("#rule-dependency-failure-outputs").value = "";
  document.querySelector("#rule-campaign").value = "";
  document.querySelector("#rule-folder").value = "";
  document.querySelector("#rule-description").value = defaults.description;
  setExperimentMetadata(type === "experiment" ? {
    status: "draft",
    unit: "profile",
    goal: {
      event: "conversion",
      minimum_detectable_lift_pct: 10,
      baseline_conversion_rate_pct: 5
    },
    schedule: {
      starts_at: "",
      ends_at: "",
      daily_eligible_profiles: 1000
    },
    variants: defaultExperimentVariants()
  } : {});
  document.querySelector("#fallback-result").value = "ineligible";
  document.querySelector("#fallback-outputs").value = "{}";
  versionList.innerHTML = row(["No published versions yet", "", "", "", ""]);
  document.querySelector("#builder-mode").value = "branches";
  graphBuilder = starterGraphBuilder();
  builderBranches = [newBranch(1)];
  renderBranchEditor();
  renderBuilderMode();
  syncJsonFromBuilder();
  renderRuleInspector();
  editorOutput.textContent = "Ready for a new draft";
  if (!options.silent) openRuleDetail();
}

function ruleCreationDefaults(type) {
  if (type === "experiment") {
    return {
      name: "New Experiment",
      key: "new_experiment",
      priority: 20,
      surface: "homepage_hero",
      ttl: "300",
      scope: "profile",
      dependencyFailureMode: "fail_open",
      description: "Experiment draft."
    };
  }
  if (type === "inapp_message") {
    return {
      name: "New In-app Message Rule",
      key: "new_inapp_message_rule",
      priority: 10,
      surface: "homepage_hero",
      ttl: "300",
      scope: "profile",
      dependencyFailureMode: "fail_open",
      description: "In-app message eligibility rule."
    };
  }
  return {
    name: "New Decision Rule",
    key: "new_decision_rule",
    priority: 0,
    surface: "",
    ttl: "",
    scope: "none",
    description: ""
  };
}

function updateRuleKeyLockState(locked) {
  const input = document.querySelector("#rule-key");
  const note = document.querySelector("#rule-key-lock-note");
  if (!input) return;
  input.disabled = Boolean(locked);
  input.title = locked
    ? "Decision keys are locked after save/publish because clients call this key directly."
    : "Use lowercase letters, numbers, and underscores. This key locks after save.";
  if (note) {
    note.textContent = locked
      ? "Locked because client integrations call this key. Duplicate the rule to create a new key."
      : "Use lowercase letters, numbers, and underscores. This key locks after save.";
  }
}

function quickCreateExperiment() {
  switchView("rules");
  newRule({ silent: true });
  const suffix = new Date().toISOString().slice(0, 10).replaceAll("-", "_");
  document.querySelector("#rule-name").value = "New Homepage Experiment";
  document.querySelector("#rule-key").value = uniqueCopyKey(`homepage_experiment_${suffix}`);
  document.querySelector("#rule-type").value = "experiment";
  document.querySelector("#rule-surface").value = "homepage_hero";
  document.querySelector("#rule-client-ttl").value = "300";
  document.querySelector("#rule-cache-scope").value = "profile";
  document.querySelector("#rule-dependency-failure-mode").value = "fail_open";
  document.querySelector("#rule-dependency-failure-outputs").value = '{"message":"Temporary fallback"}';
  document.querySelector("#rule-description").value = "Experiment draft created from shortcut.";
  setExperimentMetadata({
    status: "draft",
    unit: "profile",
    goal: {
      event: "conversion",
      minimum_detectable_lift_pct: 10,
      baseline_conversion_rate_pct: 5
    },
    schedule: {
      starts_at: "",
      ends_at: "",
      daily_eligible_profiles: 1000
    },
    variants: defaultExperimentVariants()
  });
  renderRuleInspector();
  syncJsonFromBuilder();
  editorOutput.textContent = "Experiment draft ready. Review variants, goal, schedule, then save.";
  openRuleDetail();
}

async function saveDraft(event) {
  event.preventDefault();
  try {
    syncJsonFromBuilder();
    const payload = readEditorPayload();
    validateDraft(payload.draft);
    const warnings = schemaReferenceWarnings(payload.draft);
    const path = selectedRuleKey ? `/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/draft` : "/v1/rule-sets";
    const body = await api(path, {
      method: selectedRuleKey ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    selectedRuleKey = body.rule_set.decision_key;
    selectedRuleMetadata = body.rule_set.metadata || payload.metadata || {};
    updateRuleKeyLockState(true);
    editorOutput.textContent = `${JSON.stringify(body, null, 2)}${formatSchemaWarnings(warnings)}`;
    await loadRules();
    renderRuleInspector();
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

async function submitSelectedRuleForReview() {
  if (!selectedRuleKey) {
    editorOutput.textContent = "Save the draft before submitting for review";
    return;
  }
  try {
    syncJsonFromBuilder();
    const payload = readEditorPayload();
    validateDraft(payload.draft);
    const warnings = schemaReferenceWarnings(payload.draft);
    if (warnings.length) throw new Error(`Cannot submit with broken schema references:\n${warnings.map((item) => `- ${item}`).join("\n")}`);
    await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/draft`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const conflicts = await refreshRuleConflictsFor(selectedRuleKey);
    if (!confirmRuleConflictProceed(conflicts, "submit this draft for review")) return;
    const assignedTo = window.prompt("Assign review to (name or email)", "") || "";
    const note = window.prompt("Submission comment", "Please review this draft.") || "";
    const body = await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/submit-review`, {
      method: "POST",
      body: JSON.stringify({ note, assigned_to: assignedTo })
    });
    editorOutput.textContent = JSON.stringify(body, null, 2);
    await loadRules();
    renderRuleInspector();
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

async function approveSelectedRuleDraft() {
  if (!selectedRuleKey) {
    editorOutput.textContent = "Save the draft before approval";
    return;
  }
  try {
    const conflicts = await refreshRuleConflictsFor(selectedRuleKey);
    if (!confirmRuleConflictProceed(conflicts, "approve this draft")) return;
    const note = window.prompt("Approval comment", "Approved for publish.") || "";
    const body = await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/approve`, {
      method: "POST",
      body: JSON.stringify({ note })
    });
    editorOutput.textContent = JSON.stringify(body, null, 2);
    await loadRules();
    renderRuleInspector();
    if (!publishConfirmModal.hidden) {
      const payload = readEditorPayload();
      renderPublishReview(payload, schemaReferenceWarnings(payload.draft));
    }
  } catch (error) {
    editorOutput.textContent = error.message;
    if (!publishConfirmModal.hidden) renderPublishReviewError(error);
  }
}

async function publishSelectedRule() {
  if (!selectedRuleKey) {
    editorOutput.textContent = "Save the draft before publishing";
    return;
  }
  try {
    syncJsonFromBuilder();
    const payload = readEditorPayload();
    validateDraft(payload.draft);
    const warnings = schemaReferenceWarnings(payload.draft);
    await refreshRuleConflictsFor(selectedRuleKey);
    renderPublishReview(payload, warnings);
    openPublishConfirm();
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

async function confirmPublishSelectedRule() {
  if (!selectedRuleKey) return;
  const button = document.querySelector("#confirm-publish-rule");
  button.disabled = true;
  try {
    syncJsonFromBuilder();
    const payload = readEditorPayload();
    validateDraft(payload.draft);
    const warnings = schemaReferenceWarnings(payload.draft);
    if (warnings.length) throw new Error(`Cannot publish with broken schema references:\n${warnings.map((item) => `- ${item}`).join("\n")}`);
    const conflicts = await refreshRuleConflictsFor(selectedRuleKey);
    if (!confirmRuleConflictProceed(conflicts, "publish this rule")) return;
    const body = await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/publish`, { method: "POST", body: "{}" });
    editorOutput.textContent = JSON.stringify(body, null, 2);
    selectedPublishedDefinition = payload.draft;
    selectedPublishedMetadata = payload.metadata || {};
    selectedRuleMetadata = payload.metadata || selectedRuleMetadata;
    closePublishConfirm();
    await loadRules();
    await loadVersions(selectedRuleKey);
    renderRuleInspector();
  } catch (error) {
    editorOutput.textContent = error.message;
    renderPublishReviewError(error);
  } finally {
    button.disabled = false;
  }
}

function renderPublishReview(payload, schemaWarnings = []) {
  const draft = payload.draft;
  const stats = draftPublishStats(draft);
  const definitionChanges = clientDiffValues(selectedPublishedDefinition || {}, draft);
  const metadataChanges = clientDiffValues(selectedPublishedMetadata || {}, payload.metadata || {}).map((item) => ({
    ...item,
    path: `metadata${item.path.replace(/^\$/, "")}`
  }));
  const changes = [...definitionChanges, ...metadataChanges].slice(0, 40);
  const validations = publishValidationItems(payload, schemaWarnings);
  const selected = cachedRuleSets.find((item) => item.decision_key === selectedRuleKey);
  const approval = selected?.metadata?.approval || {};
  const summaryItems = [
    statusItem("Decision key", payload.decision_key || "-"),
    statusItem("Branches", stats.branches),
    statusItem("Outputs", stats.outputs),
    statusItem("TTL", payload.cache_policy?.client_ttl ? `${payload.cache_policy.client_ttl}s` : "No response TTL")
  ];
  if (approvalWorkflowEnabled()) summaryItems.splice(1, 0, statusItem("Approval", approvalLabel(approval)));
  publishConfirmSummary.innerHTML = summaryItems.join("");
  publishConfirmDiff.innerHTML = changes.length
    ? changes.map((item) => `
      <div class="publish-diff-item">
        <strong>${escapeHtml(item.path)}</strong>
        <span>${escapeHtml(item.type)}</span>
      </div>
    `).join("")
    : `<div class="publish-diff-item"><strong>No draft changes detected</strong><span>Current draft matches the latest published definition.</span></div>`;
  publishConfirmValidation.innerHTML = validations.map((item) => `
    <div class="publish-validation-item ${item.level === "warn" ? "warn" : ""}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    </div>
  `).join("");
  document.querySelector("#confirm-publish-rule").disabled = (approvalWorkflowEnabled() && approval.status !== "approved") || schemaWarnings.length > 0 || hasBlockingExperimentWarnings(payload);
  document.querySelector("#approve-publish-rule").disabled = approval.status !== "submitted";
  renderApprovalWorkflowControls();
}

function renderPublishReviewError(error) {
  publishConfirmValidation.innerHTML = `
    <div class="publish-validation-item warn">
      <strong>Publish failed</strong>
      <span>${escapeHtml(error.message)}</span>
    </div>
  `;
}

function approvalLabel(approval = {}) {
  if (approval.status === "approved") return `Approved${approval.approved_by ? ` by ${approval.approved_by}` : ""}`;
  if (approval.status === "submitted") return `Submitted${approval.assigned_to ? ` to ${approval.assigned_to}` : approval.requested_by ? ` by ${approval.requested_by}` : ""}`;
  if (approval.status === "draft") return "Draft changed";
  return "Not submitted";
}

function draftPublishStats(draft) {
  if (draft.graph) {
    const outputs = (draft.graph.nodes || []).filter((node) => node.type === "output").length;
    return { branches: `${draft.graph.nodes?.length || 0} nodes`, outputs };
  }
  const branches = draft.branches || [];
  const outputs = branches.reduce((count, branch) => count + Object.keys(branch.outputs || {}).length, 0);
  return { branches: branches.length, outputs };
}

function publishValidationItems(payload, schemaWarnings = []) {
  const draft = payload.draft || {};
  const items = [
    { title: "Draft schema", detail: "JSON structure is valid and executable.", level: "ok" },
    { title: "Affected rule", detail: `${payload.name || payload.decision_key} will publish as ${payload.type || "decision"}.`, level: "ok" }
  ];
  if (payload.cache_policy?.client_ttl) {
    items.push({ title: "Response TTL", detail: `${payload.cache_policy.client_ttl}s cache hint using ${payload.cache_policy.scope || "profile"} scope.`, level: "ok" });
  } else {
    items.push({ title: "Response TTL", detail: "No client-side cache hint is configured.", level: "warn" });
  }
  const branchWarnings = branchPublishWarnings(draft);
  const experimentWarnings = experimentPublishWarnings(payload);
  const conflictWarnings = ruleConflictsFor(selectedRuleKey);
  const selected = cachedRuleSets.find((item) => item.decision_key === selectedRuleKey);
  const approval = selected?.metadata?.approval || {};
  if (approvalWorkflowEnabled()) {
    if (approval.status === "approved") {
      items.push({ title: "Approval", detail: `Approved by ${approval.approved_by || "publisher"}.`, level: "ok" });
    } else if (approval.status === "submitted") {
      items.push({ title: "Approval required", detail: "Draft is submitted for review. Approve it before publishing.", level: "warn" });
    } else {
      items.push({ title: "Approval required", detail: "Submit this draft for review, then approve it before publishing.", level: "warn" });
    }
  }
  if (schemaWarnings.length) {
    items.push({ title: "Publish blocked", detail: "Fix schema reference warnings before publishing this rule.", level: "warn" });
  }
  if (conflictWarnings.length) {
    items.push({
      title: "Rule conflict",
      detail: `${conflictWarnings.length} cross-surface eligibility conflict${conflictWarnings.length === 1 ? "" : "s"} detected. Review campaign and rule inventory before launch.`,
      level: "warn"
    });
  }
  [...schemaWarnings, ...branchWarnings, ...experimentWarnings].forEach((warning) => {
    items.push({ title: "Review warning", detail: warning, level: "warn" });
  });
  return items;
}

function experimentPublishWarnings(payload) {
  if (payload.type !== "experiment") return [];
  const experiment = payload.metadata?.experiment || {};
  const warnings = [
    ...experimentMetadataWarnings(experiment),
    ...experimentFreezeWarnings(payload)
  ];
  if (experiment.status !== "running") {
    warnings.push(`Experiment will publish with status ${experiment.status || "draft"}; no variants will be assigned until status is running.`);
  }
  return [...new Set(warnings)];
}

function hasBlockingExperimentWarnings(payload) {
  if (payload.type !== "experiment") return false;
  const warnings = experimentMetadataWarnings(payload.metadata?.experiment || {});
  return warnings.some((warning) =>
    warning.includes("must sum to 100") ||
    warning.includes("missing a key") ||
    warning.includes("Duplicate variant key") ||
    warning.includes("invalid weight") ||
    warning.includes("Variant weights must sum to 100%") ||
    warning.includes("No variants")
  );
}

function variantAllocationSignature(variants = []) {
  return Array.isArray(variants) && variants.length
    ? variants.map((variant) => `${variant.key}:${Number(variant.weight || 0)}`).join(", ")
    : "";
}

function experimentFreezeWarnings(payload = {}) {
  if (payload.type !== "experiment") return [];
  const current = selectedPublishedMetadata?.experiment || {};
  if (!selectedPublishedDefinition || current.status !== "running") return [];
  const next = payload.metadata?.experiment || {};
  const warnings = [];
  const currentAllocation = variantAllocationSignature(current.variants);
  const nextAllocation = variantAllocationSignature(next.variants);
  if (currentAllocation && nextAllocation && currentAllocation !== nextAllocation) {
    warnings.push(`Active experiment freeze: allocation changes from ${currentAllocation} to ${nextAllocation}. Existing assignment distribution can shift.`);
  }
  const currentKeys = variantKeySignature(current.variants);
  const nextKeys = variantKeySignature(next.variants);
  if (currentKeys && nextKeys && currentKeys !== nextKeys) {
    warnings.push(`Active experiment freeze: variant keys change from ${currentKeys} to ${nextKeys}. Existing assignments and reports may split.`);
  }
  const currentOutputs = variantOutputSignature(current.variants);
  const nextOutputs = variantOutputSignature(next.variants);
  if (currentOutputs && nextOutputs && currentOutputs !== nextOutputs) {
    warnings.push("Active experiment freeze: variant outputs changed. Users already bucketed into a variant may see different content.");
  }
  if (current.unit && next.unit && current.unit !== next.unit) {
    warnings.push(`Active experiment freeze: assignment unit changes from ${current.unit} to ${next.unit}. Existing users may be re-bucketed.`);
  }
  if (stableStringify(current.goal || {}) !== stableStringify(next.goal || {})) {
    warnings.push("Active experiment freeze: goal settings changed. Conversion-rate and sample guidance may no longer be comparable.");
  }
  if (stableStringify(current.schedule || {}) !== stableStringify(next.schedule || {})) {
    warnings.push("Active experiment freeze: schedule settings changed while the experiment is running.");
  }
  if (stableStringify(current.display || {}) !== stableStringify(next.display || {})) {
    warnings.push("Active experiment freeze: display policy changed while the experiment is running.");
  }
  if (stableStringify(current.targeting || {}) !== stableStringify(next.targeting || {})) {
    warnings.push("Active experiment freeze: delivery targeting changed while the experiment is running.");
  }
  if (stableStringify(current.trigger || {}) !== stableStringify(next.trigger || {})) {
    warnings.push("Active experiment freeze: trigger settings changed while the experiment is running.");
  }
  if (stableStringify(current.consent || {}) !== stableStringify(next.consent || {})) {
    warnings.push("Active experiment freeze: consent requirements changed while the experiment is running.");
  }
  if (payload.draft && ruleEligibilitySignature(selectedPublishedDefinition) !== ruleEligibilitySignature(payload.draft)) {
    warnings.push("Active experiment freeze: eligibility logic changed. The experiment audience may no longer match the launched population.");
  }
  return [...new Set(warnings)];
}

function currentDraftForWarnings() {
  try {
    return JSON.parse(document.querySelector("#rule-draft")?.value || "{}");
  } catch {
    return null;
  }
}

function variantKeySignature(variants = []) {
  return Array.isArray(variants) && variants.length
    ? variants.map((variant) => variant.key || "").filter(Boolean).sort().join(", ")
    : "";
}

function variantOutputSignature(variants = []) {
  if (!Array.isArray(variants) || !variants.length) return "";
  return stableStringify(
    variants
      .map((variant) => ({ key: variant.key || "", outputs: variant.outputs || {} }))
      .sort((left, right) => left.key.localeCompare(right.key))
  );
}

function ruleEligibilitySignature(draft = {}) {
  if (draft.graph) {
    return stableStringify({
      entry: draft.graph.entry,
      nodes: (draft.graph.nodes || [])
        .filter((node) => !["output", "fallback"].includes(node.type))
        .map((node) => ({ ...node, outputs: undefined, defaults: undefined }))
    });
  }
  return stableStringify({
    fallback_result: draft.fallback?.result || "",
    branches: (draft.branches || []).map((branch) => ({
      id: branch.id || "",
      when: branch.when || {},
      result: branch.result || ""
    }))
  });
}

function branchPublishWarnings(draft) {
  if (!draft || draft.graph) return [];
  const warnings = [];
  for (const branch of draft.branches || []) {
    const id = branch.id || branch.label || "branch";
    const outputs = branch.outputs || {};
    if (Object.keys(outputs).length === 0) warnings.push(`${id} has no output fields.`);
    if (outputs.expires_at && Number.isNaN(Date.parse(outputs.expires_at))) warnings.push(`${id} has an invalid expires_at value.`);
  }
  return warnings;
}

async function loadVersions(key) {
  versionList.innerHTML = header(["Version", "Published", "Author", "Approval", "Actions"]);
  try {
    const body = await api(`/v1/rule-sets/${encodeURIComponent(key)}/versions`);
    renderRuleGovernanceTimeline(body.versions || []);
    if (!body.versions.length) {
      versionList.innerHTML += row(["No published versions yet", "", "", "", ""]);
      return;
    }
    versionList.innerHTML += body.versions
      .slice()
      .reverse()
      .map((version) =>
        row(
          [
            version.version,
            version.published_at,
            version.author,
            approvalLabel(version.metadata?.approval || {}),
            [
              `<button type="button" data-version-action="diff" data-version="${version.version}">Diff</button>`,
              `<button type="button" data-version-action="rollback" data-version="${version.version}">Rollback</button>`
            ].join("")
          ],
          { rawColumns: [4] }
        )
      )
      .join("");
    document.querySelectorAll("[data-version-action]").forEach((button) => {
      button.addEventListener("click", () => runVersionAction(button.dataset.versionAction, Number(button.dataset.version)));
    });
  } catch (error) {
    renderRuleGovernanceTimeline([]);
    versionList.innerHTML += row([error.message, "", "", "", ""]);
  }
}

function renderRuleGovernanceTimeline(versions = []) {
  if (!ruleGovernanceTimeline) return;
  const approvalHistory = selectedRuleMetadata?.approval?.history || [];
  const events = [
    ...approvalHistory.map((item) => ({
      at: item.at,
      title: approvalTimelineTitle(item.status),
      detail: [item.by, item.assigned_to ? `to ${item.assigned_to}` : "", item.note].filter(Boolean).join(" · ")
    })),
    ...versions.map((version) => ({
      at: version.published_at,
      title: `Published v${version.version}`,
      detail: [version.author, approvalLabel(version.metadata?.approval || {})].filter(Boolean).join(" · ")
    }))
  ].filter((item) => item.at || item.title)
    .sort((left, right) => new Date(right.at || 0) - new Date(left.at || 0))
    .slice(0, 8);
  ruleGovernanceTimeline.innerHTML = events.length
    ? events.map((item) => `
      <div class="timeline-item">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.at ? formatTime(item.at) : "-")}</span>
        <small>${escapeHtml(item.detail || "No comment")}</small>
      </div>
    `).join("")
    : `<div class="timeline-empty">No governance events yet.</div>`;
}

function approvalTimelineTitle(status = "") {
  return {
    submitted: "Submitted for review",
    approved: "Approved draft",
    draft: "Draft changed"
  }[status] || status || "Governance event";
}

async function runVersionAction(action, version) {
  if (!selectedRuleKey) return;
  try {
    if (action === "diff") {
      const body = await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/versions/${version}/diff?compare_to=draft`);
      editorOutput.textContent = formatVersionDiff(body);
    } else if (action === "rollback") {
      const body = await api(`/v1/rule-sets/${encodeURIComponent(selectedRuleKey)}/versions/${version}/rollback`, {
        method: "POST",
        body: "{}"
      });
      document.querySelector("#rule-draft").value = JSON.stringify(body.draft, null, 2);
      syncBuilderFromJson();
      editorOutput.textContent = JSON.stringify(body, null, 2);
      await loadRules();
      await loadVersions(selectedRuleKey);
    }
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function formatVersionDiff(body) {
  if (!body.diff.length) return `No changes between version ${body.left.version} and ${body.right.version}`;
  return JSON.stringify({
    comparing: {
      from: body.left,
      to: body.right
    },
    changes: body.diff
  }, null, 2);
}

async function exportConfig() {
  try {
    const body = await api("/v1/export");
    cachedConfigBundle = body;
    if (configExportOutput) configExportOutput.textContent = JSON.stringify(body, null, 2);
    if (configExportSummary) configExportSummary.innerHTML = renderBundleSummary(body);
    if (configImportInput && !configImportInput.value.trim()) {
      configImportInput.value = JSON.stringify(body, null, 2);
      previewConfigImport();
    }
  } catch (error) {
    if (configExportOutput) configExportOutput.textContent = error.message;
    else editorOutput.textContent = error.message;
  }
}

function downloadConfig() {
  if (!cachedConfigBundle) {
    if (configExportOutput) configExportOutput.textContent = "Export a bundle before downloading.";
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadTextFile(JSON.stringify(cachedConfigBundle, null, 2), `meiro-dee-config-${stamp}.json`, "application/json");
}

function downloadTextFile(text, filename, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function previewConfigImport() {
  try {
    const bundle = readConfigImportBundle();
    if (configImportSummary) configImportSummary.innerHTML = renderBundleSummary(bundle);
    if (configImportOutput) {
      configImportOutput.textContent = JSON.stringify(
        {
          ready: true,
          kind: bundle.kind,
          counts: bundleCounts(bundle),
          settings_secrets_redacted: bundle.settings_secrets_redacted || []
        },
        null,
        2
      );
    }
  } catch (error) {
    if (configImportSummary) configImportSummary.innerHTML = "";
    if (configImportOutput) configImportOutput.textContent = error.message;
  }
}

async function importConfig() {
  try {
    const bundle = readConfigImportBundle();
    if (!confirm(`Import this configuration bundle?\n\n${bundleSummaryText(bundle)}\n\nExisting objects with matching IDs will be updated.`)) return;
    const body = await api("/v1/import", {
      method: "POST",
      body: JSON.stringify(bundle)
    });
    if (configImportOutput) configImportOutput.textContent = JSON.stringify(body, null, 2);
    if (configImportSummary) {
      configImportSummary.innerHTML = renderImportResult(body.imported || {}, bundle.settings_secrets_redacted || []);
    }
    await Promise.all([
      loadRules(),
      loadLookups(),
      loadMessages(),
      loadSettings(),
      loadConditionBlocks({ silent: true }),
      loadSchema({ silent: true })
    ]);
  } catch (error) {
    if (configImportOutput) configImportOutput.textContent = error.message;
  }
}

function readConfigImportBundle() {
  const raw = configImportInput?.value.trim();
  if (!raw) throw new Error("Paste a config bundle JSON before previewing or importing.");
  const bundle = JSON.parse(raw);
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) throw new Error("Config bundle must be a JSON object.");
  if (bundle.kind !== "meiro-dee-config-bundle") throw new Error("Unsupported config bundle kind.");
  return bundle;
}

function bundleCounts(bundle) {
  const settings = bundle.settings && typeof bundle.settings === "object" && !Array.isArray(bundle.settings)
    ? Object.keys(bundle.settings).length
    : 0;
  return {
    rule_sets: (bundle.rule_sets || []).length,
    lookup_tables: (bundle.lookup_tables || []).length,
    messages: (bundle.messages || []).length,
    condition_blocks: (bundle.condition_blocks || []).length,
    settings
  };
}

function renderBundleSummary(bundle) {
  const counts = bundleCounts(bundle);
  const redacted = (bundle.settings_secrets_redacted || []).join(", ") || "none";
  return `
    <div class="status-item"><span>Rule sets</span><strong>${formatNumber(counts.rule_sets)}</strong></div>
    <div class="status-item"><span>Reference tables</span><strong>${formatNumber(counts.lookup_tables)}</strong></div>
    <div class="status-item"><span>Messages</span><strong>${formatNumber(counts.messages)}</strong></div>
    <div class="status-item"><span>Condition blocks</span><strong>${formatNumber(counts.condition_blocks)}</strong></div>
    <div class="status-item"><span>Portable settings</span><strong>${formatNumber(counts.settings)}</strong></div>
    <div class="status-item wide"><span>Secrets redacted</span><strong>${escapeHtml(redacted)}</strong></div>
  `;
}

function renderImportResult(imported, redactedSecrets) {
  const redacted = redactedSecrets.join(", ") || "none";
  return `
    <div class="status-item"><span>Imported rules</span><strong>${formatNumber(imported.rule_sets || 0)}</strong></div>
    <div class="status-item"><span>Imported tables</span><strong>${formatNumber(imported.lookup_tables || 0)}</strong></div>
    <div class="status-item"><span>Imported messages</span><strong>${formatNumber(imported.messages || 0)}</strong></div>
    <div class="status-item"><span>Imported blocks</span><strong>${formatNumber(imported.condition_blocks || 0)}</strong></div>
    <div class="status-item"><span>Applied settings</span><strong>${formatNumber(imported.settings || 0)}</strong></div>
    <div class="status-item wide"><span>Secrets unchanged</span><strong>${escapeHtml(redacted)}</strong></div>
  `;
}

function bundleSummaryText(bundle) {
  const counts = bundleCounts(bundle);
  return [
    `${counts.rule_sets} rule sets`,
    `${counts.lookup_tables} reference tables`,
    `${counts.messages} messages`,
    `${counts.condition_blocks} condition blocks`,
    `${counts.settings} portable settings`
  ].join("\n");
}

async function loadAudit() {
  renderAuditModeFields();
  if (document.querySelector("#audit-mode")?.value === "client_events") return loadClientEventAudit();
  return loadDecisionAudit();
}

async function loadDecisionAudit() {
  const target = document.querySelector("#audit-list");
  target.dataset.auditMode = "decisions";
  target.innerHTML = header(["Decision / time", "Outcome", "Profile", "Matched", "Summary"]);
  renderAuditLoadingState("Loading decision audit…");
  try {
    const params = auditParams();
    const body = await api(`/v1/audit${params.toString() ? `?${params}` : ""}`);
    const audit = filterAuditByCampaign(body.audit || []);
    target.innerHTML += audit.length
      ? audit.map((item, index) => row(renderDecisionAuditRow(item), { auditIndex: index, rawColumns: [0, 1, 2, 3, 4] })).join("")
      : row([
          auditEmptyState("No decision audit entries match the current filters.", "Try clearing a preset, widening the date range, or removing a campaign filter."),
          "",
          "",
          "",
          ""
        ], { rawColumns: [0] });
    renderAuditSummary(audit);
    target.querySelectorAll("[data-audit-index]").forEach((element) => {
      element.addEventListener("click", () => {
        setActiveAuditRow(Number(element.dataset.auditIndex));
        renderAuditDetail(audit[Number(element.dataset.auditIndex)]);
      });
    });
    setActiveAuditRow(0);
    renderAuditDetail(audit[0]);
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", ""]);
    renderAuditSummary([]);
    if (auditDetailExtra) auditDetailExtra.innerHTML = auditEmptyState("Audit loading failed.", error.message);
    auditDetail.textContent = error.message;
  }
}

async function loadClientEventAudit() {
  const target = document.querySelector("#audit-list");
  target.dataset.auditMode = "client_events";
  target.innerHTML = header(["Rule / time", "Type", "Profile", "Object", "Context"]);
  renderAuditLoadingState("Loading client feedback…");
  try {
    const params = auditParams();
    params.set("limit", document.querySelector("#audit-limit").value || "100");
    params.set("recent_limit", document.querySelector("#audit-limit").value || "100");
    const body = await api(`/v1/metrics/client-events${params.toString() ? `?${params}` : ""}`);
    const events = filterAuditByCampaign(body.metrics?.recent_events || []);
    target.innerHTML += events.length
      ? events.map((item, index) => row(renderClientEventAuditRow(item), { auditIndex: index, rawColumns: [0, 1, 2, 3, 4] })).join("")
      : row([
          auditEmptyState("No client feedback events match the current filters.", "Try a broader date range or switch from skipped-only to all feedback events."),
          "",
          "",
          "",
          ""
        ], { rawColumns: [0] });
    renderClientEventAuditSummary(events, body.metrics || {});
    target.querySelectorAll("[data-audit-index]").forEach((element) => {
      element.addEventListener("click", () => {
        setActiveAuditRow(Number(element.dataset.auditIndex));
        renderClientEventAuditDetail(events[Number(element.dataset.auditIndex)]);
      });
    });
    setActiveAuditRow(0);
    renderClientEventAuditDetail(events[0]);
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", ""]);
    renderClientEventAuditSummary([], {});
    if (auditDetailExtra) auditDetailExtra.innerHTML = auditEmptyState("Client feedback loading failed.", error.message);
    auditDetail.textContent = error.message;
  }
}

function renderAuditSummary(audit) {
  const count = audit.length;
  auditCount.textContent = `${formatNumber(count)} event${count === 1 ? "" : "s"}`;
  const first = audit[0]?.evaluated_at ? formatTime(audit[0].evaluated_at) : "Latest first";
  const last = audit.at(-1)?.evaluated_at ? formatTime(audit.at(-1).evaluated_at) : "";
  auditRange.textContent = last ? `${first} to ${last}` : first;
  renderAuditInsights(audit);
}

function renderAuditLoadingState(message = "Loading audit events…") {
  const target = document.querySelector("#audit-list");
  if (target) {
    target.innerHTML += row([
      auditEmptyState(message, "Hold on while DEE refreshes the latest matching events."),
      "",
      "",
      "",
      ""
    ], { rawColumns: [0] });
  }
  auditCount.textContent = "Loading…";
  auditRange.textContent = "Fetching latest events";
  if (auditInsights) {
    auditInsights.innerHTML = [
      statusItem("Top decision", "…"),
      statusItem("Top result", "…"),
      statusItem("Matched rate", "…"),
      statusItem("Profiles", "…")
    ].join("");
  }
  if (auditDetailMeta) {
    auditDetailMeta.textContent = "Refreshing audit selection and detail context.";
  }
}

function renderDecisionAuditRow(item = {}) {
  const outputs = item.outputs && typeof item.outputs === "object" ? item.outputs : {};
  const outputCount = Object.keys(outputs).filter((key) => key !== "message").length;
  const source = item.inputs?.request_source || item.context?.request_source || "runtime";
  const surface = item.inputs?.surface || item.surface || item.outputs?.message?.surface || "-";
  const matched = item.matched_rules?.length ? item.matched_rules.join(", ") : "fallback";
  const resultLabel = (item.result || "-").replace(/_/g, " ");
  const summary = [
    surface !== "-" ? surface : "",
    outputCount ? `${outputCount} output${outputCount === 1 ? "" : "s"}` : "",
    profileEnrichmentStatusLabel(item.profile_cache?.status || item.inputs?.profile_enrichment || "") || source
  ].filter(Boolean).join(" · ");
  return [
    `
      <div class="audit-cell-stack">
        <strong>${escapeHtml(item.decision_key || "-")}</strong>
        <small>${escapeHtml(formatTime(item.evaluated_at))}</small>
      </div>
    `,
    `
      <div class="audit-cell-stack audit-cell-outcome">
        <span class="audit-badge ${escapeHtml(auditOutcomeTone(item.result))}">${escapeHtml(resultLabel)}</span>
        <small>${escapeHtml(item.rule_version != null ? `v${item.rule_version}` : "draft/runtime")}</small>
      </div>
    `,
    `
      <div class="audit-cell-stack">
        <strong class="audit-inline-key">${escapeHtml(item.profile_key || "-")}</strong>
        <small>${escapeHtml(source)}</small>
      </div>
    `,
    `
      <div class="audit-cell-stack">
        <strong>${escapeHtml(matched)}</strong>
        <small>${escapeHtml(item.request_id || "request")}</small>
      </div>
    `,
    `
      <div class="audit-cell-stack">
        <span>${escapeHtml(summary || "No output summary")}</span>
        ${Array.isArray(item.errors) && item.errors.length ? `<small class="audit-inline-warning">${escapeHtml(item.errors[0])}</small>` : `<small>${escapeHtml(surface)}</small>`}
      </div>
    `
  ];
}

function renderClientEventAuditRow(item = {}) {
  const objectLabel = item.variant_key || item.message_id || item.surface || "-";
  const context = item.context && typeof item.context === "object" ? item.context : {};
  const details = item.event && typeof item.event === "object" ? item.event : {};
  const summary = [
    context.application || context.app_id || context.platform || "",
    item.surface || "",
    details.reason ? messageDeliveryDiagnosticLabel(details.reason) : ""
  ].filter(Boolean).join(" · ");
  return [
    `
      <div class="audit-cell-stack">
        <strong>${escapeHtml(item.decision_key || "client event")}</strong>
        <small>${escapeHtml(formatTime(item.occurred_at))}</small>
      </div>
    `,
    `
      <div class="audit-cell-stack audit-cell-outcome">
        <span class="audit-badge ${escapeHtml(auditEventTone(item.event_type))}">${escapeHtml(messageDeliveryDiagnosticLabel(item.event_type || "-"))}</span>
        <small>${escapeHtml(item.rule_version != null ? `v${item.rule_version}` : "client")}</small>
      </div>
    `,
    `
      <div class="audit-cell-stack">
        <strong class="audit-inline-key">${escapeHtml(item.profile_key || "-")}</strong>
        <small>${escapeHtml(context.request_source || "client feedback")}</small>
      </div>
    `,
    `
      <div class="audit-cell-stack">
        <strong>${escapeHtml(objectLabel)}</strong>
        <small>${escapeHtml(item.message_id ? "message" : item.variant_key ? "variant" : "surface")}</small>
      </div>
    `,
    `
      <div class="audit-cell-stack">
        <span>${escapeHtml(summary || "No extra runtime context")}</span>
        <small>${escapeHtml(context.device_type || context.channel || context.platform || "-")}</small>
      </div>
    `
  ];
}

function auditOutcomeTone(result = "") {
  switch (String(result || "").toLowerCase()) {
    case "eligible":
      return "success";
    case "suppressed":
    case "deferred":
      return "warning";
    case "ineligible":
      return "neutral";
    default:
      return "info";
  }
}

function auditEventTone(type = "") {
  switch (String(type || "").toLowerCase()) {
    case "conversion":
      return "success";
    case "skipped":
      return "warning";
    case "impression":
      return "info";
    case "exposure":
      return "accent";
    default:
      return "neutral";
  }
}

function setActiveAuditRow(index = 0) {
  document.querySelectorAll("#audit-list [data-audit-index]").forEach((element) => {
    element.classList.toggle("selected", Number(element.dataset.auditIndex) === Number(index));
  });
}

function renderAuditInsights(audit) {
  if (!auditInsights) return;
  if (!audit.length) {
    auditInsights.innerHTML = [
      statusItem("Top decision", "-"),
      statusItem("Top result", "-"),
      statusItem("Matched rate", "0%"),
      statusItem("Profiles", "0")
    ].join("");
    return;
  }
  const topDecision = topCount(audit.map((item) => item.decision_key || "-"));
  const topResult = topCount(audit.map((item) => item.result || "-"));
  const matched = audit.filter((item) => (item.matched_rules || []).length).length;
  const profiles = new Set(audit.map((item) => item.profile_key).filter(Boolean)).size;
  auditInsights.innerHTML = [
    statusItem("Top decision", `${topDecision.key} (${formatNumber(topDecision.count)})`),
    statusItem("Top result", `${topResult.key} (${formatNumber(topResult.count)})`),
    statusItem("Matched rate", `${Math.round((matched / audit.length) * 100)}%`),
    statusItem("Profiles", formatNumber(profiles))
  ].join("");
}

function renderClientEventAuditSummary(events, metrics = {}) {
  const count = events.length;
  auditCount.textContent = `${formatNumber(count)} feedback event${count === 1 ? "" : "s"}`;
  const first = events[0]?.occurred_at ? formatTime(events[0].occurred_at) : "Latest first";
  const last = events.at(-1)?.occurred_at ? formatTime(events.at(-1).occurred_at) : "";
  auditRange.textContent = last ? `${first} to ${last}` : first;
  const topType = topCount(events.map((item) => item.event_type || "-"));
  const topRule = topCount(events.map((item) => item.decision_key || "-"));
  const profiles = new Set(events.map((item) => item.profile_key).filter(Boolean)).size;
  auditInsights.innerHTML = [
    statusItem("Top type", `${topType.key} (${formatNumber(topType.count)})`),
    statusItem("Top rule", `${topRule.key} (${formatNumber(topRule.count)})`),
    statusItem("Profiles", formatNumber(profiles)),
    statusItem("Grouped rows", formatNumber((metrics.by_rule || []).length + (metrics.by_variant || []).length + (metrics.by_message || []).length))
  ].join("");
}

function topCount(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .map(([key, count]) => ({ key, count }))[0] || { key: "-", count: 0 };
}

function renderAuditDetail(entry) {
  if (!entry) {
    if (auditDetailMeta) {
      auditDetailMeta.textContent = "No decision audit entry selected yet.";
    }
    auditDetailSummary.innerHTML = [
      statusItem("Decision", "-"),
      statusItem("Result", "-"),
      statusItem("Profile", "-"),
      statusItem("Matched", "-")
    ].join("");
    if (auditDetailExtra) auditDetailExtra.innerHTML = auditEmptyState("No decision audit entries match the current filters.", "Try clearing a preset, widening the date range, or removing a campaign filter.");
    auditDetail.textContent = "No audit entries match the current filters";
    return;
  }
  if (auditDetailMeta) {
    auditDetailMeta.innerHTML = [
      detailMetaChip(entry.evaluated_at ? formatTime(entry.evaluated_at) : "Latest"),
      detailMetaChip(entry.inputs?.request_source || entry.context?.request_source || "runtime"),
      detailMetaChip(entry.inputs?.surface || entry.surface || "No surface"),
      detailMetaChip(entry.request_id || "request")
    ].join("");
  }
  auditDetailSummary.innerHTML = [
    statusItem("Decision", entry.decision_key || "-"),
    statusItem("Result", entry.result || "-"),
    statusItem("Profile", entry.profile_key || "-"),
    statusItem("Matched", entry.matched_rules?.join(", ") || "fallback")
  ].join("");
  if (auditDetailExtra) auditDetailExtra.innerHTML = renderAuditDecisionPanels(entry);
  auditDetail.textContent = JSON.stringify(entry, null, 2);
}

function renderClientEventAuditDetail(entry) {
  if (!entry) {
    if (auditDetailMeta) {
      auditDetailMeta.textContent = "No client feedback event selected yet.";
    }
    auditDetailSummary.innerHTML = [
      statusItem("Type", "-"),
      statusItem("Rule", "-"),
      statusItem("Profile", "-"),
      statusItem("Object", "-")
    ].join("");
    if (auditDetailExtra) auditDetailExtra.innerHTML = auditEmptyState("No client feedback events match the current filters.", "Try a broader date range or switch from skipped-only to all feedback events.");
    auditDetail.textContent = "No client feedback events match the current filters";
    return;
  }
  if (auditDetailMeta) {
    auditDetailMeta.innerHTML = [
      detailMetaChip(entry.occurred_at ? formatTime(entry.occurred_at) : "Latest"),
      detailMetaChip(entry.context?.request_source || "client feedback"),
      detailMetaChip(entry.surface || "No surface"),
      detailMetaChip(entry.event_id || entry.message_id || entry.variant_key || "event")
    ].join("");
  }
  auditDetailSummary.innerHTML = [
    statusItem("Type", entry.event_type || "-"),
    statusItem("Rule", entry.decision_key || "-"),
    statusItem("Profile", entry.profile_key || "-"),
    statusItem("Object", entry.variant_key || entry.message_id || entry.surface || "-")
  ].join("");
  if (auditDetailExtra) auditDetailExtra.innerHTML = renderClientEventAuditPanels(entry);
  auditDetail.textContent = JSON.stringify(entry, null, 2);
}

function renderClientEventAuditPanels(entry = {}) {
  const details = entry.event && typeof entry.event === "object" ? entry.event : {};
  const context = entry.context && typeof entry.context === "object" ? entry.context : {};
  const runtime = clientEventRuntimeProfile(entry);
  const survey = clientEventSurveySummary(entry);
  const contextEntries = Object.entries(context).slice(0, 8);
  const detailEntries = Object.entries(details)
    .filter(([key]) => !["graph_experiments", "survey_answers", "answers"].includes(key))
    .slice(0, 8);
  return `
    <section class="audit-detail-sections">
      <div class="eval-output-summary audit-output-summary">
        <div class="eval-output-card primary">
          <span>Event</span>
          <strong>${escapeHtml(messageDeliveryDiagnosticLabel(entry.event_type || "-"))}</strong>
          <small>${escapeHtml(entry.decision_key || "client event")}</small>
        </div>
        <div class="eval-output-card">
          <span>Message</span>
          <strong>${escapeHtml(entry.message_id || "-")}</strong>
          <small>${escapeHtml(entry.surface || "No surface")}</small>
        </div>
        <div class="eval-output-card">
          <span>Variant</span>
          <strong>${escapeHtml(entry.variant_key || "-")}</strong>
          <small>${escapeHtml(entry.rule_version != null ? `rule v${entry.rule_version}` : "rule version unknown")}</small>
        </div>
        <div class="eval-output-card">
          <span>Occurred</span>
          <strong>${escapeHtml(entry.occurred_at ? formatTime(entry.occurred_at) : "-")}</strong>
          <small>${escapeHtml(context.request_source || "client feedback")}</small>
        </div>
        ${detailEntries.map(([key, value]) => `
          <div class="eval-output-card">
            <span>${escapeHtml(key)}</span>
            <strong>${escapeHtml(formatDecisionValue(value))}</strong>
          </div>
        `).join("")}
      </div>
      <div class="eval-runtime-summary audit-runtime-summary">
        ${evaluationRuntimeCardHtml(runtime, clientEventRuntimeIssues(entry, runtime))}
      </div>
      ${clientEventDiagnosticPanel(entry)}
      ${survey ? clientEventSurveyPanel(survey) : ""}
      ${(contextEntries.length || detailEntries.length) ? `
        <section class="audit-assignment-panel">
          <div class="audit-assignment-head">
            <strong>Event context</strong>
            <span>${escapeHtml(`${formatNumber(contextEntries.length + detailEntries.length)} fields shown`)}</span>
          </div>
          <div class="profile-enrichment-grid">
            ${contextEntries.map(([key, value]) => profileEnrichmentMetric(`context.${key}`, formatDecisionValue(value), "request context")).join("")}
            ${detailEntries
              .filter(([key]) => !contextEntries.some(([contextKey]) => contextKey === key))
              .map(([key, value]) => profileEnrichmentMetric(`event.${key}`, formatDecisionValue(value), "event payload"))
              .join("")}
          </div>
        </section>
      ` : ""}
      ${graphExperimentAuditPanel(entry)}
    </section>
  `;
}

function clientEventRuntimeProfile(entry = {}) {
  const details = entry.event && typeof entry.event === "object" ? entry.event : {};
  const context = entry.context && typeof entry.context === "object" ? entry.context : {};
  const reason = details.reason || context.skipped_reason || "";
  const platform = context.platform || context.device_type || context.channel || "web";
  const placement = context.placement || entry.surface || "";
  const application = context.application || context.app_id || context.application_id || "";
  return {
    hasMessage: Boolean(entry.message_id),
    surfaceCandidate: false,
    platform,
    application,
    placement,
    surface: entry.surface || "",
    templateType: details.template || details.template_type || "",
    enrichmentSource: context.profile_enrichment ? profileEnrichmentStatusLabel(context.profile_enrichment) : "Client event only",
    missingRequired: [],
    suppressionReason: reason,
    availability: {},
    level: entry.event_type === "skipped" || reason ? "warning" : "ok",
    summary: clientEventRuntimeSummary(entry, reason)
  };
}

function clientEventRuntimeSummary(entry = {}, reason = "") {
  if ((entry.event_type || "") === "skipped") {
    return reason
      ? `The SDK reported a skipped delivery because ${reason.replace(/_/g, " ")}.`
      : "The SDK reported a skipped delivery for this placement.";
  }
  if ((entry.event_type || "") === "conversion") return "Client conversion feedback was received for this decision.";
  if ((entry.event_type || "") === "impression") return "The client reported that the message was rendered to the user.";
  if ((entry.event_type || "") === "exposure") return "The client reported an experiment or decision exposure.";
  return "Client-side feedback was received for this decision.";
}

function clientEventRuntimeIssues(entry = {}, runtime = {}) {
  const issues = [];
  const details = entry.event && typeof entry.event === "object" ? entry.event : {};
  const reason = details.reason || entry.context?.skipped_reason || "";
  if ((entry.event_type || "") === "skipped") {
    issues.push({
      level: "warn",
      title: "Skipped delivery",
      detail: messageDeliveryDiagnosticHint(reason, details.category || "runtime")
    });
  }
  if ((entry.event_type || "") === "conversion" && !entry.message_id && !entry.variant_key) {
    issues.push({
      level: "info",
      title: "Unattributed conversion",
      detail: "This conversion was not tied to a message_id or variant_key, so downstream reporting may group it only at the decision level."
    });
  }
  if (!runtime.application && /mobile|ios|android|app/i.test(String(runtime.platform || ""))) {
    issues.push({
      level: "warn",
      title: "Application missing",
      detail: "Mobile feedback is easier to debug when the app identifier is included in client event context."
    });
  }
  if (!entry.surface) {
    issues.push({
      level: "info",
      title: "Surface missing",
      detail: "Include surface in the client feedback payload so placement reporting can stay precise."
    });
  }
  if (!issues.length) {
    issues.push({
      level: "ok",
      title: "Feedback captured",
      detail: "This event includes enough client metadata to support audit, attribution, and delivery diagnostics."
    });
  }
  return issues;
}

function clientEventDiagnosticPanel(entry = {}) {
  const details = entry.event && typeof entry.event === "object" ? entry.event : {};
  const reason = details.reason || entry.context?.skipped_reason || "";
  const category = details.category || "";
  const fields = [
    ["Event ID", entry.event_id || "-"],
    ["Reason", reason ? messageDeliveryDiagnosticLabel(reason) : "-"],
    ["Hint", reason ? messageDeliveryDiagnosticHint(reason, category) : "No delivery issue reported."],
    ["Survey value", details.survey_value || details.value || "-"]
  ];
  return `
    <section class="audit-assignment-panel">
      <div class="audit-assignment-head">
        <strong>Feedback diagnostics</strong>
        <span>${escapeHtml(entry.event_type || "event")}</span>
      </div>
      <div class="profile-enrichment-grid">
        ${fields.map(([label, value]) => profileEnrichmentMetric(label, value, label === "Hint" ? "SDK or app runtime guidance" : "client feedback")).join("")}
      </div>
    </section>
  `;
}

function clientEventSurveySummary(entry = {}) {
  const details = entry.event && typeof entry.event === "object" ? entry.event : {};
  const answers = Array.isArray(details.answers)
    ? details.answers
    : Array.isArray(details.survey_answers)
      ? details.survey_answers
      : [];
  const hasSurvey = details.type === "survey_response" || details.survey_question || details.survey_value || answers.length;
  if (!hasSurvey) return null;
  return {
    question: details.survey_question_label || details.survey_question || "Survey response",
    value: details.survey_value || details.value || "",
    answers
  };
}

function clientEventSurveyPanel(survey) {
  return `
    <section class="audit-assignment-panel">
      <div class="audit-assignment-head">
        <strong>Survey response</strong>
        <span>${escapeHtml(survey.answers.length ? `${formatNumber(survey.answers.length)} answers` : "single value")}</span>
      </div>
      <div class="profile-enrichment-grid">
        ${profileEnrichmentMetric("Question", survey.question || "-", "client survey payload")}
        ${profileEnrichmentMetric("Value", survey.value || "-", "captured response")}
        ${survey.answers.slice(0, 6).map((answer, index) => profileEnrichmentMetric(
          answer.question || answer.label || `Answer ${index + 1}`,
          formatDecisionValue(answer.value ?? answer.answer ?? ""),
          answer.type || "survey answer"
        )).join("")}
      </div>
    </section>
  `;
}

function renderAuditDecisionPanels(entry = {}) {
  const outputEntries = Object.entries(entry.outputs || {}).filter(([key]) => key !== "message").slice(0, 8);
  const errors = Array.isArray(entry.errors) ? entry.errors : [];
  const surface = entry.inputs?.surface || entry.surface || entry.outputs?.message?.surface || entry.outputs?.message?.rendering?.surface || "-";
  const requestSource = entry.inputs?.request_source || "-";
  const profileStatus = entry.profile_cache?.status || entry.inputs?.profile_enrichment || "";
  const runtime = auditDecisionRuntimeProfile(entry);
  const trace = Array.isArray(entry.trace) ? entry.trace : [];
  return `
    <section class="audit-detail-sections">
      <div class="eval-output-summary audit-output-summary">
        <div class="eval-output-card primary">
          <span>Result</span>
          <strong>${escapeHtml(entry.result || "-")}</strong>
          <small>${escapeHtml(entry.decision_key || "decision")}</small>
        </div>
        <div class="eval-output-card">
          <span>Version</span>
          <strong>${escapeHtml(entry.rule_version != null ? String(entry.rule_version) : "-")}</strong>
          <small>${escapeHtml(entry.evaluated_at ? formatTime(entry.evaluated_at) : "latest")}</small>
        </div>
        <div class="eval-output-card">
          <span>Source</span>
          <strong>${escapeHtml(requestSource)}</strong>
          <small>${escapeHtml(surface)}</small>
        </div>
        <div class="eval-output-card ${errors.length ? "warning" : ""}">
          <span>Profile enrichment</span>
          <strong>${escapeHtml(profileEnrichmentStatusLabel(profileStatus) || "Not used")}</strong>
          <small>${escapeHtml(entry.profile_cache?.reason || `${formatNumber(entry.inputs?.attribute_keys?.length || 0)} attributes in request`)}</small>
        </div>
        ${outputEntries.map(([key, value]) => `
          <div class="eval-output-card">
            <span>${escapeHtml(key)}</span>
            <strong>${escapeHtml(formatDecisionValue(value))}</strong>
          </div>
        `).join("")}
        ${entry.outputs?.message?.id || entry.outputs?.message_id ? `
          <div class="eval-output-card">
            <span>Message</span>
            <strong>${escapeHtml(entry.outputs?.message?.id || entry.outputs?.message_id || "-")}</strong>
            <small>${escapeHtml(entry.outputs?.message?.rendering?.template_type || entry.outputs?.message?.content?.template_type || "in-app")}</small>
          </div>
        ` : ""}
        ${errors.length ? `
          <div class="eval-output-card warning">
            <span>Errors</span>
            <strong>${escapeHtml(errors.join(", "))}</strong>
          </div>
        ` : ""}
      </div>
      <div class="eval-runtime-summary audit-runtime-summary">
        ${evaluationRuntimeCardHtml(runtime)}
      </div>
      ${entry.profile_cache ? renderProfileEnrichmentCard(entry.profile_cache) : auditProfileEnrichmentCard(entry)}
      ${trace.length ? `
        <div class="trace-card audit-trace-card">
          <div class="trace-card-header">
            <strong>Decision path</strong>
            <span class="trace-badge">${escapeHtml(`${trace.length} checks`)}</span>
          </div>
          <div class="trace-path">
            ${trace.map(traceStepHtml).join("")}
          </div>
        </div>
      ` : ""}
      ${graphExperimentAuditPanel(entry)}
    </section>
  `;
}

function auditDecisionRuntimeProfile(entry = {}) {
  const surface = entry.inputs?.surface || entry.surface || entry.outputs?.message?.surface || "";
  const request = {
    surface,
    context: {
      surface,
      placement: surface,
      request_source: entry.inputs?.request_source || "",
      application: entry.outputs?.message?.rendering?.application?.key || entry.outputs?.message?.rendering?.application?.id || ""
    }
  };
  const withFallbackCache = entry.profile_cache
    ? entry
    : {
        ...entry,
        profile_cache: entry.inputs?.profile_enrichment
          ? { status: entry.inputs.profile_enrichment, hit: false, diagnostics: { source: profileEnrichmentStatusLabel(entry.inputs.profile_enrichment) } }
          : null
      };
  return evaluationRuntimeProfile(withFallbackCache, request);
}

function auditProfileEnrichmentCard(entry = {}) {
  if (!entry.inputs?.profile_enrichment) return "";
  return `
    <div class="profile-enrichment-card neutral">
      <div class="profile-enrichment-head">
        <div>
          <span>Profile enrichment</span>
          <strong>${escapeHtml(profileEnrichmentStatusLabel(entry.inputs.profile_enrichment))}</strong>
        </div>
        <em>${escapeHtml(entry.inputs.profile_enrichment)}</em>
      </div>
      <div class="profile-enrichment-grid">
        ${profileEnrichmentMetric("Attributes sent", formatNumber(entry.inputs?.attribute_keys?.length || 0), (entry.inputs?.attribute_keys || []).slice(0, 6).join(", ") || "No attributes")}
        ${profileEnrichmentMetric("Segments sent", formatNumber(entry.inputs?.segment_keys?.length || 0), (entry.inputs?.segment_keys || []).slice(0, 6).join(", ") || "No segments")}
        ${profileEnrichmentMetric("Context sent", formatNumber(entry.inputs?.context_keys?.length || 0), (entry.inputs?.context_keys || []).slice(0, 6).join(", ") || "No context")}
        ${profileEnrichmentMetric("Surface", entry.inputs?.surface || "-", entry.inputs?.request_source || "audit")}
      </div>
    </div>
  `;
}

function graphExperimentAuditPanel(entry = {}) {
  const assignments = graphExperimentAssignmentsFromEntry(entry);
  if (!assignments.length) return "";
  return `
    <section class="audit-assignment-panel">
      <div class="audit-assignment-head">
        <strong>Graph experiments</strong>
        <span>${escapeHtml(formatNumber(assignments.length))} assignment${assignments.length === 1 ? "" : "s"}</span>
      </div>
      <div class="audit-assignment-list">
        ${assignments.map(graphExperimentAuditRow).join("")}
      </div>
    </section>
  `;
}

function graphExperimentAssignmentsFromEntry(entry = {}) {
  const sources = [
    entry.graph_experiments,
    entry.event?.graph_experiments,
    entry.event_payload?.graph_experiments,
    entry.event?.event_payload?.graph_experiments
  ];
  const assignments = sources.find((items) => Array.isArray(items) && items.length) || [];
  const primary = entry.experiment || entry.event?.experiment || entry.event_payload?.experiment || null;
  const rows = [...assignments];
  if (primary?.graph_node_id && !rows.some((item) => item.graph_node_id === primary.graph_node_id && item.variant_key === primary.variant_key)) {
    rows.unshift(primary);
  }
  return rows;
}

function graphExperimentAuditRow(assignment = {}) {
  const label = assignment.experiment_key || assignment.key || assignment.graph_node_id || "graph split";
  return `
    <div class="audit-assignment-row">
      <div>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml([assignment.graph_node_id, assignment.bucket ? `bucket ${assignment.bucket}` : ""].filter(Boolean).join(" · ") || "graph node")}</span>
      </div>
      <mark>${escapeHtml(assignment.variant_key || "-")}</mark>
      <small>${escapeHtml([assignment.strategy, assignment.reason, assignment.holdout ? "holdout" : ""].filter(Boolean).join(" · ") || "assigned")}</small>
    </div>
  `;
}

function filterAuditByCampaign(items) {
  const campaign = document.querySelector("#audit-campaign")?.value.trim().toLowerCase() || "";
  return campaign ? items.filter((item) => matchesDecisionCampaign(item.decision_key, campaign)) : items;
}

function clearAuditFilters() {
  ["audit-decision-key", "audit-campaign", "audit-profile-key", "audit-result", "audit-event-type", "audit-event-object", "audit-surface", "audit-matched-rule", "audit-search", "audit-from", "audit-to"].forEach((id) => {
    document.querySelector(`#${id}`).value = "";
  });
  document.querySelector("#audit-limit").value = "100";
  initializeAuditDefaults();
  renderAuditPresetChips();
  renderAuditFilterSummary();
  loadAudit();
}

function auditParams() {
  const params = new URLSearchParams();
  const mode = document.querySelector("#audit-mode")?.value || "decisions";
  const eventObject = document.querySelector("#audit-event-object")?.value.trim();
  for (const [id, key] of [
    ["audit-decision-key", "decision_key"],
    ["audit-profile-key", "profile_key"],
    ...(mode === "client_events" ? [
      ["audit-event-type", "event_type"],
      ["audit-surface", "surface"]
    ] : [
      ["audit-result", "result"],
      ["audit-matched-rule", "matched_rule"],
      ["audit-search", "search"]
    ]),
    ["audit-from", "from"],
    ["audit-to", "to"],
    ["audit-limit", "limit"]
  ]) {
    const value = document.querySelector(`#${id}`)?.value.trim();
    if (!value) continue;
    params.set(key, id === "audit-from" || id === "audit-to" ? new Date(value).toISOString() : value);
  }
  if (mode === "client_events" && eventObject) {
    params.set("event_object", eventObject);
  }
  return params;
}

function renderAuditModeFields() {
  const clientMode = document.querySelector("#audit-mode")?.value === "client_events";
  document.querySelector("#audit-result")?.closest("label")?.toggleAttribute("hidden", clientMode);
  document.querySelector("#audit-matched-rule")?.closest("label")?.toggleAttribute("hidden", clientMode);
  document.querySelector("#audit-search")?.closest("label")?.toggleAttribute("hidden", clientMode);
  document.querySelectorAll("[data-audit-client-field]").forEach((element) => {
    element.hidden = !clientMode;
  });
  renderAuditPresetChips();
  renderAuditFilterSummary();
}

function initializeAuditDefaults() {
  const fromInput = document.querySelector("#audit-from");
  const toInput = document.querySelector("#audit-to");
  if (!fromInput || !toInput) return;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (!fromInput.value) fromInput.value = toLocalDateTimeInputValue(sevenDaysAgo);
  if (!toInput.value) toInput.value = toLocalDateTimeInputValue(now);
  syncAuditRangeButtons();
}

function applyAuditRange(days = 7) {
  const toInput = document.querySelector("#audit-to");
  const fromInput = document.querySelector("#audit-from");
  if (!fromInput || !toInput) return;
  const now = new Date();
  const start = new Date(now.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000);
  fromInput.value = toLocalDateTimeInputValue(start);
  toInput.value = toLocalDateTimeInputValue(now);
  syncAuditRangeButtons(days);
  renderAuditFilterSummary();
  loadAudit();
}

function syncAuditRangeButtons(activeDays = null) {
  const fromValue = document.querySelector("#audit-from")?.value;
  const toValue = document.querySelector("#audit-to")?.value;
  let computedDays = activeDays;
  if (computedDays == null && fromValue && toValue) {
    const diffMs = new Date(toValue).getTime() - new Date(fromValue).getTime();
    const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
    if ([1, 7, 30].includes(days)) computedDays = days;
  }
  document.querySelectorAll("[data-audit-range]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.auditRange || 0) === Number(computedDays || 0));
  });
}

function renderAuditFilterSummary() {
  if (!auditFilterSummary) return;
  const mode = document.querySelector("#audit-mode")?.value === "client_events" ? "Client feedback" : "Decision audit";
  const activeFields = [
    "#audit-decision-key",
    "#audit-campaign",
    "#audit-profile-key",
    "#audit-result",
    "#audit-event-type",
    "#audit-event-object",
    "#audit-surface",
    "#audit-matched-rule",
    "#audit-search"
  ].filter((selector) => {
    const element = document.querySelector(selector);
    return element && !element.closest("label")?.hidden && String(element.value || "").trim();
  }).length;
  const fromValue = document.querySelector("#audit-from")?.value;
  const toValue = document.querySelector("#audit-to")?.value;
  syncAuditRangeButtons();
  const rangeLabel = fromValue && toValue
    ? `${formatTime(new Date(fromValue).toISOString())} to ${formatTime(new Date(toValue).toISOString())}`
    : "Open date range";
  auditFilterSummary.textContent = `${mode} · ${activeFields} active filter${activeFields === 1 ? "" : "s"} · ${rangeLabel}`;
}

function renderAuditPresetChips() {
  if (!auditPresetChips) return;
  const mode = document.querySelector("#audit-mode")?.value === "client_events" ? "client_events" : "decisions";
  const presets = mode === "client_events"
    ? [
        { id: "all", label: "All feedback" },
        { id: "exposure", label: "Exposure" },
        { id: "impression", label: "Impression" },
        { id: "conversion", label: "Conversion" },
        { id: "skipped", label: "Skipped" }
      ]
    : [
        { id: "all", label: "All decisions" },
        { id: "eligible", label: "Eligible" },
        { id: "ineligible", label: "Ineligible" },
        { id: "fallback", label: "Fallback" },
        { id: "issues", label: "Profile issues" }
      ];
  auditPresetChips.innerHTML = presets.map((preset) => `
    <button
      type="button"
      class="${auditPresetIsActive(mode, preset.id) ? "active" : ""}"
      data-audit-preset="${escapeHtml(preset.id)}"
    >${escapeHtml(preset.label)}</button>
  `).join("");
  auditPresetChips.querySelectorAll("[data-audit-preset]").forEach((button) => {
    button.addEventListener("click", () => applyAuditPreset(button.dataset.auditPreset || "all"));
  });
}

function auditPresetIsActive(mode, preset) {
  if (mode === "client_events") {
    const eventType = document.querySelector("#audit-event-type")?.value.trim() || "";
    if (preset === "all") return !eventType;
    return eventType === preset;
  }
  const result = document.querySelector("#audit-result")?.value.trim().toLowerCase() || "";
  const matched = document.querySelector("#audit-matched-rule")?.value.trim().toLowerCase() || "";
  const search = document.querySelector("#audit-search")?.value.trim().toLowerCase() || "";
  if (preset === "all") return !result && !matched && !search;
  if (preset === "eligible") return result === "eligible";
  if (preset === "ineligible") return result === "ineligible";
  if (preset === "fallback") return matched === "fallback";
  if (preset === "issues") return search.includes("missing attribute");
  return false;
}

function applyAuditPreset(preset = "all") {
  const mode = document.querySelector("#audit-mode")?.value === "client_events" ? "client_events" : "decisions";
  if (mode === "client_events") {
    const eventType = document.querySelector("#audit-event-type");
    if (eventType) eventType.value = preset === "all" ? "" : preset;
  } else {
    const result = document.querySelector("#audit-result");
    const matched = document.querySelector("#audit-matched-rule");
    const search = document.querySelector("#audit-search");
    if (result) result.value = "";
    if (matched) matched.value = "";
    if (search) search.value = "";
    if (preset === "eligible" && result) result.value = "eligible";
    if (preset === "ineligible" && result) result.value = "ineligible";
    if (preset === "fallback" && matched) matched.value = "fallback";
    if (preset === "issues" && search) search.value = "Missing attribute";
  }
  renderAuditPresetChips();
  renderAuditFilterSummary();
  loadAudit();
}

function detailMetaChip(value = "") {
  return `<span class="audit-detail-chip">${escapeHtml(String(value || "-"))}</span>`;
}

function auditEmptyState(title, detail) {
  return `
    <div class="audit-empty-state">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>
  `;
}

function toLocalDateTimeInputValue(date) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

async function exportAuditCsv() {
  try {
    const params = auditParams();
    if (document.querySelector("#audit-mode")?.value === "client_events") {
      params.set("recent_limit", document.querySelector("#audit-limit").value || "100");
      const body = await api(`/v1/metrics/client-events${params.toString() ? `?${params}` : ""}`);
      auditDetail.textContent = clientEventsToCsv(filterAuditByCampaign(body.metrics?.recent_events || []));
      return;
    }
    if (document.querySelector("#audit-campaign")?.value.trim()) {
      const body = await api(`/v1/audit${params.toString() ? `?${params}` : ""}`);
      auditDetail.textContent = decisionAuditToCsv(filterAuditByCampaign(body.audit || []));
      return;
    }
    params.set("format", "csv");
    const response = await fetch(`/v1/audit?${params}`, {
      headers: { authorization: `Bearer ${tokenInput.value}` }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text);
    auditDetail.textContent = text;
  } catch (error) {
    auditDetail.textContent = error.message;
  }
}

function decisionAuditToCsv(audit) {
  const columns = ["evaluated_at", "decision_key", "profile_key", "result", "matched_rules", "rule_version", "request_id"];
  const lines = [columns.join(",")];
  for (const item of audit) {
    lines.push(columns.map((column) => csvCell(column === "matched_rules" ? (item.matched_rules || []).join("|") : item[column] ?? "")).join(","));
  }
  return lines.join("\n");
}

function clientEventsToCsv(events) {
  const columns = ["occurred_at", "event_type", "decision_key", "profile_key", "rule_version", "variant_key", "message_id", "surface", "event_id"];
  const lines = [columns.join(",")];
  for (const event of events) {
    lines.push(columns.map((column) => csvCell(event[column] ?? "")).join(","));
  }
  return lines.join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function loadLookups() {
  const target = document.querySelector("#lookup-list");
  target.innerHTML = header(["Name", "ID", "Match column", "Rows", "Version", "Columns"]);
  try {
    const body = await api("/v1/lookup-tables");
    cachedLookupTables = body.lookup_tables || [];
    renderLookupList();
    renderBranchEditor();
    if (document.querySelector("#builder-mode")?.value === "graph") renderGraphBuilder();
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", "", ""]);
  }
}

function renderLookupList() {
  const target = document.querySelector("#lookup-list");
  if (!target) return;
  const search = document.querySelector("#lookup-filter-search")?.value.trim().toLowerCase() || "";
  const column = document.querySelector("#lookup-filter-column")?.value.trim().toLowerCase() || "";
  const rowsFilter = document.querySelector("#lookup-filter-rows")?.value || "";
  const filtered = cachedLookupTables.filter((item) => {
    const columns = referenceColumnsFromRowsForTable(item);
    const rowCount = item.rows?.length || 0;
    const haystack = [
      item.name,
      item.id,
      item.key_column,
      columns.join(" "),
      JSON.stringify((item.rows || []).slice(0, 20))
    ].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesColumn = !column || columns.some((name) => name.toLowerCase().includes(column));
    const matchesRows =
      !rowsFilter ||
      (rowsFilter === "empty" && rowCount === 0) ||
      (rowsFilter === "small" && rowCount >= 1 && rowCount <= 10) ||
      (rowsFilter === "large" && rowCount >= 11);
    return matchesSearch && matchesColumn && matchesRows;
  });
  target.innerHTML = header(["Name", "ID", "Match column", "Rows", "Version", "Columns"]);
  target.innerHTML += filtered.length
    ? filtered.map((item) => lookupCatalogRow(item)).join("")
    : row(["No reference tables match the current filters", "", "", "", "", ""]);
  target.querySelectorAll("[data-lookup-id]").forEach((element) => {
    element.addEventListener("click", () => loadLookup(element.dataset.lookupId, cachedLookupTables));
  });
}

function lookupCatalogRow(item) {
  const columns = referenceColumnsFromRowsForTable(item);
  return row([
    item.name,
    item.id,
    item.key_column || "key",
    formatNumber(item.rows?.length || 0),
    item.version || "-",
    columns.join(", ") || "-"
  ], { lookupId: item.id });
}

function referenceColumnsFromRowsForTable(table) {
  const keyColumn = table.key_column || "key";
  const discovered = [...new Set((table.rows || []).flatMap((rowItem) => Object.keys(rowItem || {})))];
  return [keyColumn, ...discovered.filter((column) => column !== keyColumn)];
}

async function loadMessages() {
  const target = document.querySelector("#message-list");
  target.innerHTML = header(["Preview", "Name", "Surface", "Status", "Updated", "Details"]);
  try {
    const [body, assetBody] = await Promise.all([
      api("/v1/messages"),
      api("/v1/message-assets").catch(() => ({ assets: [] }))
    ]);
    cachedMessages = body.messages || [];
    cachedMessageAssets = assetBody.assets || [];
    renderMessageSurfaceOptions();
    renderMessageOutputOptions();
    renderMessageList();
    renderMessageAssetList();
    renderMessageTokenSuggestions();
    renderBranchEditor();
    if (document.querySelector("#builder-mode")?.value === "graph") renderGraphBuilder();
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", "", ""]);
  }
}

function renderMessageList(options = {}) {
  const target = document.querySelector("#message-list");
  if (!target) return;
  const search = document.querySelector("#message-filter-search")?.value.trim().toLowerCase() || "";
  const status = document.querySelector("#message-filter-status")?.value || "";
  const template = document.querySelector("#message-filter-template")?.value || "";
  const application = document.querySelector("#message-filter-application")?.value.trim().toLowerCase() || "";
  const surface = document.querySelector("#message-filter-surface")?.value.trim().toLowerCase() || "";
  const campaign = document.querySelector("#message-filter-campaign")?.value.trim().toLowerCase() || "";
  const filtered = cachedMessages.filter((item) => {
    const content = item.default_content || {};
    const itemTemplate = content.template_type || item.metadata?.template_type || "";
    const haystack = [
      item.name,
      item.id,
      item.surface,
      item.status,
      itemTemplate,
      applicationValue(item.metadata || {}),
      JSON.stringify(content),
      JSON.stringify(item.metadata || {}),
      campaignSearchText(item.metadata || {})
    ].join(" ").toLowerCase();
    return (!search || haystack.includes(search)) &&
      (!status || (item.status || "active") === status) &&
      (!template || itemTemplate === template) &&
      (!application || applicationSearchText(item.metadata || {}).includes(application)) &&
      (!surface || String(item.surface || "").toLowerCase().includes(surface)) &&
      (!campaign || campaignSearchText(item.metadata || {}).includes(campaign));
  });
  const page = paginateInventory(filtered, "messages", { resetPage: options.resetPage });
  target.innerHTML = `
    <div class="inventory-toolbar">
      ${messageInventorySummary(filtered)}
      ${inventoryPagerMarkup("messages", page, "messages")}
    </div>
    <div class="inventory-header message-list-header">
      <div>Message</div>
      <div>Application</div>
      <div>Surface</div>
      <div>Campaign</div>
      <div>Status</div>
      <div>Updated</div>
      <div>Actions</div>
    </div>
    <div class="inventory-list">
      ${filtered.length ? page.items.map((item) => messageCatalogRow(item)).join("") : inventoryEmptyState("No messages match the current filters", "Broaden search, status, template, application, surface, or campaign filters.")}
    </div>
  `;
  bindInventoryPager(target, "messages", renderMessageList);
}

function handleMessageListClick(event) {
  const action = event.target.closest("[data-message-action]");
  if (action) {
    event.stopPropagation();
    runMessageListAction(action.dataset.messageAction, action.dataset.messageActionId);
    return;
  }
  const rowElement = event.target.closest("[data-message-id]");
  if (rowElement) loadMessage(rowElement.dataset.messageId, cachedMessages);
}

function messageInventorySummary(filtered) {
  const active = filtered.filter((item) => (item.status || "active") === "active").length;
  const templates = new Set(filtered.map((item) => messageTemplateType(item.default_content?.template_type || item.metadata?.template_type || "banner"))).size;
  const applications = new Set(filtered.map((item) => applicationValue(item.metadata || {})).filter(Boolean)).size;
  return `
    <div class="inventory-summary">
      <span>${formatNumber(filtered.length)} of ${formatNumber(cachedMessages.length)} messages</span>
      <span>${formatNumber(active)} active</span>
      <span>${formatNumber(templates)} templates</span>
      <span>${formatNumber(applications)} applications</span>
    </div>
  `;
}

function inventoryEmptyState(title, detail) {
  return `
    <div class="inventory-empty">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>
  `;
}

function messageCatalogRow(item) {
  const content = item.default_content || {};
  const title = content.title || content.headline || item.name || "-";
  const template = messageTemplateType(content.template_type || item.metadata?.template_type || "banner");
  const ctas = normalizeMessageCtas(content);
  const lifecycle = item.metadata?.lifecycle || item.metadata?.delivery || {};
  const expiresAt = lifecycle.expires_at || item.metadata?.expires_at;
  const details = [
    item.id,
    template,
    ctas.length ? `${ctas.length} CTA${ctas.length === 1 ? "" : "s"}` : "No CTA",
    expiresAt ? `Expires ${formatTime(expiresAt)}` : ""
  ].filter(Boolean).join(" · ");
  const actions = `<button type="button" data-message-action="move_campaign" data-message-action-id="${escapeHtml(item.id)}">Move</button>`;
  return `
    <div class="inventory-row message-inventory-row actionable" data-message-id="${escapeHtml(item.id)}">
      <div class="message-inventory-main">
        ${messageCatalogPreview(item)}
        <div class="inventory-main">
          <strong>${escapeHtml(item.name || title)}</strong>
          <small>${escapeHtml(details)}</small>
        </div>
      </div>
      <div class="inventory-muted">${escapeHtml(applicationValue(item.metadata) || "-")}</div>
      <div class="inventory-muted">${escapeHtml(item.surface || "-")}</div>
      <div class="inventory-muted">${escapeHtml(campaignValue(item.metadata) || folderValue(item.metadata) || "Unassigned")}</div>
      <div><span class="inventory-chip ${escapeHtml(item.status || "active")}">${escapeHtml(item.status || "active")}</span></div>
      <div class="inventory-muted">${escapeHtml(item.updated_at ? formatTime(item.updated_at) : "-")}</div>
      <div class="inventory-actions">${actions}</div>
    </div>
  `;
}

async function runMessageListAction(action, id) {
  if (action !== "move_campaign") return;
  try {
    const message = cachedMessages.find((candidate) => candidate.id === id);
    const target = promptCampaignMoveTarget(campaignLabelForMetadata(message?.metadata || {}));
    if (!target) return;
    const preview = await api("/v1/campaign-assets/move", {
      method: "POST",
      body: JSON.stringify({
        assets: [{ object_type: "message", object_id: id }],
        dry_run: true,
        ...target
      })
    });
    const ok = window.confirm(`Move ${preview.summary?.affected || 0} message(s) to "${preview.target_campaign || "Unassigned"}"? ${preview.summary?.skipped || 0} item(s) will be skipped.`);
    if (!ok) return;
    const body = await api("/v1/campaign-assets/move", {
      method: "POST",
      body: JSON.stringify({
        assets: [{ object_type: "message", object_id: id }],
        dry_run: false,
        ...target
      })
    });
    messageOutput.textContent = JSON.stringify(body, null, 2);
    await Promise.all([loadMessages(), loadMetrics()]);
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function messageCatalogPreview(item) {
  const content = item.default_content || {};
  const template = messageTemplateType(content.template_type || item.metadata?.template_type || "banner");
  const title = content.title || content.headline || item.name || "Untitled";
  const body = content.body || content.text || content.description || "";
  const imageUrl = content.image_url || content.image || "";
  const cta = normalizeMessageCtas(content)[0];
  const imageStyle = safeBackgroundImageStyle(imageUrl);
  return `
    <div class="message-thumb ${imageStyle ? "has-image" : ""}" data-template="${escapeHtml(template)}">
      ${imageStyle ? `<div class="message-thumb-image"${imageStyle}></div>` : ""}
      <div class="message-thumb-body">
        <span>${escapeHtml(template)}</span>
        <strong>${escapeHtml(title)}</strong>
        ${body ? `<small>${escapeHtml(body)}</small>` : ""}
        ${cta?.label ? `<em>${escapeHtml(cta.label)}</em>` : ""}
      </div>
    </div>
  `;
}

function renderMessageAssetList() {
  const target = document.querySelector("#message-asset-list");
  if (!target) return;
  if (!cachedMessageAssets.length) {
    target.innerHTML = `<div class="message-asset-empty">No managed assets yet.</div>`;
    return;
  }
  target.innerHTML = cachedMessageAssets.map((asset) => {
    const usedBy = asset.used_by || [];
    const isSelected = document.querySelector("#message-preview-image")?.value.trim() === asset.content_url;
    return `
      <div class="message-asset-row ${isSelected ? "selected" : ""}">
        <div class="message-asset-thumb"${safeBackgroundImageStyle(asset.content_url)}></div>
        <div class="message-asset-copy">
          <strong>${escapeHtml(asset.filename || asset.id)}</strong>
          <span>${escapeHtml(asset.content_type || "image")} · ${formatBytes(asset.size_bytes || 0)} · ${escapeHtml(assetUsageSummary(usedBy))}</span>
          ${usedBy.length ? `<em>${escapeHtml(assetUsageDetail(usedBy))}</em>` : ""}
        </div>
        <button type="button" data-use-message-asset="${escapeHtml(asset.content_url)}">${isSelected ? "Selected" : "Use"}</button>
      </div>
    `;
  }).join("");
  target.querySelectorAll("[data-use-message-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#message-preview-image").value = button.dataset.useMessageAsset;
      syncMessageJsonFromPreviewLive();
      renderMessageAssetList();
      messageOutput.textContent = "Image asset linked to message.";
    });
  });
}

function assetUsageSummary(usedBy = []) {
  if (!usedBy.length) return "Unused";
  const counts = usedBy.reduce((acc, item) => {
    const type = item.object_type === "rule_version" ? "published rule" : item.object_type === "rule" ? "draft rule" : "message";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`)
    .join(" · ");
}

function assetUsageDetail(usedBy = []) {
  return usedBy
    .slice(0, 3)
    .map((item) => {
      const version = item.version ? ` v${item.version}` : "";
      const usage = item.usage ? ` ${item.usage.replace(/_/g, " ")}` : "";
      return `${item.name || item.id}${version}${usage}`.trim();
    })
    .join(" · ") + (usedBy.length > 3 ? ` · +${usedBy.length - 3} more` : "");
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

function safeBackgroundImageStyle(value) {
  if (!value) return "";
  try {
    const parsed = new URL(String(value), window.location.href);
    if (!["http:", "https:", "data:"].includes(parsed.protocol)) return "";
    const escaped = parsed.href.replace(/'/g, "%27").replace(/["\\\n\r]/g, "");
    return ` style="background-image:url('${escapeHtml(escaped)}')"`;
  } catch {
    return "";
  }
}

function renderMessageSurfaceOptions() {
  const list = document.querySelector("#message-surface-options");
  if (!list) return;
  const defaults = [
    "homepage_hero",
    "homepage_banner",
    "homepage_modal",
    "product_detail",
    "checkout",
    "account_dashboard",
    "inapp_alert",
    "inapp_modal",
    "inapp_toast",
    "email",
    "mobile_push"
  ];
  const surfaces = [
    ...defaults,
    ...cachedMessages.map((item) => item.surface),
    ...cachedRuleSets.map((item) => item.surface),
    ...cachedMessages.map((item) => item.default_content?.placement)
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  list.innerHTML = [...new Set(surfaces)].sort((a, b) => a.localeCompare(b))
    .map((value) => `<option value="${escapeHtml(value)}"></option>`)
    .join("");
  renderMessageApplicationOptions();
}

function renderMessageApplicationOptions() {
  const list = document.querySelector("#message-application-options");
  if (!list) return;
  const defaults = [
    "web-storefront",
    "mobile-app",
    "customer-portal",
    "agent-console",
    "email-platform"
  ];
  const applications = [
    ...defaults,
    ...cachedMessages.map((item) => applicationValue(item.metadata || {})),
    ...cachedMessages.map((item) => item.metadata?.app_id),
    ...cachedMessages.map((item) => item.metadata?.application_id)
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  list.innerHTML = [...new Set(applications)].sort((a, b) => a.localeCompare(b))
    .map((value) => `<option value="${escapeHtml(value)}"></option>`)
    .join("");
}

function openMessageDetail() {
  if (!messageDetailPanel) return;
  messageDetailPanel.hidden = false;
  activateMessageWorkspaceTab("content");
  activateMessageContentTab("content_json");
  activateMessageMetaTab("versions");
  setMessageAdvancedOpen("message-advanced-panel", false);
  setMessageAdvancedOpen("message-metadata-advanced-panel", false);
  messageDetailPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function newMessage(options = {}) {
  selectedMessageId = null;
  document.querySelector("#message-id").value = "hero_offer";
  document.querySelector("#message-id").disabled = false;
  document.querySelector("#message-name").value = "Hero Offer";
  document.querySelector("#message-application").value = "web-storefront";
  document.querySelector("#message-surface").value = "homepage_hero";
  document.querySelector("#message-status").value = "active";
  document.querySelector("#message-template-type").value = "banner";
  document.querySelector("#message-placement").value = "homepage.hero.top";
  document.querySelector("#message-campaign").value = "";
  document.querySelector("#message-folder").value = "";
  document.querySelector("#message-starts-at").value = "";
  document.querySelector("#message-expires-at").value = "";
  document.querySelector("#message-priority").value = "0";
  document.querySelector("#message-frequency-ttl").value = "";
  document.querySelector("#message-display-mode").value = "always";
  document.querySelector("#message-trigger-type").value = "page_load";
  document.querySelector("#message-max-impressions").value = "";
  document.querySelector("#message-target-devices").value = "any";
  document.querySelector("#message-consent-category").value = "";
  document.querySelector("#message-dismiss-behavior").value = "suppress";
  document.querySelector("#message-content").value = JSON.stringify({
    template_type: "banner",
    placement: "homepage.hero.top",
    title: "Special offer",
    body: "A personalized offer is ready.",
    footer: "",
    cta_label: "View offer",
    cta_url: "",
    image_url: "",
    ctas: [
      { label: "View offer", url: "", style: "primary" }
    ]
  }, null, 2);
  document.querySelector("#message-schema").value = JSON.stringify({
    template_type: "banner|alert|modal|inline|toast|card|carousel|survey|recommendation|html_fragment",
    placement: "string",
    title: "string",
    body: "string",
    footer: "string",
    cta_label: "string",
    cta_url: "url",
    image_url: "url",
    ctas: [{ label: "string", url: "url", style: "primary|secondary" }],
    items: [{ title: "string", body: "string", image_url: "url", url: "url" }],
    questions: [{ label: "string", type: "choice|text|rating", options: ["string"] }],
    html: "guarded sanitized fragment for html_fragment"
  }, null, 2);
  document.querySelector("#message-metadata").value = JSON.stringify({
    application: "web-storefront",
    lifecycle: {
      starts_at: "",
      expires_at: "",
      ttl_seconds: 0
    },
    delivery: {
      display: { mode: "always" },
      frequency: { cooldown_seconds: 0, max_impressions: 0 },
      targeting: { devices: "any" },
      trigger: { type: "page_load" },
      dismiss: { behavior: "suppress" }
    },
    priority: 0
  }, null, 2);
  resetMessageTokenSample();
  syncMessagePreviewFromJson();
  renderMessageAssetList();
  messageOutput.textContent = "Ready for a new message";
  renderMessagePerformance(null);
  if (messageVersionList) messageVersionList.innerHTML = row(["Save the message to start version history", "", "", ""]);
  if (messageVersionPreview) messageVersionPreview.innerHTML = "";
  if (!options.silent) openMessageDetail();
}

function loadMessage(id, messages) {
  const message = messages.find((item) => item.id === id);
  if (!message) {
    messageOutput.textContent = `Message not found: ${id}`;
    return;
  }
  selectedMessageId = id;
  document.querySelector("#message-id").value = message.id;
  document.querySelector("#message-id").disabled = true;
  document.querySelector("#message-name").value = message.name;
  document.querySelector("#message-application").value = applicationValue(message.metadata || {});
  document.querySelector("#message-surface").value = message.surface || "";
  document.querySelector("#message-status").value = message.status || "active";
  document.querySelector("#message-campaign").value = campaignValue(message.metadata || {});
  document.querySelector("#message-folder").value = folderValue(message.metadata || {});
  document.querySelector("#message-content").value = JSON.stringify(message.default_content || {}, null, 2);
  document.querySelector("#message-schema").value = JSON.stringify(message.content_schema || {}, null, 2);
  document.querySelector("#message-metadata").value = JSON.stringify(message.metadata || {}, null, 2);
  resetMessageTokenSample(message.metadata?.personalization_sample);
  syncMessageDeliveryFromMetadata(message.metadata || {});
  syncMessagePreviewFromJson();
  renderMessageAssetList();
  messageOutput.textContent = `Loaded ${id}`;
  if (messageVersionPreview) messageVersionPreview.innerHTML = "";
  loadMessageVersions(id);
  loadMessagePerformance(id);
  openMessageDetail();
}

async function loadMessagePerformance(id) {
  if (!id || !messagePerformanceSummary) return;
  messagePerformanceSummary.innerHTML = `<div class="status-line">Loading message performance...</div>`;
  try {
    const [metrics, experimentBody] = await Promise.all([
      api(`/v1/metrics/client-events?message_id=${encodeURIComponent(id)}&recent_limit=100&limit=8`),
      api("/v1/experiments").catch(() => ({ experiments: [] }))
    ]);
    cachedExperiments = experimentBody.experiments || cachedExperiments || [];
    cachedExperimentSummary = experimentBody.summary || cachedExperimentSummary || {};
    renderMessagePerformance(metrics, { messageId: id, experiments: cachedExperiments });
  } catch (error) {
    messagePerformanceSummary.innerHTML = `<div class="status-line">${escapeHtml(error.message)}</div>`;
  }
}

function renderMessagePerformance(metrics, options = {}) {
  if (!messagePerformanceSummary) return;
  if (!metrics) {
    messagePerformanceSummary.innerHTML = `
      <div class="message-performance-head">
        <strong>Performance</strong>
        <span>Save and reference this message from a rule to collect impressions, exposures, and conversions.</span>
      </div>
    `;
    return;
  }
  const byType = messageEventCounts(metrics.recent_events || [], metrics.by_message || []);
  const impressions = byType.impression || 0;
  const exposures = byType.exposure || 0;
  const conversions = byType.conversion || 0;
  const skipped = byType.skipped || 0;
  const interactionCounts = messageInteractionCounts(metrics.recent_events || []);
  const dismissals = interactionCounts.dismiss || 0;
  const conversionRate = exposures > 0 ? conversions / exposures : 0;
  const surfaces = (metrics.by_surface || []).filter((item) => item.key && item.key !== "(empty)").slice(0, 4);
  const profiles = (metrics.by_profile || []).filter((item) => item.key && item.key !== "(empty)").slice(0, 4);
  const recent = (metrics.recent_events || []).slice(0, 5);
  const surveyResponses = messageSurveyResponseSummary(metrics.recent_events || []);
  const deliveryDiagnostics = messageDeliveryDiagnostics(metrics.recent_events || []);
  const skipInsights = messageSkipInsights(metrics.recent_events || []);
  const ruleLinks = messageBacklinks(options.messageId || "");
  const impactRules = messageSkipImpactRules(metrics.recent_events || [], ruleLinks);
  const impactCampaigns = messageSkipImpactCampaigns(impactRules);
  const trend = messageSkipTrend(metrics.recent_events || []);
  const mobileHealth = messageMobileRenderingHealth(metrics.recent_events || [], {
    application: document.querySelector("#message-application")?.value.trim() || "",
    placement: document.querySelector("#message-placement")?.value.trim() || "",
    templateType: document.querySelector("#message-template-type")?.value || "banner",
    targetDevices: document.querySelector("#message-target-devices")?.value || "any"
  });
  const linkedExperiments = messageLinkedExperiments(options.messageId, options.experiments || cachedExperiments || []);
  messagePerformanceSummary.innerHTML = `
    <div class="message-performance-head">
      <div>
        <strong>Performance</strong>
        <span>${escapeHtml(metrics.generated_at ? `Updated ${formatTime(metrics.generated_at)}` : "Client feedback events")}</span>
      </div>
    </div>
    <div class="message-performance-kpis">
      ${statusItem("Impressions", formatNumber(impressions))}
      ${statusItem("Exposures", formatNumber(exposures))}
      ${statusItem("Conversions", formatNumber(conversions))}
      ${statusItem("Conv. rate", formatPercent(conversionRate))}
      ${statusItem("Dismissals", formatNumber(dismissals))}
      ${statusItem("Skipped", formatNumber(skipped))}
    </div>
    ${messageDeliveryDiagnosticsPanel(deliveryDiagnostics, skipInsights)}
    ${messageSkipBreakdownPanel(skipInsights)}
    ${messageSkipImpactPanel({ rules: impactRules, campaigns: impactCampaigns, trend })}
    ${messageMobileRenderingPanel(mobileHealth)}
    <div class="message-performance-grid">
      ${messagePerformanceList("Top surfaces", surfaces, "surface")}
      ${messagePerformanceList("Recent profiles", profiles, "profile")}
    </div>
    <div class="message-performance-events">
      <strong>Recent events</strong>
      ${recent.length ? recent.map(messagePerformanceEventRow).join("") : `<span>No client feedback events yet.</span>`}
    </div>
    ${messageSurveyAnalyticsPanel(surveyResponses)}
    ${messageExperimentAnalyticsPanel(linkedExperiments)}
  `;
}

function messageEventCounts(recentEvents = [], groupedMessages = []) {
  const counts = {};
  for (const item of groupedMessages || []) {
    if (item.event_type) counts[item.event_type] = (counts[item.event_type] || 0) + Number(item.count || 0);
  }
  if (Object.keys(counts).length) return counts;
  for (const event of recentEvents || []) {
    const type = event.event_type || event.type || "";
    if (type) counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

function messageInteractionCounts(recentEvents = []) {
  const counts = {};
  for (const event of recentEvents || []) {
    const details = event.event || {};
    const name = details.name || details.action || details.type || "";
    if (name) counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

function messageDeliveryDiagnostics(events = []) {
  const reasons = new Map();
  for (const event of events || []) {
    if ((event.event_type || event.type) !== "skipped") continue;
    const details = event.event || {};
    const reason = details.reason || event.context?.skipped_reason || "skipped";
    const current = reasons.get(reason) || {
      reason,
      category: details.category || "runtime",
      count: 0,
      profiles: new Set(),
      latest_at: ""
    };
    current.count += 1;
    if (event.profile_key) current.profiles.add(event.profile_key);
    if (event.occurred_at && (!current.latest_at || event.occurred_at > current.latest_at)) current.latest_at = event.occurred_at;
    reasons.set(reason, current);
  }
  return [...reasons.values()]
    .map((item) => ({ ...item, profiles: item.profiles.size }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason))
    .slice(0, 6);
}

function messageDeliveryDiagnosticsPanel(items = [], insights = null) {
  const skipped = Number(insights?.total || 0);
  const summary = skipped
    ? `${formatNumber(skipped)} skipped event${skipped === 1 ? "" : "s"} in the recent sample.`
    : "No skipped delivery events recorded for this message.";
  return `
    <div class="message-delivery-diagnostics">
      <div class="message-performance-head">
        <strong>Delivery diagnostics</strong>
        <span>${items.length ? `${summary} Recent SDK skip reasons and likely fixes.` : summary}</span>
      </div>
      ${items.length ? `
        <div class="message-delivery-diagnostic-list">
          ${items.map(messageDeliveryDiagnosticRow).join("")}
        </div>
      ` : `
        <div class="message-delivery-empty">
          Messages that do not render because of consent, device, URL, SDK condition, display policy, or dismiss policy will appear here after the SDK reports skipped delivery.
        </div>
      `}
    </div>
  `;
}

function messageDeliveryDiagnosticRow(item = {}) {
  const actions = messageDeliveryDiagnosticActions(item.reason);
  return `
    <div class="message-delivery-diagnostic-row">
      <span>${escapeHtml(messageDeliveryDiagnosticLabel(item.reason))}</span>
      <strong>${escapeHtml(formatNumber(item.count || 0))}</strong>
      <em>${escapeHtml(`${formatNumber(item.profiles || 0)} profiles${item.latest_at ? ` · latest ${formatTime(item.latest_at)}` : ""}`)}</em>
      <small>${escapeHtml(messageDeliveryDiagnosticHint(item.reason, item.category))}</small>
      ${actions.length ? `
        <div class="message-delivery-diagnostic-actions">
          ${actions.map((action) => `
            <button type="button" data-message-performance-action="focus-field" data-focus-target="${escapeHtml(action.target)}" data-focus-label="${escapeHtml(action.label)}">
              ${escapeHtml(action.label)}
            </button>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function messageDeliveryDiagnosticActions(reason = "") {
  const map = {
    consent: [{ label: "Consent", target: "#message-consent-category" }],
    device_targeting: [{ label: "Devices", target: "#message-target-devices" }, { label: "Placement", target: "#message-placement" }],
    platform_mismatch: [{ label: "Application", target: "#message-application" }, { label: "Template", target: "#message-template-type" }],
    application_mismatch: [{ label: "Application", target: "#message-application" }],
    placement_mismatch: [{ label: "Placement", target: "#message-placement" }, { label: "Surface", target: "#message-surface" }],
    template_unsupported: [{ label: "Template", target: "#message-template-type" }],
    mobile_sdk_version: [{ label: "Application", target: "#message-application" }, { label: "Template", target: "#message-template-type" }],
    url_targeting: [{ label: "Placement", target: "#message-placement" }, { label: "Surface", target: "#message-surface" }],
    sdk_condition: [{ label: "Trigger", target: "#message-trigger-type" }, { label: "Placement", target: "#message-placement" }],
    display_policy: [{ label: "Display", target: "#message-display-mode" }, { label: "Frequency", target: "#message-max-impressions" }],
    local_frequency_cap: [{ label: "Frequency", target: "#message-max-impressions" }, { label: "TTL", target: "#message-frequency-ttl" }],
    dismiss_cooldown: [{ label: "Dismiss", target: "#message-dismiss-behavior" }, { label: "TTL", target: "#message-frequency-ttl" }],
    local_dismiss_cooldown: [{ label: "Dismiss", target: "#message-dismiss-behavior" }, { label: "TTL", target: "#message-frequency-ttl" }],
    dismiss_suppression: [{ label: "Dismiss", target: "#message-dismiss-behavior" }],
    local_dismiss_suppression: [{ label: "Dismiss", target: "#message-dismiss-behavior" }]
  };
  return map[reason] || [];
}

function messageDeliveryDiagnosticLabel(reason = "") {
  return String(reason || "skipped")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function messageDeliveryDiagnosticHint(reason = "", category = "") {
  const hints = {
    consent: "Check consent category and SDK consentProvider values.",
    device_targeting: "Check target devices against the visitor viewport.",
    platform_mismatch: "Check whether the message was requested from the expected web or mobile runtime.",
    application_mismatch: "Check that the app/site identifier sent by the SDK matches the message application setting.",
    placement_mismatch: "Check that the requested placement and configured message placement describe the same slot.",
    template_unsupported: "The current client runtime does not support this template yet; switch template or upgrade the SDK.",
    mobile_sdk_version: "Check the mobile SDK version and feature support for this template or trigger type.",
    url_targeting: "Check Show on URL rules and page URL.",
    sdk_condition: "Check named SDK condition wiring on the website.",
    display_policy: "The visitor has already seen this message in the configured display window.",
    local_frequency_cap: "The client suppressed this message locally because the display window or cap is still active.",
    dismiss_cooldown: "The visitor dismissed this message and is still inside cooldown.",
    local_dismiss_cooldown: "The client still has a local dismiss cooldown recorded for this message.",
    dismiss_suppression: "The visitor dismissed this message and suppression is active.",
    local_dismiss_suppression: "The client has a local dismiss suppression record for this message."
  };
  return hints[reason] || (category === "frequency" ? "Check frequency, cooldown, and dismiss policy." : "Inspect SDK skipped event detail for this placement.");
}

function messagePerformanceList(title, items, fallbackLabel) {
  return `
    <section>
      <strong>${escapeHtml(title)}</strong>
      <div>
        ${items.length ? items.map((item) => `
          <span>
            <b>${escapeHtml(item.key || fallbackLabel)}</b>
            <em>${escapeHtml(`${formatNumber(item.count || 0)} ${item.event_type || "events"} · ${formatNumber(item.unique_profiles || 0)} profiles`)}</em>
          </span>
        `).join("") : `<span><b>No data</b><em>Waiting for client events</em></span>`}
      </div>
    </section>
  `;
}

function messageSkipInsights(events = []) {
  const skippedEvents = (events || []).filter((event) => (event.event_type || event.type) === "skipped");
  return {
    total: skippedEvents.length,
    placements: messageSkipContextBreakdown(skippedEvents, (event) => event.event?.placement || event.context?.placement || event.surface || "", "placement"),
    applications: messageSkipContextBreakdown(skippedEvents, (event) => event.event?.application || event.context?.application || event.context?.app_id || event.context?.application_id || "", "application"),
    recent: skippedEvents
      .slice()
      .sort((left, right) => String(right.occurred_at || "").localeCompare(String(left.occurred_at || "")))
      .slice(0, 5)
      .map((event) => ({
        reason: event.event?.reason || event.context?.skipped_reason || "skipped",
        placement: event.event?.placement || event.context?.placement || event.surface || "-",
        application: event.event?.application || event.context?.application || event.context?.app_id || event.context?.application_id || "-",
        profile: event.profile_key || "-",
        occurred_at: event.occurred_at || ""
      }))
  };
}

function messageSkipContextBreakdown(events = [], resolver, fallbackLabel = "context") {
  const groups = new Map();
  for (const event of events || []) {
    const key = String(resolver(event) || "").trim() || "(empty)";
    const current = groups.get(key) || { key, count: 0, profiles: new Set(), latest_at: "", label: fallbackLabel };
    current.count += 1;
    if (event.profile_key) current.profiles.add(event.profile_key);
    if (event.occurred_at && (!current.latest_at || event.occurred_at > current.latest_at)) current.latest_at = event.occurred_at;
    groups.set(key, current);
  }
  return [...groups.values()]
    .map((item) => ({ ...item, profiles: item.profiles.size }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, 5);
}

function messageSkipBreakdownPanel(insights = {}) {
  if (!Number(insights.total || 0)) return "";
  return `
    <div class="message-skip-breakdown">
      <div class="message-performance-head">
        <strong>Delivery friction</strong>
        <span>Where skipped delivery is clustering across placements, applications, and recent profiles.</span>
      </div>
      <div class="message-performance-grid">
        ${messageSkipBreakdownList("Skipped placements", insights.placements || [], "placement")}
        ${messageSkipBreakdownList("Skipped applications", insights.applications || [], "application")}
      </div>
      <div class="message-performance-events">
        <strong>Recent skipped events</strong>
        ${insights.recent?.length ? insights.recent.map(messageSkippedEventRow).join("") : `<span>No skipped events in the recent sample.</span>`}
      </div>
    </div>
  `;
}

function messageSkipImpactRules(events = [], ruleLinks = []) {
  const linksByRule = new Map((ruleLinks || []).map((link) => [link.rule_key, link]));
  const grouped = new Map();
  for (const event of events || []) {
    if ((event.event_type || event.type) !== "skipped") continue;
    const decisionKey = String(event.decision_key || "").trim();
    if (!decisionKey) continue;
    const link = linksByRule.get(decisionKey);
    const current = grouped.get(decisionKey) || {
      decision_key: decisionKey,
      rule_name: link?.rule_name || decisionKey,
      rule_type: link?.rule_type || "decision",
      campaign: campaignLabelForMetadata(ruleMetadataForDecision(decisionKey) || {}) || "Unassigned",
      count: 0,
      profiles: new Set(),
      latest_at: ""
    };
    current.count += 1;
    if (event.profile_key) current.profiles.add(event.profile_key);
    if (event.occurred_at && (!current.latest_at || event.occurred_at > current.latest_at)) current.latest_at = event.occurred_at;
    grouped.set(decisionKey, current);
  }
  return [...grouped.values()]
    .map((item) => ({ ...item, profiles: item.profiles.size }))
    .sort((left, right) => right.count - left.count || left.rule_name.localeCompare(right.rule_name))
    .slice(0, 6);
}

function messageSkipImpactCampaigns(items = []) {
  const grouped = new Map();
  for (const item of items || []) {
    const key = String(item.campaign || "Unassigned");
    const current = grouped.get(key) || { campaign: key, count: 0, rules: 0, profiles: 0, latest_at: "" };
    current.count += Number(item.count || 0);
    current.rules += 1;
    current.profiles += Number(item.profiles || 0);
    if (item.latest_at && (!current.latest_at || item.latest_at > current.latest_at)) current.latest_at = item.latest_at;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .sort((left, right) => right.count - left.count || left.campaign.localeCompare(right.campaign))
    .slice(0, 5);
}

function messageSkipTrend(events = []) {
  const rows = [...(events || [])]
    .filter((event) => event.occurred_at)
    .sort((left, right) => String(left.occurred_at).localeCompare(String(right.occurred_at)));
  if (!rows.length) return [];
  const first = new Date(rows[0].occurred_at);
  const last = new Date(rows.at(-1).occurred_at);
  const spanHours = Math.max(1, Math.round((last.getTime() - first.getTime()) / (60 * 60 * 1000)));
  const bucketHours = spanHours > 72 ? 24 : spanHours > 18 ? 6 : 1;
  const bucketMs = bucketHours * 60 * 60 * 1000;
  const buckets = new Map();
  for (const event of rows) {
    const time = new Date(event.occurred_at).getTime();
    const bucketTime = Math.floor(time / bucketMs) * bucketMs;
    const key = new Date(bucketTime).toISOString();
    const current = buckets.get(key) || { bucket: key, skipped: 0, delivered: 0, total: 0 };
    const type = event.event_type || event.type || "";
    if (type === "skipped") current.skipped += 1;
    if (type === "exposure" || type === "impression") current.delivered += 1;
    current.total += 1;
    buckets.set(key, current);
  }
  return [...buckets.values()]
    .sort((left, right) => left.bucket.localeCompare(right.bucket))
    .slice(-8)
    .map((item) => ({
      ...item,
      skip_rate: rate(item.skipped, Math.max(item.skipped + item.delivered, 1))
    }));
}

function messageSkipImpactPanel({ rules = [], campaigns = [], trend = [] } = {}) {
  if (!rules.length && !campaigns.length && !trend.length) return "";
  return `
    <div class="message-skip-impact">
      <div class="message-performance-head">
        <strong>Business impact</strong>
        <span>Which linked rules and campaigns are losing delivery in the recent sample.</span>
      </div>
      ${messageSkipTrendPanel(trend)}
      <div class="message-performance-grid">
        ${messageSkipRulesPanel(rules)}
        ${messageSkipCampaignsPanel(campaigns)}
      </div>
    </div>
  `;
}

function messageMobileRenderingHealth(events = [], context = {}) {
  const rows = (events || []).filter((event) => isMobileMessageEvent(event, context));
  const skipped = rows.filter((event) => (event.event_type || event.type) === "skipped");
  const exposures = rows.filter((event) => ["exposure", "impression"].includes(event.event_type || event.type));
  const total = rows.length;
  const appRows = groupMobileEvents(rows, mobileEventApplicationLabel);
  const platformRows = groupMobileEvents(rows, mobileEventPlatformLabel);
  const versionRows = groupMobileEvents(rows, (event) => event.context?.app_version || event.event?.app_version || "", 4);
  const issueRows = messageMobileIssueRows(skipped);
  return {
    enabled: context.targetDevices === "mobile" || context.targetDevices === "tablet" || rows.length > 0 || looksMobileApplication(context.application),
    total,
    skipped: skipped.length,
    delivered: exposures.length,
    skipRate: rate(skipped.length, Math.max(skipped.length + exposures.length, 1)),
    apps: appRows,
    platforms: platformRows,
    versions: versionRows,
    issues: issueRows
  };
}

function isMobileMessageEvent(event = {}, context = {}) {
  const platform = mobileEventPlatformLabel(event);
  const application = mobileEventApplicationLabel(event);
  const version = String(event.context?.app_version || event.event?.app_version || "").trim();
  return platform !== "(empty)" || application !== "(empty)" || Boolean(version) || context.targetDevices === "mobile" || context.targetDevices === "tablet" || looksMobileApplication(context.application);
}

function looksMobileApplication(value = "") {
  return /(ios|android|mobile|app|native|react[\s_-]?native|swiftui|compose)/i.test(String(value || ""));
}

function mobileEventApplicationLabel(event = {}) {
  return String(event.context?.application || event.context?.app_id || event.context?.application_id || event.event?.application || "").trim() || "(empty)";
}

function mobileEventPlatformLabel(event = {}) {
  return String(event.context?.platform || event.context?.device_type || event.event?.platform || "").trim() || "(empty)";
}

function groupMobileEvents(events = [], resolver, limit = 5) {
  const grouped = new Map();
  for (const event of events || []) {
    const key = String(resolver(event) || "").trim() || "(empty)";
    const current = grouped.get(key) || { key, total: 0, skipped: 0, delivered: 0, latest_at: "" };
    current.total += 1;
    const type = event.event_type || event.type || "";
    if (type === "skipped") current.skipped += 1;
    if (type === "exposure" || type === "impression") current.delivered += 1;
    if (event.occurred_at && (!current.latest_at || event.occurred_at > current.latest_at)) current.latest_at = event.occurred_at;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((item) => ({ ...item, skip_rate: rate(item.skipped, Math.max(item.skipped + item.delivered, 1)) }))
    .sort((left, right) => right.total - left.total || left.key.localeCompare(right.key))
    .slice(0, limit);
}

function messageMobileIssueRows(skippedEvents = []) {
  const grouped = new Map();
  for (const event of skippedEvents || []) {
    const details = event.event || {};
    const reason = String(details.reason || event.context?.skipped_reason || "skipped");
    const bucket = mobileIssueBucket(reason);
    const current = grouped.get(bucket.id) || { ...bucket, count: 0, latest_at: "" };
    current.count += 1;
    if (event.occurred_at && (!current.latest_at || event.occurred_at > current.latest_at)) current.latest_at = event.occurred_at;
    grouped.set(bucket.id, current);
  }
  return [...grouped.values()].sort((left, right) => right.count - left.count || left.title.localeCompare(right.title)).slice(0, 6);
}

function mobileIssueBucket(reason = "") {
  const id = String(reason || "skipped");
  if (["platform_mismatch", "application_mismatch", "placement_mismatch"].includes(id)) {
    return { id: "runtime_contract", title: "Runtime contract mismatch", detail: "App/platform/placement context does not match the message contract.", actions: ["#message-application", "#message-placement"] };
  }
  if (["mobile_sdk_version", "template_unsupported"].includes(id)) {
    return { id: "sdk_compatibility", title: "SDK compatibility", detail: "The current app runtime may not support this template or message capability.", actions: ["#message-template-type", "#message-application"] };
  }
  if (["local_frequency_cap", "display_policy", "dismiss_cooldown", "local_dismiss_cooldown", "dismiss_suppression", "local_dismiss_suppression"].includes(id)) {
    return { id: "local_suppression", title: "Local suppression state", detail: "The device or browser already has active display, dismiss, or cooldown state for this message.", actions: ["#message-display-mode", "#message-frequency-ttl", "#message-dismiss-behavior"] };
  }
  return { id, title: messageDeliveryDiagnosticLabel(id), detail: messageDeliveryDiagnosticHint(id, "runtime"), actions: [] };
}

function messageMobileRenderingPanel(report = {}) {
  if (!report.enabled) return "";
  return `
    <div class="message-mobile-rendering">
      <div class="message-performance-head">
        <strong>Mobile rendering health</strong>
        <span>${escapeHtml(report.total ? "Recent app-side delivery and suppression signals from mobile-like traffic." : "No mobile app feedback recorded for this message yet.")}</span>
      </div>
      <div class="message-performance-kpis">
        ${statusItem("Mobile events", formatNumber(report.total || 0))}
        ${statusItem("Delivered", formatNumber(report.delivered || 0))}
        ${statusItem("Skipped", formatNumber(report.skipped || 0))}
        ${statusItem("Skip rate", formatPercent(report.skipRate || 0))}
      </div>
      ${report.total ? `
        <div class="message-performance-grid">
          ${messageMobileGroupPanel("Applications", report.apps || [], "application")}
          ${messageMobileGroupPanel("Platforms", report.platforms || [], "platform")}
        </div>
        ${messageMobileVersionPanel(report.versions || [])}
        ${messageMobileIssuePanel(report.issues || [])}
      ` : `
        <div class="message-delivery-empty">
          Once native or hybrid app clients send platform, application, app_version, and skipped feedback, DEE will summarize runtime health here.
        </div>
      `}
    </div>
  `;
}

function messageMobileGroupPanel(title, items = [], fallbackLabel = "group") {
  return `
    <section>
      <strong>${escapeHtml(title)}</strong>
      <div class="message-impact-list">
        ${items.length ? items.map((item) => `
          <div class="message-impact-row">
            <div>
              <b>${escapeHtml(item.key === "(empty)" ? `No ${fallbackLabel}` : item.key)}</b>
              <em>${escapeHtml(`${formatNumber(item.total || 0)} events · ${formatNumber(item.skipped || 0)} skipped · ${formatPercent(item.skip_rate || 0)} skip rate${item.latest_at ? ` · latest ${formatTime(item.latest_at)}` : ""}`)}</em>
            </div>
            <span class="message-impact-muted">${escapeHtml(item.skip_rate >= 0.3 ? "Review" : "Healthy")}</span>
          </div>
        `).join("") : `<span><b>No data</b><em>Waiting for app-side message feedback</em></span>`}
      </div>
    </section>
  `;
}

function messageMobileVersionPanel(items = []) {
  if (!items.length) return "";
  return `
    <section class="message-mobile-version-panel">
      <div class="message-performance-head">
        <strong>App versions</strong>
        <span>Most recent app versions seen for this message.</span>
      </div>
      <div class="message-impact-list">
        ${items.map((item) => `
          <div class="message-impact-row">
            <div>
              <b>${escapeHtml(item.key === "(empty)" ? "Version missing" : item.key)}</b>
              <em>${escapeHtml(`${formatNumber(item.total || 0)} events · ${formatNumber(item.skipped || 0)} skipped · ${formatPercent(item.skip_rate || 0)} skip rate${item.latest_at ? ` · latest ${formatTime(item.latest_at)}` : ""}`)}</em>
            </div>
            <span class="message-impact-muted">${escapeHtml(item.skip_rate >= 0.3 ? "Review" : "Healthy")}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function messageMobileIssuePanel(items = []) {
  return `
    <section class="message-mobile-issue-panel">
      <div class="message-performance-head">
        <strong>Mobile issue classes</strong>
        <span>${escapeHtml(items.length ? "Top mobile-specific failure buckets in the recent sample." : "No mobile-specific skipped issue classes recorded.")}</span>
      </div>
      ${items.length ? `
        <div class="message-delivery-diagnostic-list">
          ${items.map((item) => `
            <div class="message-delivery-diagnostic-row">
              <span>${escapeHtml(item.title)}</span>
              <strong>${escapeHtml(formatNumber(item.count || 0))}</strong>
              <em>${escapeHtml(item.latest_at ? `latest ${formatTime(item.latest_at)}` : "recent sample")}</em>
              <small>${escapeHtml(item.detail)}</small>
              ${item.actions?.length ? `
                <div class="message-delivery-diagnostic-actions">
                  ${item.actions.map((target) => `
                    <button type="button" data-message-performance-action="focus-field" data-focus-target="${escapeHtml(target)}" data-focus-label="${escapeHtml(messageMobileActionLabel(target))}">
                      ${escapeHtml(messageMobileActionLabel(target))}
                    </button>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="message-delivery-empty">Runtime mismatch, unsupported template, and local suppression patterns will appear here once app clients report skipped delivery reasons.</div>
      `}
    </section>
  `;
}

function messageMobileActionLabel(target = "") {
  const labels = {
    "#message-application": "Application",
    "#message-placement": "Placement",
    "#message-template-type": "Template",
    "#message-display-mode": "Display",
    "#message-frequency-ttl": "TTL",
    "#message-dismiss-behavior": "Dismiss"
  };
  return labels[target] || "Setting";
}

function messageSkipTrendPanel(trend = []) {
  if (!trend.length) return "";
  const maxSkipped = Math.max(1, ...trend.map((item) => Number(item.skipped || 0)));
  return `
    <section class="message-skip-trend">
      <div class="message-performance-head">
        <strong>Skipped trend</strong>
        <span>Recent sample by ${escapeHtml(trendBucketLabel(trend))}. Bars show skipped volume; labels show skip rate.</span>
      </div>
      <div class="message-skip-trend-bars">
        ${trend.map((item) => `
          <div class="message-skip-trend-bar" title="${escapeHtml(`${formatTime(item.bucket)} · ${formatNumber(item.skipped)} skipped · ${formatPercent(item.skip_rate)} skip rate`)}">
            <div class="message-skip-trend-track">
              <i style="height:${Math.max(8, Math.round((Number(item.skipped || 0) / maxSkipped) * 100))}%"></i>
            </div>
            <strong>${escapeHtml(formatPercent(item.skip_rate))}</strong>
            <span>${escapeHtml(formatTrendBucketTime(item.bucket, trend))}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function trendBucketLabel(trend = []) {
  if (trend.length < 2) return "bucket";
  const first = new Date(trend[0].bucket);
  const second = new Date(trend[1].bucket);
  const hours = Math.round((second.getTime() - first.getTime()) / (60 * 60 * 1000));
  if (hours >= 24) return "day";
  if (hours >= 6) return "6 hours";
  return "hour";
}

function formatTrendBucketTime(value, trend = []) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const label = trendBucketLabel(trend);
  if (label === "day") return date.toLocaleDateString([], { month: "short", day: "numeric" });
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function messageSkipRulesPanel(items = []) {
  return `
    <section>
      <strong>Impacted rules</strong>
      <div class="message-impact-list">
        ${items.length ? items.map((item) => `
          <div class="message-impact-row">
            <div>
              <b>${escapeHtml(item.rule_name || item.decision_key)}</b>
              <em>${escapeHtml(`${item.campaign} · ${formatNumber(item.count || 0)} skipped · ${formatNumber(item.profiles || 0)} profiles${item.latest_at ? ` · latest ${formatTime(item.latest_at)}` : ""}`)}</em>
            </div>
            <button type="button" data-message-performance-action="open-rule" data-decision-key="${escapeHtml(item.decision_key)}">Open rule</button>
          </div>
        `).join("") : `<span><b>No linked rules</b><em>Skipped events have not been attributed to a linked rule yet.</em></span>`}
      </div>
    </section>
  `;
}

function messageSkipCampaignsPanel(items = []) {
  return `
    <section>
      <strong>Impacted campaigns</strong>
      <div class="message-impact-list">
        ${items.length ? items.map((item) => `
          <div class="message-impact-row">
            <div>
              <b>${escapeHtml(item.campaign || "Unassigned")}</b>
              <em>${escapeHtml(`${formatNumber(item.count || 0)} skipped · ${formatNumber(item.rules || 0)} rules · ${formatNumber(item.profiles || 0)} profiles${item.latest_at ? ` · latest ${formatTime(item.latest_at)}` : ""}`)}</em>
            </div>
            ${item.campaign && item.campaign !== "Unassigned"
              ? `<button type="button" data-message-performance-action="open-campaign" data-campaign-name="${escapeHtml(item.campaign)}">Open campaign</button>`
              : `<span class="message-impact-muted">No campaign</span>`}
          </div>
        `).join("") : `<span><b>No campaign impact</b><em>Linked rules in the recent skipped sample are not grouped into campaigns yet.</em></span>`}
      </div>
    </section>
  `;
}

function messageSkipBreakdownList(title, items = [], fallbackLabel = "item") {
  return `
    <section>
      <strong>${escapeHtml(title)}</strong>
      <div>
        ${items.length ? items.map((item) => `
          <span>
            <b>${escapeHtml(item.key === "(empty)" ? `No ${fallbackLabel}` : item.key)}</b>
            <em>${escapeHtml(`${formatNumber(item.count || 0)} skipped · ${formatNumber(item.profiles || 0)} profiles${item.latest_at ? ` · latest ${formatTime(item.latest_at)}` : ""}`)}</em>
          </span>
        `).join("") : `<span><b>No data</b><em>Waiting for skipped delivery events</em></span>`}
      </div>
    </section>
  `;
}

function messageSkippedEventRow(event = {}) {
  const reason = messageDeliveryDiagnosticLabel(event.reason || "skipped");
  const summary = [event.placement, event.application, event.profile, event.occurred_at ? formatTime(event.occurred_at) : ""].filter(Boolean).join(" · ");
  return `
    <span>
      <b>${escapeHtml(reason)}</b>
      <em>${escapeHtml(summary || "-")}</em>
    </span>
  `;
}

function messagePerformanceEventRow(event = {}) {
  const surveyValue = event.event?.survey_value || "";
  return `
    <span>
      <b>${escapeHtml(event.event_type || event.type || "-")}</b>
      <em>${escapeHtml([surveyValue ? `Survey: ${surveyValue}` : "", event.surface, event.profile_key, event.occurred_at ? formatTime(event.occurred_at) : ""].filter(Boolean).join(" · ") || "-")}</em>
    </span>
  `;
}

function messageSurveyResponseSummary(events = []) {
  const questions = new Map();
  for (const event of events || []) {
    const details = event.event || {};
    if (details.type !== "survey_response" && !details.survey_question && !details.survey_value) continue;
    const questionKey = details.survey_question || details.survey_question_label || "survey_question";
    const question = questions.get(questionKey) || {
      key: questionKey,
      label: details.survey_question_label || questionKey,
      total: 0,
      values: new Map(),
      latest_at: ""
    };
    const value = String(details.survey_value || details.value || "(empty)");
    const current = question.values.get(value) || { value, count: 0, profiles: new Set() };
    current.count += 1;
    if (event.profile_key) current.profiles.add(event.profile_key);
    question.values.set(value, current);
    question.total += 1;
    if (event.occurred_at && (!question.latest_at || event.occurred_at > question.latest_at)) question.latest_at = event.occurred_at;
    questions.set(questionKey, question);
  }
  return [...questions.values()].map((question) => ({
    ...question,
    values: [...question.values.values()]
      .map((item) => ({ ...item, profiles: item.profiles.size }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
      .slice(0, 8)
  })).sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}

function messageSurveyAnalyticsPanel(questions = []) {
  if (!questions.length) return "";
  return `
    <div class="message-survey-analytics">
      <div class="message-performance-head">
        <strong>Survey responses</strong>
        <span>Recent response distribution from SDK conversion events.</span>
      </div>
      <div class="message-survey-analytics-list">
        ${questions.map(messageSurveyAnalyticsQuestion).join("")}
      </div>
    </div>
  `;
}

function messageSurveyAnalyticsQuestion(question = {}) {
  return `
    <section class="message-survey-analytics-question">
      <div class="message-survey-analytics-head">
        <strong>${escapeHtml(question.label || question.key || "Survey question")}</strong>
        <span>${escapeHtml(`${formatNumber(question.total || 0)} response${Number(question.total || 0) === 1 ? "" : "s"}${question.latest_at ? ` · latest ${formatTime(question.latest_at)}` : ""}`)}</span>
      </div>
      <div class="message-survey-analytics-values">
        ${question.values.map((item) => {
          const share = question.total ? Number(item.count || 0) / question.total : 0;
          return `
            <div>
              <span>${escapeHtml(item.value || "(empty)")}</span>
              <b>${escapeHtml(formatNumber(item.count || 0))}</b>
              <em>${escapeHtml(`${formatPercent(share)} · ${formatNumber(item.profiles || 0)} profiles`)}</em>
              <i style="--share:${Math.max(2, Math.round(share * 100))}%"></i>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function messageLinkedExperiments(messageId, experiments = []) {
  if (!messageId) return [];
  return (experiments || [])
    .map((experiment) => {
      const variants = (experiment.variants || []).filter((variant) => variant.outputs?.message_id === messageId);
      return variants.length ? { ...experiment, variants } : null;
    })
    .filter(Boolean)
    .sort((left, right) => String(right.updated_at || "").localeCompare(String(left.updated_at || "")))
    .slice(0, 4);
}

function messageExperimentAnalyticsPanel(experiments = []) {
  return `
    <div class="message-experiment-analytics">
      <div class="message-performance-head">
        <strong>Message experiments</strong>
        <span>${experiments.length ? "Variant performance for experiments using this message." : "Create a message experiment draft to compare content variants."}</span>
      </div>
      ${experiments.length ? experiments.map(messageExperimentAnalyticsCard).join("") : `<div class="status-line">No linked message experiments yet.</div>`}
    </div>
  `;
}

function messageExperimentAnalyticsCard(experiment = {}) {
  const totalExposure = (experiment.variants || []).reduce((sum, variant) => sum + Number(variant.events?.exposure?.count || 0), 0);
  const totalConversion = (experiment.variants || []).reduce((sum, variant) => sum + Number(variant.events?.conversion?.count || 0), 0);
  const winner = experiment.significant_winner_variant || experiment.winner_variant || "";
  return `
    <section class="message-experiment-analytics-card">
      <div class="message-experiment-analytics-head">
        <div>
          <strong>${escapeHtml(experiment.name || experiment.decision_key || "Experiment")}</strong>
          <span>${escapeHtml([experiment.decision_key, experiment.surface, experiment.experiment_status || experiment.status].filter(Boolean).join(" · "))}</span>
        </div>
        <mark>${escapeHtml(winner ? `Winner: ${winner}` : "Monitoring")}</mark>
      </div>
      <div class="message-experiment-analytics-kpis">
        ${statusItem("Exposures", formatNumber(totalExposure))}
        ${statusItem("Conversions", formatNumber(totalConversion))}
        ${statusItem("Conv. rate", formatPercent(totalExposure ? totalConversion / totalExposure : 0))}
        ${statusItem("Confidence", formatPercent(experiment.significant_winner_confidence || 0))}
      </div>
      <div class="message-experiment-variant-list">
        ${(experiment.variants || []).map(messageExperimentVariantAnalyticsRow).join("")}
      </div>
    </section>
  `;
}

function messageExperimentVariantAnalyticsRow(variant = {}) {
  const exposure = variant.events?.exposure || {};
  const conversion = variant.events?.conversion || {};
  const impression = variant.events?.impression || {};
  return `
    <div class="message-experiment-variant-row">
      <strong>${escapeHtml(variant.key || "(empty)")}${variant.baseline ? " · baseline" : ""}</strong>
      <span>${formatNumber(variant.weight || 0)}%</span>
      <span>${formatNumber(exposure.count || 0)} exp</span>
      <span>${formatNumber(conversion.count || 0)} conv</span>
      <span>${formatPercent(variant.conversion_rate || 0)}</span>
      <span>${formatLift(variant.lift_vs_baseline)}</span>
      <span>${experimentSignificanceLabel(variant.significance)}</span>
      <span>${formatNumber(impression.count || 0)} imp</span>
    </div>
  `;
}

function duplicateSelectedMessage() {
  const sourceId = selectedMessageId || document.querySelector("#message-id").value.trim();
  const source = cachedMessages.find((item) => item.id === sourceId);
  if (!source) {
    messageOutput.textContent = "Open a saved message before duplicating it.";
    return;
  }
  selectedMessageId = null;
  const copyId = uniqueMessageCopyId(source.id);
  const metadata = { ...(source.metadata || {}) };
  delete metadata.created_from_assistant_plan;
  document.querySelector("#message-id").value = copyId;
  document.querySelector("#message-id").disabled = false;
  document.querySelector("#message-name").value = `${source.name || source.id} Copy`;
  document.querySelector("#message-application").value = applicationValue(metadata);
  document.querySelector("#message-surface").value = source.surface || "";
  document.querySelector("#message-status").value = "active";
  document.querySelector("#message-campaign").value = campaignValue(metadata);
  document.querySelector("#message-folder").value = folderValue(metadata);
  document.querySelector("#message-content").value = JSON.stringify(source.default_content || {}, null, 2);
  document.querySelector("#message-schema").value = JSON.stringify(source.content_schema || {}, null, 2);
  document.querySelector("#message-metadata").value = JSON.stringify(metadata, null, 2);
  resetMessageTokenSample(metadata.personalization_sample);
  syncMessageDeliveryFromMetadata(metadata);
  syncMessagePreviewFromJson();
  renderMessageAssetList();
  messageOutput.textContent = `Duplicated ${source.id}. Review the copy and save it as ${copyId}.`;
}

async function loadMessageVersions(id = selectedMessageId) {
  if (!messageVersionList || !id) return;
  messageVersionList.innerHTML = header(["Version", "Updated", "Author", "Status", "Content", "Actions"]);
  try {
    const body = await api(`/v1/messages/${encodeURIComponent(id)}/versions`);
    const versions = body.versions || [];
    messageVersionList.innerHTML += versions.length
      ? versions.map((version) => row([
          `v${version.version}`,
          formatTime(version.updated_at),
          version.author || "-",
          version.status || "-",
          (version.content_keys || []).join(", ") || "-",
          [
            `<button type="button" data-message-version-preview="${escapeHtml(version.version)}">Preview</button>`,
            `<button type="button" data-message-version-diff="${escapeHtml(version.version)}">Diff</button>`,
            `<button type="button" data-message-version-restore="${escapeHtml(version.version)}">Restore</button>`
          ].join("")
        ], { messageVersion: version.version, rawColumns: [5] })).join("")
      : row(["No versions recorded yet", "", "", "", "", ""]);
    messageVersionList.querySelectorAll("[data-message-version]").forEach((element) => {
      element.addEventListener("click", () => loadMessageVersionDetail(id, element.dataset.messageVersion));
    });
    messageVersionList.querySelectorAll("[data-message-version-preview]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        loadMessageVersionDetail(id, button.dataset.messageVersionPreview);
      });
    });
    messageVersionList.querySelectorAll("[data-message-version-diff]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        loadMessageVersionDiff(id, button.dataset.messageVersionDiff);
      });
    });
    messageVersionList.querySelectorAll("[data-message-version-restore]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        await restoreMessageVersion(id, button.dataset.messageVersionRestore);
      });
    });
  } catch (error) {
    messageVersionList.innerHTML += row([error.message, "", "", "", "", ""]);
  }
}

async function loadMessageVersionDetail(id, version) {
  try {
    const body = await api(`/v1/messages/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`);
    renderMessageVersionSnapshot(body.message);
    messageOutput.textContent = `Previewing saved message version v${version}.`;
    activateMessageWorkspaceTab("metadata");
    activateMessageMetaTab("versions");
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

async function loadMessageVersionDiff(id, version) {
  try {
    const [diffBody, versionBody] = await Promise.all([
      api(`/v1/messages/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/diff?compare_to=current`),
      api(`/v1/messages/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`)
    ]);
    const currentMessage = cachedMessages.find((item) => item.id === id) || null;
    renderMessageVersionVisualDiff(versionBody.message, currentMessage, diffBody.diff || []);
    messageOutput.textContent = formatMessageVersionDiff(diffBody);
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function renderMessageVersionVisualDiff(beforeMessage, currentMessage, diff = []) {
  if (!messageVersionPreview) return;
  const before = messagePreviewPayloadFromMessage(beforeMessage);
  const current = messagePreviewPayloadFromMessage(currentMessage || beforeMessage);
  const changedPaths = new Set(diff.map((item) => item.path));
  messageVersionPreview.innerHTML = `
    <div class="message-version-preview-head">
      <strong>Visual comparison</strong>
      <span>${escapeHtml(formatNumber(diff.length))} changed path${diff.length === 1 ? "" : "s"}</span>
    </div>
    <div class="message-version-preview-grid">
      ${messageVersionPreviewCard("Before", beforeMessage, before, changedPaths)}
      ${messageVersionPreviewCard("Current", currentMessage, current, changedPaths)}
    </div>
  `;
}

function renderMessageVersionSnapshot(message) {
  if (!messageVersionPreview) return;
  const payload = messagePreviewPayloadFromMessage(message);
  const contentKeys = Object.keys(message?.default_content || {});
  messageVersionPreview.innerHTML = `
    <div class="message-version-preview-head">
      <strong>Saved snapshot</strong>
      <span>${escapeHtml(`v${message?.version || "-"} · ${message?.updated_at ? formatTime(message.updated_at) : "-"} · ${message?.author || "-"}`)}</span>
    </div>
    <div class="message-version-preview-grid single">
      <div class="message-version-preview-card">
        <div class="message-version-preview-label">
          <strong>${escapeHtml(message?.name || payload.title || "Saved message")}</strong>
          <span>${escapeHtml([message?.status || "active", message?.surface || "-", payload.templateType].join(" · "))}</span>
        </div>
        <div class="message-preview-card"
          data-template="${escapeHtml(payload.templateType)}"
          data-archived="${message?.status === "archived" ? "true" : "false"}"
          data-has-cta="${payload.ctas.length ? "true" : "false"}">
          ${messagePreviewCardInnerHtml(payload)}
        </div>
        <div class="message-version-badges">
          ${contentKeys.length ? contentKeys.map((key) => `<span>${escapeHtml(key)}</span>`).join("") : `<span>No content fields</span>`}
        </div>
      </div>
    </div>
  `;
}

function messageVersionPreviewCard(label, message, payload, changedPaths) {
  const changedBadges = [
    changedPaths.has("$.default_content.title") ? "Title" : "",
    changedPaths.has("$.default_content.body") ? "Body" : "",
    changedPaths.has("$.default_content.footer") ? "Footer" : "",
    changedPaths.has("$.default_content.image_url") ? "Image" : "",
    [...changedPaths].some((path) => path.startsWith("$.default_content.ctas")) ? "CTA" : "",
    changedPaths.has("$.status") ? "Status" : "",
    changedPaths.has("$.surface") ? "Surface" : "",
    [...changedPaths].some((path) => path.startsWith("$.metadata")) ? "Metadata" : ""
  ].filter(Boolean);
  return `
    <div class="message-version-preview-card">
      <div class="message-version-preview-label">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(message?.version ? `v${message.version}` : "current")} · ${escapeHtml(message?.updated_at ? formatTime(message.updated_at) : "-")}</span>
      </div>
      <div class="message-preview-card"
        data-template="${escapeHtml(payload.templateType)}"
        data-archived="${message?.status === "archived" ? "true" : "false"}"
        data-has-cta="${payload.ctas.length ? "true" : "false"}">
        ${messagePreviewCardInnerHtml(payload)}
      </div>
      <div class="message-version-badges">
        ${changedBadges.length ? changedBadges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("") : `<span>No visual changes</span>`}
      </div>
    </div>
  `;
}

function messagePreviewPayloadFromMessage(message = {}) {
  const content = message?.default_content || {};
  const ctas = normalizeMessageCtas(content);
  return {
    templateType: messageTemplateType(content.template_type || content.type || "banner"),
    placement: content.placement || message?.metadata?.placement || "",
    surface: message?.surface || "-",
    title: content.title || message?.name || "Untitled message",
    body: content.body || "No message body yet.",
    footer: content.footer || "",
    imageUrl: content.image_url || "",
    ctas,
    content
  };
}

function formatMessageVersionDiff(body = {}) {
  const diff = body.diff || [];
  const lines = [
    `Message diff: v${body.left?.version ?? "-"} -> ${body.right?.version ?? "current"}`,
    `Left: ${body.left?.updated_at ? formatTime(body.left.updated_at) : "-"} · ${body.left?.author || "-"}`,
    `Right: ${body.right?.updated_at ? formatTime(body.right.updated_at) : "-"} · ${body.right?.author || "-"}`,
    ""
  ];
  if (!diff.length) {
    lines.push("No content, schema, or metadata changes.");
  } else {
    for (const item of diff) {
      lines.push(`${item.change.toUpperCase()} ${item.path}`);
      lines.push(`  before: ${formatDiffValue(item.before)}`);
      lines.push(`  after:  ${formatDiffValue(item.after)}`);
    }
  }
  return lines.join("\n");
}

async function restoreMessageVersion(id, version) {
  const ok = window.confirm(`Restore message version v${version} as the current draft? This will create a new latest version from that snapshot.`);
  if (!ok) return;
  try {
    const response = await api(`/v1/messages/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/restore`, {
      method: "POST"
    });
    await loadMessages();
    loadMessage(response.message.id, cachedMessages);
    activateMessageWorkspaceTab("metadata");
    activateMessageMetaTab("versions");
    messageOutput.textContent = `Restored v${version} as the latest editable message version.`;
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function formatDiffValue(value) {
  if (value === undefined) return "(missing)";
  if (value === "") return "\"\"";
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function uniqueMessageCopyId(baseId) {
  const base = slug(`${baseId}_copy`);
  const existing = new Set(cachedMessages.map((item) => item.id));
  if (!existing.has(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}_${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

async function saveMessage(event) {
  event.preventDefault();
  try {
    syncMessageJsonFromPreview();
    syncMessageMetadataFromDelivery();
    const id = selectedMessageId || document.querySelector("#message-id").value.trim();
    const body = {
      name: document.querySelector("#message-name").value.trim() || id,
      surface: document.querySelector("#message-surface").value.trim(),
      status: document.querySelector("#message-status").value,
      default_content: JSON.parse(document.querySelector("#message-content").value || "{}"),
      content_schema: JSON.parse(document.querySelector("#message-schema").value || "{}"),
      metadata: JSON.parse(document.querySelector("#message-metadata").value || "{}")
    };
    const response = await api(`/v1/messages/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    selectedMessageId = response.message.id;
    document.querySelector("#message-id").disabled = true;
    messageOutput.textContent = JSON.stringify(response, null, 2);
    await loadMessages();
    await loadMessageVersions(response.message.id);
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function syncMessagePreviewFromJson() {
  try {
    const content = JSON.parse(document.querySelector("#message-content").value || "{}");
    const ctas = normalizeMessageCtas(content);
    document.querySelector("#message-template-type").value = messageTemplateType(content.template_type || content.type || "banner");
    document.querySelector("#message-placement").value = content.placement || "";
    document.querySelector("#message-preview-title").value = content.title || "";
    document.querySelector("#message-preview-body").value = content.body || "";
    document.querySelector("#message-preview-footer").value = content.footer || "";
    document.querySelector("#message-preview-image").value = content.image_url || "";
    document.querySelector("#message-primary-cta-label").value = ctas[0]?.label || "";
    document.querySelector("#message-primary-cta-url").value = ctas[0]?.url || "";
    document.querySelector("#message-secondary-cta-label").value = ctas[1]?.label || "";
    document.querySelector("#message-secondary-cta-url").value = ctas[1]?.url || "";
    renderMessageSurveyBuilder(content);
    renderMessagePreview();
    renderMessageRuleLinks();
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function syncMessageJsonFromPreview(options = {}) {
  const current = parseJsonSafe(document.querySelector("#message-content").value || "{}");
  const ctas = [
    {
      label: document.querySelector("#message-primary-cta-label").value.trim(),
      url: document.querySelector("#message-primary-cta-url").value.trim(),
      style: "primary"
    },
    {
      label: document.querySelector("#message-secondary-cta-label").value.trim(),
      url: document.querySelector("#message-secondary-cta-url").value.trim(),
      style: "secondary"
    }
  ].filter((cta) => cta.label || cta.url);
  const content = {
    ...current,
    template_type: document.querySelector("#message-template-type").value,
    placement: document.querySelector("#message-placement").value.trim(),
    title: document.querySelector("#message-preview-title").value.trim(),
    body: document.querySelector("#message-preview-body").value.trim(),
    footer: document.querySelector("#message-preview-footer").value.trim(),
    image_url: document.querySelector("#message-preview-image").value.trim(),
    ctas
  };
  if (content.template_type === "survey") {
    const questions = collectSurveyQuestionsFromBuilder();
    if (questions.length) {
      content.questions = questions;
      content.survey = {
        ...(current.survey && typeof current.survey === "object" ? current.survey : {}),
        questions
      };
      delete content.question;
      delete content.options;
    }
  }
  content.cta_label = ctas[0]?.label || "";
  content.cta_url = ctas[0]?.url || "";
  document.querySelector("#message-content").value = JSON.stringify(content, null, 2);
  renderMessagePreview();
  if (!options.quiet) messageOutput.textContent = "Message JSON synced";
}

function renderMessageSurveyBuilder(content = null) {
  if (!messageSurveyPanel || !messageSurveyBuilder) return;
  const templateType = messageTemplateType(document.querySelector("#message-template-type")?.value || "banner");
  const isSurvey = templateType === "survey";
  messageSurveyPanel.hidden = !isSurvey;
  if (!isSurvey) return;
  const source = content || parseJsonSafe(document.querySelector("#message-content")?.value || "{}") || {};
  const questions = surveyQuestionsFromContent(source);
  messageSurveyBuilder.innerHTML = questions.map((question, index) => surveyQuestionEditor(question, index, questions.length)).join("");
}

function surveyQuestionsFromContent(content = {}) {
  const survey = content.survey && typeof content.survey === "object" ? content.survey : {};
  const sourceQuestions = Array.isArray(content.questions) && content.questions.length
    ? content.questions
    : Array.isArray(survey.questions) && survey.questions.length
      ? survey.questions
      : content.question
        ? [{ label: content.question, type: content.type || "choice", options: content.options || survey.options || [] }]
        : [];
  const questions = sourceQuestions.length ? sourceQuestions : [defaultSurveyQuestion()];
  return questions.slice(0, 12).map(normalizeSurveyQuestion);
}

function defaultSurveyQuestion() {
  return {
    id: uniqueSurveyId("question"),
    label: "How relevant is this message?",
    type: "choice",
    required: false,
    tracking_name: "survey_response",
    options: [
      { label: "Not relevant", value: "low" },
      { label: "Somewhat relevant", value: "medium" },
      { label: "Very relevant", value: "high" }
    ]
  };
}

function normalizeSurveyQuestion(question = {}) {
  const type = surveyQuestionType(question.type || (Array.isArray(question.options) && question.options.length ? "choice" : "text"));
  const normalized = {
    id: question.id || uniqueSurveyId("question"),
    label: question.label || question.title || question.question || "Question",
    type,
    required: Boolean(question.required),
    tracking_name: question.tracking_name || question.trackingName || question.id || "survey_response",
    options: type === "text" ? [] : surveyOptionsForQuestion(question, type)
  };
  const showIf = normalizeSurveyShowIf(question.show_if || question.showIf);
  if (showIf) normalized.show_if = showIf;
  return normalized;
}

function normalizeSurveyShowIf(showIf = null) {
  if (!showIf || typeof showIf !== "object") return null;
  const question = String(showIf.question || showIf.question_id || showIf.questionId || "").trim();
  const value = String(showIf.value || showIf.equals || showIf.answer || "").trim();
  return question && value ? { question, value } : null;
}

function surveyOptionsForQuestion(question = {}, type = "choice") {
  const source = Array.isArray(question.options) && question.options.length
    ? question.options
    : type === "rating"
      ? [1, 2, 3, 4, 5]
      : ["Yes", "No"];
  return source.slice(0, 12).map((option) => {
    const optionObject = option && typeof option === "object" ? option : {};
    const label = optionObject.label || optionObject.title || optionObject.value || String(option);
    return {
      id: optionObject.id || uniqueSurveyId("option"),
      label,
      value: optionObject.value || optionObject.id || slug(label) || label,
      tracking_name: optionObject.tracking_name || ""
    };
  });
}

function surveyQuestionType(value) {
  return ["choice", "rating", "text"].includes(value) ? value : "choice";
}

function surveyQuestionEditor(question, index, total) {
  const optionsDisabled = question.type === "text";
  const showIf = normalizeSurveyShowIf(question.show_if) || {};
  return `
    <section class="message-survey-question" data-survey-question-index="${escapeHtml(index)}" data-question-id="${escapeHtml(question.id)}">
      <div class="message-survey-question-head">
        <strong>Question ${index + 1}</strong>
        <div>
          <button type="button" data-survey-action="move-question-up" data-index="${escapeHtml(index)}" ${index === 0 ? "disabled" : ""}>Up</button>
          <button type="button" data-survey-action="move-question-down" data-index="${escapeHtml(index)}" ${index >= total - 1 ? "disabled" : ""}>Down</button>
          <button type="button" data-survey-action="remove-question" data-index="${escapeHtml(index)}" ${total <= 1 ? "disabled" : ""}>Remove</button>
        </div>
      </div>
      <div class="message-survey-question-grid">
        <label>
          Question text
          <input value="${escapeHtml(question.label)}" data-survey-question-field="label" />
        </label>
        <label>
          Type
          <select data-survey-question-field="type">
            <option value="choice" ${question.type === "choice" ? "selected" : ""}>Choice</option>
            <option value="rating" ${question.type === "rating" ? "selected" : ""}>Rating</option>
            <option value="text" ${question.type === "text" ? "selected" : ""}>Text</option>
          </select>
        </label>
        <label>
          Tracking name
          <input value="${escapeHtml(question.tracking_name)}" data-survey-question-field="tracking_name" placeholder="survey_response" />
        </label>
        <label class="message-survey-required">
          <input type="checkbox" data-survey-question-field="required" ${question.required ? "checked" : ""} />
          Required
        </label>
      </div>
      <div class="message-survey-question-grid">
        <label>
          Show when question ID
          <input value="${escapeHtml(showIf.question || "")}" data-survey-question-field="show_if_question" placeholder="${index === 0 ? "Always shown" : "question id"}" />
        </label>
        <label>
          Has answer value
          <input value="${escapeHtml(showIf.value || "")}" data-survey-question-field="show_if_value" placeholder="yes, high, 5..." />
        </label>
        <p class="message-survey-branch-hint">Leave empty to show this question immediately. Use this for follow-up questions that depend on a previous answer.</p>
      </div>
      <div class="message-survey-options" data-options-disabled="${optionsDisabled ? "true" : "false"}">
        <div class="message-survey-options-head">
          <span>${optionsDisabled ? "Text response" : "Answer options"}</span>
          <button type="button" data-survey-action="add-option" data-index="${escapeHtml(index)}" ${optionsDisabled ? "disabled" : ""}>Add Option</button>
        </div>
        ${optionsDisabled ? `<p>Visitors will type a free-form answer.</p>` : question.options.map((option, optionIndex) => surveyOptionEditor(option, index, optionIndex)).join("")}
      </div>
    </section>
  `;
}

function surveyOptionEditor(option, questionIndex, optionIndex) {
  return `
    <div class="message-survey-option" data-survey-option-index="${escapeHtml(optionIndex)}">
      <input value="${escapeHtml(option.label)}" data-survey-option-field="label" aria-label="Option label" placeholder="Label" />
      <input value="${escapeHtml(option.value)}" data-survey-option-field="value" aria-label="Option value" placeholder="Value" />
      <button type="button" data-survey-action="remove-option" data-index="${escapeHtml(questionIndex)}" data-option-index="${escapeHtml(optionIndex)}">Remove</button>
    </div>
  `;
}

function handleMessageSurveyBuilderClick(event) {
  const button = event.target.closest("[data-survey-action]");
  if (!button) return;
  const questions = collectSurveyQuestionsFromBuilder();
  const index = Number(button.dataset.index || 0);
  const optionIndex = Number(button.dataset.optionIndex || 0);
  if (button.dataset.surveyAction === "add-question") {
    questions.push(defaultSurveyQuestion());
  }
  if (button.dataset.surveyAction === "remove-question" && questions.length > 1) {
    questions.splice(index, 1);
  }
  if (button.dataset.surveyAction === "move-question-up" && index > 0) {
    [questions[index - 1], questions[index]] = [questions[index], questions[index - 1]];
  }
  if (button.dataset.surveyAction === "move-question-down" && index < questions.length - 1) {
    [questions[index + 1], questions[index]] = [questions[index], questions[index + 1]];
  }
  if (button.dataset.surveyAction === "add-option") {
    questions[index]?.options.push({ label: "New option", value: `option_${questions[index].options.length + 1}` });
  }
  if (button.dataset.surveyAction === "remove-option") {
    questions[index]?.options.splice(optionIndex, 1);
  }
  setSurveyQuestionsInContent(questions);
  renderMessageSurveyBuilder(parseJsonSafe(document.querySelector("#message-content")?.value || "{}"));
  renderMessagePreview();
}

function handleMessageSurveyBuilderInput(event) {
  if (!event.target.closest("[data-survey-question-field], [data-survey-option-field]")) return;
  setSurveyQuestionsInContent(collectSurveyQuestionsFromBuilder());
  if (event.target.matches('[data-survey-question-field="type"]')) {
    renderMessageSurveyBuilder(parseJsonSafe(document.querySelector("#message-content")?.value || "{}"));
  }
  renderMessagePreview();
}

function collectSurveyQuestionsFromBuilder() {
  if (!messageSurveyBuilder || messageSurveyPanel?.hidden) return [];
  return [...messageSurveyBuilder.querySelectorAll(".message-survey-question")].map((questionElement) => {
    const type = surveyQuestionType(questionElement.querySelector('[data-survey-question-field="type"]')?.value || "choice");
    const question = {
      id: questionElement.dataset.questionId || uniqueSurveyId("question"),
      label: questionElement.querySelector('[data-survey-question-field="label"]')?.value.trim() || "Question",
      type,
      required: Boolean(questionElement.querySelector('[data-survey-question-field="required"]')?.checked),
      tracking_name: questionElement.querySelector('[data-survey-question-field="tracking_name"]')?.value.trim() || "survey_response",
      options: []
    };
    const showIf = normalizeSurveyShowIf({
      question: questionElement.querySelector('[data-survey-question-field="show_if_question"]')?.value,
      value: questionElement.querySelector('[data-survey-question-field="show_if_value"]')?.value
    });
    if (showIf) question.show_if = showIf;
    if (type !== "text") {
      question.options = [...questionElement.querySelectorAll(".message-survey-option")].map((optionElement) => {
        const label = optionElement.querySelector('[data-survey-option-field="label"]')?.value.trim() || "Option";
        return {
          label,
          value: optionElement.querySelector('[data-survey-option-field="value"]')?.value.trim() || slug(label) || label
        };
      });
      if (!question.options.length) question.options = surveyOptionsForQuestion({}, type);
    }
    return question;
  });
}

function setSurveyQuestionsInContent(questions = []) {
  const current = parseJsonSafe(document.querySelector("#message-content")?.value || "{}") || {};
  const normalized = questions.length ? questions.map(normalizeSurveyQuestion) : [defaultSurveyQuestion()];
  const next = {
    ...current,
    template_type: "survey",
    questions: normalized,
    survey: {
      ...(current.survey && typeof current.survey === "object" ? current.survey : {}),
      questions: normalized
    }
  };
  delete next.question;
  delete next.options;
  document.querySelector("#message-content").value = JSON.stringify(next, null, 2);
}

function uniqueSurveyId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function syncMessageJsonFromPreviewLive() {
  syncMessageJsonFromPreview({ quiet: true });
  renderMessageRuleLinks();
}

function syncMessageDeliveryFromMetadata(metadata = {}) {
  const lifecycle = metadata.lifecycle || metadata.delivery || {};
  const delivery = metadata.delivery || metadata.lifecycle || {};
  const display = delivery.display || {};
  const frequency = delivery.frequency || {};
  const targeting = delivery.targeting || {};
  const trigger = delivery.trigger || {};
  const consent = delivery.consent || {};
  const dismiss = delivery.dismiss || {};
  document.querySelector("#message-application").value = applicationValue(metadata);
  document.querySelector("#message-starts-at").value = dateTimeLocalValue(lifecycle.starts_at || metadata.starts_at || "");
  document.querySelector("#message-expires-at").value = dateTimeLocalValue(lifecycle.expires_at || metadata.expires_at || "");
  document.querySelector("#message-priority").value = Number(metadata.priority ?? lifecycle.priority ?? 0);
  document.querySelector("#message-frequency-ttl").value = Number(frequency.cooldown_seconds ?? lifecycle.ttl_seconds ?? metadata.ttl_seconds ?? 0) || "";
  document.querySelector("#message-display-mode").value = messageDisplayMode(display.mode || lifecycle.display_mode || metadata.display_mode || "always");
  document.querySelector("#message-trigger-type").value = messageTriggerType(trigger.type || lifecycle.trigger_type || "page_load");
  document.querySelector("#message-max-impressions").value = Number(frequency.max_impressions ?? lifecycle.max_impressions ?? metadata.max_impressions ?? 0) || "";
  document.querySelector("#message-target-devices").value = messageTargetDevice(targeting.devices || targeting.device || metadata.target_devices || "any");
  document.querySelector("#message-consent-category").value = consent.category || metadata.consent_category || "";
  document.querySelector("#message-dismiss-behavior").value = messageDismissBehavior(dismiss.behavior || lifecycle.dismiss_behavior || "suppress");
  document.querySelector("#message-campaign").value = campaignValue(metadata);
  document.querySelector("#message-folder").value = folderValue(metadata);
}

function syncMessageMetadataFromDelivery() {
  const metadata = parseJsonSafe(document.querySelector("#message-metadata").value || "{}");
  const startsAt = isoFromDateTimeLocal(document.querySelector("#message-starts-at").value);
  const expiresAt = isoFromDateTimeLocal(document.querySelector("#message-expires-at").value);
  const ttl = Number(document.querySelector("#message-frequency-ttl").value || 0);
  const maxImpressions = Number(document.querySelector("#message-max-impressions").value || 0);
  const displayMode = messageDisplayMode(document.querySelector("#message-display-mode").value);
  const triggerType = messageTriggerType(document.querySelector("#message-trigger-type").value);
  const targetDevices = messageTargetDevice(document.querySelector("#message-target-devices").value);
  const consentCategory = document.querySelector("#message-consent-category").value.trim();
  const dismissBehavior = messageDismissBehavior(document.querySelector("#message-dismiss-behavior").value);
  metadata.priority = Number(document.querySelector("#message-priority").value || 0);
  metadata.lifecycle = {
    ...(metadata.lifecycle || {}),
    starts_at: startsAt,
    expires_at: expiresAt,
    ttl_seconds: Number.isFinite(ttl) && ttl > 0 ? ttl : 0
  };
  metadata.delivery = {
    ...(metadata.delivery || {}),
    display: {
      ...(metadata.delivery?.display || {}),
      mode: displayMode
    },
    frequency: {
      ...(metadata.delivery?.frequency || {}),
      cooldown_seconds: Number.isFinite(ttl) && ttl > 0 ? ttl : 0,
      max_impressions: Number.isFinite(maxImpressions) && maxImpressions > 0 ? maxImpressions : 0
    },
    targeting: {
      ...(metadata.delivery?.targeting || {}),
      devices: targetDevices
    },
    trigger: {
      ...(metadata.delivery?.trigger || {}),
      type: triggerType
    },
    dismiss: {
      ...(metadata.delivery?.dismiss || {}),
      behavior: dismissBehavior
    }
  };
  if (consentCategory) metadata.delivery.consent = { ...(metadata.delivery.consent || {}), category: consentCategory, required: true };
  else delete metadata.delivery.consent;
  metadata.campaign = campaignMetadata(
    document.querySelector("#message-campaign")?.value.trim(),
    document.querySelector("#message-folder")?.value.trim()
  );
  if (!metadata.campaign.name && !metadata.campaign.folder) delete metadata.campaign;
  const application = document.querySelector("#message-application")?.value.trim() || "";
  if (application) metadata.application = application;
  else delete metadata.application;
  delete metadata.application_id;
  metadata.app_id = application || "";
  if (!metadata.app_id) delete metadata.app_id;
  const sample = parseJsonSafe(messageTokenSample?.value || "{}");
  if (sample && Object.keys(sample).length) metadata.personalization_sample = sample;
  else delete metadata.personalization_sample;
  document.querySelector("#message-metadata").value = JSON.stringify(metadata, null, 2);
}

function messageDisplayMode(value) {
  return ["always", "once", "once_per_session", "once_per_day", "once_per_week"].includes(value) ? value : "always";
}

function messageTriggerType(value) {
  return ["page_load", "manual", "custom_event", "data_layer_event", "exit_intent", "scroll_depth"].includes(value) ? value : "page_load";
}

function messageTargetDevice(value) {
  if (Array.isArray(value)) return messageTargetDevice(value[0] || "any");
  return ["any", "desktop", "mobile", "tablet"].includes(value) ? value : "any";
}

function messageDismissBehavior(value) {
  return ["suppress", "cooldown", "ignore"].includes(value) ? value : "suppress";
}

function activateMessageWorkspaceTab(tabId = "content") {
  document.querySelectorAll("[data-message-workspace-tab]").forEach((button) => {
    const active = button.dataset.messageWorkspaceTab === tabId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll("[data-message-workspace-panel]").forEach((panel) => {
    const active = panel.dataset.messageWorkspacePanel === tabId;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

function activateMessageContentTab(tabId = "content_json") {
  document.querySelectorAll("[data-message-content-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.messageContentTab === tabId);
  });
  document.querySelectorAll("[data-message-content-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.messageContentPanel === tabId);
  });
}

function activateMessageMetaTab(tabId = "metadata_json") {
  if (tabId === "metadata_json" && document.querySelector("#message-metadata-advanced-panel")?.hidden) {
    setMessageAdvancedOpen("message-metadata-advanced-panel", true);
  }
  document.querySelectorAll("[data-message-meta-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.messageMetaTab === tabId);
  });
  document.querySelectorAll("[data-message-meta-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.messageMetaPanel === tabId);
  });
}

function setMessageAdvancedOpen(targetId = "message-advanced-panel", open = false) {
  const panel = document.querySelector(`#${cssEscape(targetId)}`);
  document.querySelectorAll("[data-message-advanced-toggle]").forEach((button) => {
    const defaultTarget = button.dataset.messageAdvancedTarget || "message-advanced-panel";
    if (defaultTarget !== targetId) return;
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.textContent = open ? "Hide advanced" : "Show advanced";
    button.classList.toggle("active", open);
  });
  if (panel) panel.hidden = !open;
}

function formatActiveMessageJson() {
  if (document.querySelector("#message-advanced-panel")?.hidden) {
    setMessageAdvancedOpen("message-advanced-panel", true);
  }
  const activePanel = document.querySelector('[data-message-workspace-panel].active [data-message-content-panel].active, [data-message-workspace-panel].active [data-message-meta-panel].active');
  const textarea = activePanel?.querySelector("textarea");
  if (!textarea) {
    messageOutput.textContent = "Select a JSON tab to format";
    return;
  }
  try {
    textarea.value = JSON.stringify(JSON.parse(textarea.value || "{}"), null, 2);
    if (textarea.id === "message-content") syncMessagePreviewFromJson();
    messageOutput.textContent = "JSON formatted";
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function resetMessageTokenSample(sample = null) {
  if (!messageTokenSample) return;
  messageTokenSample.value = JSON.stringify(sample || defaultMessageTokenSample(), null, 2);
  renderMessageTokenSuggestions();
}

function defaultMessageTokenSample() {
  const sample = {
    profile_key: document.querySelector("#message-id")?.value || "visitor@example.com",
    attributes: {},
    segments: {},
    context: {
      channel: "web",
      app_id: document.querySelector("#message-application")?.value || "web-storefront",
      surface: document.querySelector("#message-surface")?.value || "homepage"
    }
  };
  for (const item of cachedSchema.slice(0, 60)) {
    if (item.kind === "attribute") sample.attributes[item.name] = sampleValueForSchemaItem(item);
    if (item.kind === "segment") sample.segments[item.name] = true;
    if (item.kind === "context") sample.context[item.name] = sampleValueForSchemaItem(item);
  }
  if (!Object.keys(sample.attributes).length) {
    sample.attributes.first_name = "Karel";
    sample.attributes.lead_score = 82;
    sample.attributes.customer_lifetime_value = 4200;
  }
  if (!Object.keys(sample.segments).length) sample.segments.high_intent = true;
  return sample;
}

function sampleValueForSchemaItem(item = {}) {
  const name = String(item.name || "").toLowerCase();
  const type = String(item.type || item.raw?.type || "").toLowerCase();
  if (type.includes("bool")) return true;
  if (type.includes("number") || type.includes("integer") || type.includes("float") || /score|count|amount|value|monetary|balance|age/.test(name)) return 42;
  if (/date|time/.test(type) || /date|time|at$/.test(name)) return new Date().toISOString();
  if (/name/.test(name)) return "Karel";
  if (/email/.test(name)) return "karel.holub@meiro.io";
  if (/tier/.test(name)) return "gold";
  if (/channel/.test(name)) return "web";
  return "sample";
}

function renderMessageTokenSuggestions() {
  if (!messageTokenSuggestions) return;
  const tokens = messagePersonalizationTokens();
  messageTokenSuggestions.innerHTML = tokens.length
    ? tokens.map((item) => `<button type="button" data-message-token="${escapeHtml(item.token)}" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</button>`).join("")
    : `<span>No schema tokens synced yet.</span>`;
}

function messagePersonalizationTokens() {
  const schemaTokens = cachedSchema
    .filter((item) => ["attribute", "segment", "context"].includes(item.kind))
    .slice(0, 36)
    .map((item) => {
      const prefix = item.kind === "attribute" ? "attributes" : item.kind === "segment" ? "segments" : "context";
      return {
        label: `${item.kind}: ${item.name}`,
        token: `{{${prefix}.${item.name}}}`
      };
    });
  return [
    { label: "profile key", token: "{{profile_key}}" },
    { label: "email", token: "{{identifiers.email}}" },
    ...schemaTokens
  ];
}

function handleMessageTokenClick(event) {
  const button = event.target.closest("[data-message-token]");
  if (!button) return;
  const target = document.querySelector(selectedMessageTokenField) || document.querySelector("#message-preview-body");
  if (!target) return;
  insertTextAtCursor(target, button.dataset.messageToken);
  target.focus();
  syncMessageJsonFromPreviewLive();
  messageOutput.textContent = `Inserted ${button.dataset.messageToken}`;
}

function insertTextAtCursor(element, text) {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? element.value.length;
  const before = element.value.slice(0, start);
  const after = element.value.slice(end);
  const spacer = before && !before.endsWith(" ") && !String(text).startsWith(" ") ? " " : "";
  element.value = `${before}${spacer}${text}${after}`;
  const cursor = before.length + spacer.length + String(text).length;
  element.setSelectionRange?.(cursor, cursor);
}

function renderPersonalizedText(value, sample) {
  if (!messageRenderTokens?.checked) return value;
  return String(value || "").replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, path) => {
    const resolved = resolveSamplePath(sample, path);
    return resolved === undefined || resolved === null || resolved === "" ? match : String(resolved);
  });
}

function resolveSamplePath(sample, path) {
  const parts = String(path || "").split(".").filter(Boolean);
  let current = sample || {};
  for (const part of parts) {
    if (Array.isArray(current)) current = current[0];
    if (current && typeof current === "object" && "value" in current && !Object.prototype.hasOwnProperty.call(current, part)) current = current.value;
    if (!current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part)) return undefined;
    current = current[part];
  }
  if (Array.isArray(current)) current = current[0];
  if (current && typeof current === "object" && "value" in current) return current.value;
  return current;
}

function messageTokenStats() {
  const sample = parseJsonSafe(messageTokenSample?.value || "{}");
  return messageTokenStatsForSample(sample);
}

function messageTokenStatsForSample(sample = {}) {
  const content = [
    document.querySelector("#message-preview-title")?.value || "",
    document.querySelector("#message-preview-body")?.value || "",
    document.querySelector("#message-preview-footer")?.value || "",
    document.querySelector("#message-primary-cta-label")?.value || "",
    document.querySelector("#message-primary-cta-url")?.value || "",
    document.querySelector("#message-secondary-cta-label")?.value || "",
    document.querySelector("#message-secondary-cta-url")?.value || ""
  ].join("\n");
  const tokens = [...content.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((match) => match[1]);
  return {
    tokens,
    missing: tokens.filter((token) => resolveSamplePath(sample, token) === undefined)
  };
}

function renderMessagePreview() {
  if (!messagePreview) return;
  const templateType = messageTemplateType(document.querySelector("#message-template-type").value);
  const placement = document.querySelector("#message-placement").value.trim();
  const raw = messagePreviewRawContent();
  const rawTitle = raw.title;
  const rawBody = raw.body;
  const sample = parseJsonSafe(messageTokenSample?.value || "{}");
  const title = renderPersonalizedText(rawTitle || document.querySelector("#message-name").value.trim() || "Untitled message", sample);
  const body = renderPersonalizedText(rawBody || "No message body yet.", sample);
  const footer = renderPersonalizedText(raw.footer, sample);
  const imageUrl = raw.imageUrl;
  const application = document.querySelector("#message-application").value.trim() || "-";
  const surface = document.querySelector("#message-surface").value.trim() || "-";
  const status = document.querySelector("#message-status").value || "active";
  const ttl = Number(document.querySelector("#message-frequency-ttl").value || 0);
  const displayMode = messageDisplayMode(document.querySelector("#message-display-mode").value);
  const triggerType = messageTriggerType(document.querySelector("#message-trigger-type").value);
  const maxImpressions = Number(document.querySelector("#message-max-impressions").value || 0);
  const targetDevices = messageTargetDevice(document.querySelector("#message-target-devices").value);
  const consentCategory = document.querySelector("#message-consent-category").value.trim();
  const dismissBehavior = messageDismissBehavior(document.querySelector("#message-dismiss-behavior").value);
  const expiresAt = document.querySelector("#message-expires-at").value;
  const startsAt = document.querySelector("#message-starts-at").value;
  const previewDevice = activeMessagePreviewDevice();
  const ctas = [
    {
      label: renderPersonalizedText(raw.primaryCtaLabel, sample),
      url: renderPersonalizedText(raw.primaryCtaUrl, sample),
      style: "primary"
    },
    {
      label: renderPersonalizedText(raw.secondaryCtaLabel, sample),
      url: renderPersonalizedText(raw.secondaryCtaUrl, sample),
      style: "secondary"
    }
  ].filter((cta) => cta.label || cta.url);
  renderMessageImageGuidance(templateType);
  const health = messagePreviewChecks({
    status,
    startsAt,
    expiresAt,
    ttl,
    templateType,
    placement,
    surface,
    title: rawTitle,
    body: rawBody,
    footer,
    imageUrl,
    ctas,
    displayMode,
    triggerType,
    maxImpressions,
    targetDevices,
    application,
    previewDevice,
    consentCategory,
    dismissBehavior,
    tokens: messageTokenStats()
  });
  messagePreview.dataset.health = health.level;
  messagePreview.dataset.hasCta = ctas.length ? "true" : "false";
  messagePreview.dataset.archived = status === "archived" ? "true" : "false";
  messagePreview.dataset.template = templateType;
  messagePreview.innerHTML = messagePreviewCardInnerHtml({ templateType, placement, surface, title, body, footer, imageUrl, ctas, content: parseJsonSafe(document.querySelector("#message-content").value || "{}") });
  const runtime = messageRuntimeProfile({
    templateType,
    placement,
    surface,
    application,
    targetDevices,
    triggerType,
    previewDevice,
    content: parseJsonSafe(document.querySelector("#message-content").value || "{}")
  });
  messageInspectorSummary.innerHTML = [
    statusItem("Status", status),
    statusItem("Preview health", messagePreviewHealthLabel(health)),
    statusItem("Template", templateType),
    statusItem("Runtime", messageDeliveryLabel(runtime.platform)),
    statusItem("Application", application),
    statusItem("Placement", placement || "-"),
    statusItem("Surface", surface),
    statusItem("Display", messageDeliveryLabel(displayMode)),
    statusItem("Trigger", messageDeliveryLabel(triggerType)),
    statusItem("Cooldown", ttl > 0 ? `${ttl}s` : "None"),
    statusItem("Max impressions", maxImpressions > 0 ? formatNumber(maxImpressions) : "No cap"),
    statusItem("Devices", messageDeliveryLabel(targetDevices)),
    statusItem("Preview device", messageDeliveryLabel(previewDevice)),
    statusItem("Consent", consentCategory || "-"),
    statusItem("Dismiss", messageDeliveryLabel(dismissBehavior)),
    statusItem("Starts", startsAt ? formatTime(new Date(startsAt).toISOString()) : "Now"),
    statusItem("Expires", expiresAt ? formatTime(new Date(expiresAt).toISOString()) : "-"),
    statusItem("Message ID", document.querySelector("#message-id").value.trim() || "-"),
    statusItem("Schema fields", Object.keys(parseJsonSafe(document.querySelector("#message-schema").value || "{}")).length),
    statusItem("Tokens", messageTokenStats().tokens.length ? `${messageTokenStats().tokens.length} used` : "None")
  ].join("");
  renderMessagePreviewHealth(health);
  renderMessageRuntimeContract(runtime);
  renderMessageReadiness({
    id: document.querySelector("#message-id").value.trim(),
    status,
    templateType,
    placement,
    surface,
    application,
    runtime,
    campaign: document.querySelector("#message-campaign")?.value.trim() || "",
    folder: document.querySelector("#message-folder")?.value.trim() || "",
    startsAt,
    expiresAt,
    ttl,
    displayMode,
    triggerType,
    maxImpressions,
    targetDevices,
    consentCategory,
    ctas,
    imageUrl
  }, health);
  renderMessageAudienceComparison({ templateType, placement, surface, raw });
  renderMessageExperimentIdeas({ templateType, placement, surface, raw, ctas });
  renderMessageRuleLinks();
  renderMessageAssetList();
}

function activeMessagePreviewDevice() {
  return document.querySelector('[data-message-preview-device].active')?.dataset.messagePreviewDevice || messagePreview?.dataset.device || "desktop";
}

function messageRuntimeProfile({ templateType = "banner", placement = "", surface = "", application = "", targetDevices = "any", triggerType = "page_load", previewDevice = "desktop", content = {} } = {}) {
  const normalizedTemplate = messageTemplateType(templateType);
  const normalizedPlacement = String(placement || "").trim();
  const normalizedSurface = String(surface || "").trim();
  const normalizedApplication = String(application || "").trim();
  const signals = [normalizedApplication, normalizedPlacement, normalizedSurface].join(" ").toLowerCase();
  const mobileSignal = /(ios|android|mobile|app|native|react[\s_-]?native|swiftui|compose)/.test(signals);
  const appScoped = Boolean(normalizedApplication);
  const platform = mobileSignal || ["mobile", "tablet"].includes(targetDevices) ? "mobile" : "web";
  const interruptive = ["modal", "toast", "alert"].includes(normalizedTemplate);
  const collection = ["carousel", "recommendation"].includes(normalizedTemplate);
  const survey = normalizedTemplate === "survey";
  const htmlFragment = normalizedTemplate === "html_fragment";
  const questions = surveyQuestionsForPreview(content);
  let support = "ready";
  if (platform === "mobile" && htmlFragment) support = "review";
  if (platform === "mobile" && !appScoped) support = "review";
  return {
    platform,
    appScoped,
    support,
    templateType: normalizedTemplate,
    placement: normalizedPlacement,
    surface: normalizedSurface,
    application: normalizedApplication,
    targetDevices,
    previewDevice,
    triggerType,
    interruptive,
    collection,
    survey,
    htmlFragment,
    surveyQuestionCount: survey ? questions.length : 0,
    contentType: survey ? "survey" : collection ? "collection" : htmlFragment ? "html" : "message",
    likelySdk: platform === "mobile" ? "Native or hybrid app SDK" : "Web SDK / GTM"
  };
}

function renderMessageRuntimeContract(runtime = {}) {
  if (!messageRuntimeContract) return;
  const notes = messageRuntimeNotes(runtime);
  messageRuntimeContract.innerHTML = `
    <div class="message-runtime-head ${escapeHtml(runtime.support || "ready")}">
      <div>
        <strong>Runtime Contract</strong>
        <span>${escapeHtml(runtime.likelySdk || "Delivery contract inferred from application, placement, and template settings.")}</span>
      </div>
      <span>${escapeHtml(runtime.support === "ready" ? "Portable" : "Review")}</span>
    </div>
    <div class="message-runtime-metrics">
      ${messageRuntimeMetric("Platform", messageDeliveryLabel(runtime.platform || "web"))}
      ${messageRuntimeMetric("Content type", messageDeliveryLabel(runtime.contentType || "message"))}
      ${messageRuntimeMetric("Application", runtime.application || "Any app / site")}
      ${messageRuntimeMetric("Placement", runtime.placement || runtime.surface || "-")}
      ${messageRuntimeMetric("Trigger", messageDeliveryLabel(runtime.triggerType || "page_load"))}
      ${messageRuntimeMetric("Devices", messageDeliveryLabel(runtime.targetDevices || "any"))}
    </div>
    <div class="message-runtime-notes">
      ${notes.map((item) => `
        <div class="message-runtime-note ${escapeHtml(item.level)}">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.detail)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function messageRuntimeMetric(label, value) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function messageRuntimeNotes(runtime = {}) {
  const notes = [];
  if (runtime.platform === "mobile") {
    notes.push({
      level: runtime.appScoped ? "ok" : "warn",
      title: runtime.appScoped ? "Application scoped" : "Application missing",
      detail: runtime.appScoped
        ? "This message is tied to a named application, which is better for native app routing and analytics."
        : "Add an application value so mobile delivery, diagnostics, and QA can stay scoped to one app."
    });
    notes.push({
      level: runtime.placement ? "ok" : "warn",
      title: runtime.placement ? "Placement defined" : "Placement underspecified",
      detail: runtime.placement
        ? "Native app teams can map this placement to a screen region or message slot."
        : "Define a placement for app teams, for example home.hero, inbox.top, or cart.inline."
    });
    if (runtime.htmlFragment) {
      notes.push({
        level: "warn",
        title: "HTML fragment is risky on mobile",
        detail: "Guarded HTML can work in webviews, but native mobile usually needs structured templates like banner, card, modal, or survey."
      });
    }
    if (runtime.survey && runtime.surveyQuestionCount > 3) {
      notes.push({
        level: "warn",
        title: "Survey may feel long on mobile",
        detail: `${formatNumber(runtime.surveyQuestionCount)} questions are configured. Consider 1 to 3 quick prompts for in-app completion.`
      });
    }
    if (runtime.triggerType === "manual") {
      notes.push({
        level: "info",
        title: "Manual trigger expected",
        detail: "The app needs to call the SDK from the right screen or lifecycle event instead of relying on automatic page-load behavior."
      });
    }
  } else {
    notes.push({
      level: "ok",
      title: "Web delivery profile",
      detail: "This configuration reads like a browser or GTM placement, which lines up with the current web SDK."
    });
  }
  if (runtime.interruptive) {
    notes.push({
      level: "info",
      title: "Interruptive format",
      detail: "Modal, alert, and toast placements should usually have a frequency cap or dismiss cooldown."
    });
  }
  return notes.slice(0, 4);
}

function messageDeliveryLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function messagePreviewRawContent() {
  return {
    title: document.querySelector("#message-preview-title").value.trim(),
    body: document.querySelector("#message-preview-body").value.trim(),
    footer: document.querySelector("#message-preview-footer").value.trim(),
    imageUrl: document.querySelector("#message-preview-image").value.trim(),
    primaryCtaLabel: document.querySelector("#message-primary-cta-label").value.trim(),
    primaryCtaUrl: document.querySelector("#message-primary-cta-url").value.trim(),
    secondaryCtaLabel: document.querySelector("#message-secondary-cta-label").value.trim(),
    secondaryCtaUrl: document.querySelector("#message-secondary-cta-url").value.trim()
  };
}

function renderMessageAudienceComparison({ templateType, placement, surface, raw }) {
  if (!messageAudienceComparison) return;
  const baseSample = parseJsonSafe(messageTokenSample?.value || "{}") || {};
  const samples = messageAudienceSamples(baseSample);
  messageAudienceComparison.innerHTML = `
    <div class="message-audience-head">
      <div>
        <strong>Audience comparison</strong>
        <span>Preview the same content against common profile scenarios.</span>
      </div>
    </div>
    <div class="message-audience-grid">
      ${samples.map((sample) => messageAudienceCard({ sample, templateType, placement, surface, raw })).join("")}
    </div>
  `;
}

function renderMessageExperimentIdeas({ templateType, placement, surface, raw, ctas }) {
  if (!messageExperimentIdeas) return;
  const baseContent = parseJsonSafe(document.querySelector("#message-content").value || "{}");
  const variants = messageExperimentVariants({ templateType, placement, raw, ctas, baseContent });
  messageExperimentIdeas.innerHTML = `
    <div class="message-experiment-head">
      <div>
        <strong>Experiment ideas</strong>
        <span>Variant-ready content snippets for A/B tests or holdout rules.</span>
      </div>
      <mark>Fixed split ready</mark>
    </div>
    <div class="message-experiment-grid">
      ${variants.map((variant, index) => messageExperimentIdeaCard(variant, index)).join("")}
    </div>
  `;
}

function messageExperimentVariants({ templateType, placement, raw, ctas, baseContent }) {
  const title = raw.title || document.querySelector("#message-name")?.value.trim() || baseContent.title || "Message";
  const body = raw.body || baseContent.body || "A personalized message is ready.";
  const primaryCta = ctas?.[0] || { label: baseContent.cta_label || "Learn more", url: baseContent.cta_url || "#", style: "primary" };
  const existingItems = Array.isArray(baseContent.items) ? baseContent.items : Array.isArray(baseContent.products) ? baseContent.products : Array.isArray(baseContent.recommendations) ? baseContent.recommendations : [];
  return [
    {
      key: "control",
      weight: 50,
      label: "Control",
      hypothesis: "Keep the current message as the baseline for lift comparison.",
      content: {
        ...baseContent,
        template_type: templateType,
        placement,
        title,
        body,
        ctas: ctas?.length ? ctas : [primaryCta]
      }
    },
    {
      key: "value_framing",
      weight: 25,
      label: "Value framing",
      hypothesis: "Lead with a sharper benefit and direct CTA to improve click-through.",
      content: {
        ...baseContent,
        template_type: templateType,
        placement,
        title: title.includes("{{") ? title : `${title}: tailored for you`,
        body: body.length > 20 ? `${body} Available for a limited time based on your current profile.` : "A relevant offer is available based on your recent activity.",
        ctas: [{ ...primaryCta, label: primaryCta.label && primaryCta.label !== "Learn more" ? primaryCta.label : "View my offer" }]
      }
    },
    {
      key: ["carousel", "recommendation"].includes(templateType) ? "ranked_items" : "concise_layout",
      weight: 25,
      label: ["carousel", "recommendation"].includes(templateType) ? "Ranked items" : "Concise layout",
      hypothesis: ["carousel", "recommendation"].includes(templateType)
        ? "Show fewer, clearer recommendations to reduce choice friction."
        : "Shorter copy with a stronger CTA can perform better on mobile placements.",
      content: {
        ...baseContent,
        template_type: ["banner", "alert", "modal", "inline", "toast"].includes(templateType) ? "card" : templateType,
        placement,
        title: title.replace(/\.$/, ""),
        body: conciseMessageBody(body),
        items: existingItems.length ? existingItems.slice(0, 3) : baseContent.items,
        ctas: [{ ...primaryCta, label: "Continue" }]
      }
    }
  ];
}

function conciseMessageBody(body) {
  const value = String(body || "").trim();
  if (!value) return "Personalized for your current journey.";
  if (value.length <= 110) return value;
  return `${value.slice(0, 106).trim()}...`;
}

function messageExperimentIdeaCard(variant, index) {
  const outputPayload = {
    variant: variant.key,
    message_content: variant.content
  };
  const draftButton = variant.key === "control"
    ? ""
    : `<button type="button" data-message-variant-draft="${index}">Create draft</button>`;
  return `
    <section class="message-experiment-card">
      <div class="message-experiment-card-head">
        <div>
          <strong>${escapeHtml(variant.label)}</strong>
          <span>${escapeHtml(`${variant.key} · ${variant.weight}%`)}</span>
        </div>
        <div class="message-experiment-actions">
          <button type="button" data-message-variant-apply="${index}">Apply</button>
          ${draftButton}
        </div>
      </div>
      <p>${escapeHtml(variant.hypothesis)}</p>
      <div class="message-experiment-preview message-preview-card compact" data-template="${escapeHtml(messageTemplateType(variant.content.template_type))}" data-has-cta="${normalizeMessageCtas(variant.content).length ? "true" : "false"}">
        ${messagePreviewCardInnerHtml({
          templateType: variant.content.template_type,
          placement: variant.content.placement,
          surface: document.querySelector("#message-surface")?.value.trim() || "",
          title: variant.content.title,
          body: variant.content.body,
          footer: variant.content.footer || "",
          imageUrl: variant.content.image_url || "",
          ctas: normalizeMessageCtas(variant.content),
          content: variant.content
        })}
      </div>
      <details>
        <summary>Variant output JSON</summary>
        <pre>${escapeHtml(JSON.stringify(outputPayload, null, 2))}</pre>
      </details>
    </section>
  `;
}

async function handleMessageExperimentIdeaClick(event) {
  const draftButton = event.target.closest("[data-message-variant-draft]");
  if (draftButton) {
    await createMessageExperimentDraft(Number(draftButton.dataset.messageVariantDraft || 0));
    return;
  }
  const button = event.target.closest("[data-message-variant-apply]");
  if (!button) return;
  const variants = currentMessageExperimentVariants();
  const variant = variants[Number(button.dataset.messageVariantApply || 0)];
  if (!variant) return;
  document.querySelector("#message-content").value = JSON.stringify(variant.content, null, 2);
  syncMessagePreviewFromJson();
  messageOutput.textContent = `Applied ${variant.label} variant to Content JSON. Save the message or copy the variant output into an experiment branch.`;
}

function currentMessageExperimentVariants() {
  const raw = messagePreviewRawContent();
  const templateType = messageTemplateType(document.querySelector("#message-template-type").value);
  const baseContent = parseJsonSafe(document.querySelector("#message-content").value || "{}");
  const ctas = normalizeMessageCtas(baseContent);
  return messageExperimentVariants({
    templateType,
    placement: document.querySelector("#message-placement").value.trim(),
    raw,
    ctas,
    baseContent
  });
}

async function createMessageExperimentDraft(variantIndex) {
  try {
    const variants = currentMessageExperimentVariants();
    const control = variants.find((variant) => variant.key === "control") || variants[0];
    const treatment = variants[variantIndex];
    if (!control || !treatment || treatment.key === "control") throw new Error("Choose a non-control variant before creating an experiment draft.");
    const payload = buildMessageExperimentDraftPayload({ control, treatment });
    const body = await api("/v1/rule-sets", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    await Promise.all([loadRules(), loadExperiments()]);
    renderMessageExperimentDraftSuccess(body.rule_set);
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

async function handleMessageOutputActionClick(event) {
  const button = event.target.closest("[data-message-output-action]");
  if (!button) return;
  const decisionKey = button.dataset.decisionKey || "";
  if (!decisionKey) return;
  if (button.dataset.messageOutputAction === "open-campaigns") {
    switchView("experiments");
    await loadExperiments();
    selectedExperimentKey = decisionKey;
    activeExperimentTab = "design";
    renderExperiments();
    experimentDetail?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (button.dataset.messageOutputAction === "open-rules") {
    switchView("rules");
    await loadRule(decisionKey);
    openRuleDetail();
  }
}

function handleMessagePerformanceActionClick(event) {
  const ruleButton = event.target.closest("[data-message-performance-action='open-rule']");
  if (ruleButton?.dataset.decisionKey) {
    switchView("rules");
    loadRule(ruleButton.dataset.decisionKey).then(() => openRuleDetail());
    return;
  }
  const campaignButton = event.target.closest("[data-message-performance-action='open-campaign']");
  if (campaignButton?.dataset.campaignName) {
    selectedCampaignName = campaignButton.dataset.campaignName;
    switchView("experiments");
    renderExperiments();
    experimentDetail?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const button = event.target.closest("[data-message-performance-action='focus-field']");
  if (!button) return;
  focusMessageField(button.dataset.focusTarget || "", button.dataset.focusLabel || "");
}

function focusMessageField(selector = "", label = "") {
  const field = selector ? document.querySelector(selector) : null;
  if (!field) return;
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  field.focus?.();
  field.classList.add("field-pulse");
  window.setTimeout(() => field.classList.remove("field-pulse"), 1800);
  if (messageOutput && label) messageOutput.textContent = `Jumped to ${label} setting.`;
}

function renderMessageExperimentDraftSuccess(ruleSet = {}) {
  const decisionKey = ruleSet.decision_key || "";
  messageOutput.innerHTML = `
    <div class="message-output-success">
      <div>
        <strong>Draft experiment created</strong>
        <span>${escapeHtml(decisionKey)}</span>
      </div>
      <p>Review allocation, targeting, goal, and publish readiness before launching.</p>
      <div class="message-output-actions">
        <button type="button" data-message-output-action="open-campaigns" data-decision-key="${escapeHtml(decisionKey)}">Open in Campaigns</button>
        <button type="button" data-message-output-action="open-rules" data-decision-key="${escapeHtml(decisionKey)}">Open in Rule Sets</button>
      </div>
    </div>
  `;
  activateMessageWorkspaceTab("metadata");
  activateMessageMetaTab("output");
}

function buildMessageExperimentDraftPayload({ control, treatment }) {
  const messageId = document.querySelector("#message-id")?.value.trim() || "message";
  const messageName = document.querySelector("#message-name")?.value.trim() || messageId;
  const surface = document.querySelector("#message-surface")?.value.trim() || "";
  const placement = document.querySelector("#message-placement")?.value.trim() || "";
  const application = document.querySelector("#message-application")?.value.trim() || "";
  const campaign = document.querySelector("#message-campaign")?.value.trim() || "";
  const folder = document.querySelector("#message-folder")?.value.trim() || "";
  const decisionKey = uniqueMessageExperimentDecisionKey(`${messageId}_${treatment.key}_experiment`);
  const displayMode = normalizedExperimentDisplayMode(document.querySelector("#message-display-mode")?.value || "always");
  const triggerType = normalizedExperimentTriggerType(document.querySelector("#message-trigger-type")?.value || "page_load");
  const targetDevice = document.querySelector("#message-target-devices")?.value || "any";
  const variantOutput = (variant) => ({
    message_id: messageId,
    message_variant: variant.key,
    message_content: variant.content,
    template: variant.content.template_type || document.querySelector("#message-template-type")?.value || "banner",
    placement,
    surface,
    application
  });
  return {
    name: `${messageName} Experiment`,
    decision_key: decisionKey,
    description: `Draft in-app message experiment generated from ${messageName}. Control keeps the current content; treatment applies ${treatment.label}.`,
    type: "experiment",
    priority: 50,
    surface,
    cache_policy: { client_ttl: Number(document.querySelector("#message-frequency-ttl")?.value || 300), scope: "profile" },
    input_schema: {},
    output_schema: {
      result_type: "message_experiment",
      fields: ["message_id", "message_variant", "message_content", "template", "placement", "surface", "application"]
    },
    metadata: {
      campaign: campaign ? { name: campaign, folder } : undefined,
      folder,
      application,
      template_type: document.querySelector("#message-template-type")?.value || "",
      placement,
      source_message_id: messageId,
      experiment: {
        status: "draft",
        unit: "profile",
        mode: "fixed",
        goal: {
          type: "conversion",
          event: "message_click",
          attribution_window_hours: 24
        },
        display: {
          mode: displayMode,
          reset_on_version_change: true
        },
        targeting: {
          devices: [targetDevice].filter(Boolean),
          url_rules: []
        },
        trigger: {
          type: triggerType
        },
        variants: [
          {
            key: "control",
            label: "Control",
            weight: 50,
            baseline: true,
            outputs: variantOutput(control)
          },
          {
            key: treatment.key,
            label: treatment.label,
            weight: 50,
            hypothesis: treatment.hypothesis,
            outputs: variantOutput(treatment)
          }
        ]
      }
    },
    tags: ["message_experiment", "generated_from_message"],
    draft: {
      branches: [
        {
          id: "eligible_message_experiment",
          label: "Eligible for message experiment",
          result: "eligible",
          outputs: {
            message_id: messageId,
            placement,
            surface,
            application
          }
        }
      ],
      fallback: {
        result: "ineligible",
        outputs: {
          reason: "not_eligible_for_message_experiment"
        }
      }
    }
  };
}

function uniqueMessageExperimentDecisionKey(base) {
  const existing = new Set((cachedRuleSets || []).map((rule) => rule.decision_key));
  const cleanBase = slug(base || "message_experiment");
  if (!existing.has(cleanBase)) return cleanBase;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${cleanBase}_${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${cleanBase}_${Date.now()}`;
}

function normalizedExperimentDisplayMode(value) {
  if (["once", "once_per_session", "always"].includes(value)) return value;
  return "always";
}

function normalizedExperimentTriggerType(value) {
  if (["page_load", "dom_ready", "data_layer_event", "custom_event", "manual"].includes(value)) return value;
  return "custom_event";
}

function messageAudienceCard({ sample, templateType, placement, surface, raw }) {
  const data = sample.data || {};
  const title = renderPersonalizedText(raw.title || document.querySelector("#message-name").value.trim() || "Untitled message", data);
  const body = renderPersonalizedText(raw.body || "No message body yet.", data);
  const footer = renderPersonalizedText(raw.footer, data);
  const ctas = [
    {
      label: renderPersonalizedText(raw.primaryCtaLabel, data),
      url: renderPersonalizedText(raw.primaryCtaUrl, data),
      style: "primary"
    },
    {
      label: renderPersonalizedText(raw.secondaryCtaLabel, data),
      url: renderPersonalizedText(raw.secondaryCtaUrl, data),
      style: "secondary"
    }
  ].filter((cta) => cta.label || cta.url);
  const missing = messageTokenStatsForSample(data).missing;
  return `
    <section class="message-audience-card">
      <div class="message-audience-card-head">
        <strong>${escapeHtml(sample.label)}</strong>
        <span>${escapeHtml(sample.detail)}</span>
      </div>
      <div class="message-preview-card compact" data-template="${escapeHtml(templateType)}" data-has-cta="${ctas.length ? "true" : "false"}">
        ${messagePreviewCardInnerHtml({ templateType, placement, surface, title, body, footer, imageUrl: raw.imageUrl, ctas, content: parseJsonSafe(document.querySelector("#message-content").value || "{}") })}
      </div>
      <div class="message-audience-card-foot ${missing.length ? "warn" : "ok"}">
        ${escapeHtml(missing.length ? `Missing: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}` : "All tokens resolved")}
      </div>
    </section>
  `;
}

function messageAudienceSamples(baseSample = {}) {
  const mergedBase = mergeMessageSamples(defaultMessageTokenSample(), baseSample);
  return [
    {
      label: "Current sample",
      detail: "Custom values from the sample editor",
      data: mergedBase
    },
    {
      label: "High intent",
      detail: "Engaged visitor with strong lead signals",
      data: mergeMessageSamples(mergedBase, {
        profile_key: "high-intent-profile",
        attributes: { first_name: "Karel", lead_score: 92, web_engagement_score: 88, customer_lifetime_value: 5200 },
        segments: { high_intent: true, retention_risk: false },
        context: { channel: "web", surface: "homepage_hero", page_type: "homepage" }
      })
    },
    {
      label: "Retention risk",
      detail: "Known customer who may need save-oriented copy",
      data: mergeMessageSamples(mergedBase, {
        profile_key: "retention-profile",
        attributes: { first_name: "Alex", churn_risk_score: 81, customer_lifetime_value: 7600, lead_score: 48 },
        segments: { high_intent: false, retention_risk: true },
        context: { channel: "web", surface: "account_dashboard", page_type: "account" }
      })
    },
    {
      label: "New visitor",
      detail: "Sparse profile with mostly context data",
      data: mergeMessageSamples(mergedBase, {
        profile_key: "anonymous-web-visitor",
        attributes: { first_name: "", lead_score: 15, customer_lifetime_value: 0 },
        segments: { high_intent: false, retention_risk: false },
        context: { channel: "web", surface: "homepage", page_type: "landing" }
      })
    }
  ];
}

function mergeMessageSamples(base = {}, overrides = {}) {
  return {
    ...base,
    ...overrides,
    attributes: { ...(base.attributes || {}), ...(overrides.attributes || {}) },
    segments: { ...(base.segments || {}), ...(overrides.segments || {}) },
    context: { ...(base.context || {}), ...(overrides.context || {}) },
    identifiers: { ...(base.identifiers || {}), ...(overrides.identifiers || {}) }
  };
}

function messagePreviewCardInnerHtml({ templateType = "banner", placement = "", surface = "", title = "Untitled message", body = "No message body yet.", footer = "", imageUrl = "", ctas = [], content = {} } = {}) {
  const imageStyle = safeBackgroundImageStyle(imageUrl);
  const normalizedTemplate = messageTemplateType(templateType);
  return `
    ${imageStyle ? `<div class="message-preview-image"${imageStyle}></div>` : ""}
    <div class="message-preview-body">
      <span>${escapeHtml([normalizedTemplate, placement || surface].filter(Boolean).join(" · "))}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
      ${messagePreviewTemplateExtra(normalizedTemplate, content)}
      ${ctas.length ? `<div class="message-preview-actions">${ctas.map((cta) => `<a class="${cta.style === "secondary" ? "secondary" : "primary"}" href="${escapeHtml(cta.url || "#")}" target="_blank" rel="noopener">${escapeHtml(cta.label || cta.url)}</a>`).join("")}</div>` : ""}
      ${footer ? `<small>${escapeHtml(footer)}</small>` : ""}
    </div>
  `;
}

function messagePreviewTemplateExtra(templateType, content = {}) {
  const items = Array.isArray(content.items) ? content.items : Array.isArray(content.products) ? content.products : Array.isArray(content.recommendations) ? content.recommendations : [];
  if (templateType === "carousel" || templateType === "recommendation") {
    const previewItems = items.length ? items.slice(0, 4) : [
      { title: "Item A", body: "Personalized option" },
      { title: "Item B", body: "Alternative offer" }
    ];
    return `
      <div class="message-preview-items" data-kind="${escapeHtml(templateType)}">
        ${previewItems.map((item) => `
          <div>
            <b>${escapeHtml(item.title || item.name || item.id || "Item")}</b>
            <em>${escapeHtml(item.body || item.description || item.price || item.category || "")}</em>
          </div>
        `).join("")}
      </div>
    `;
  }
  if (templateType === "survey") {
    const questions = surveyQuestionsForPreview(content).slice(0, 3);
    return `
      <div class="message-preview-survey">
        ${questions.map((question) => `
          <div>
            <b>${escapeHtml(question.label || question.title || "Question")}</b>
            <span>${(Array.isArray(question.options) && question.options.length ? question.options : ["Text response"]).slice(0, 4).map((option) => `<em>${escapeHtml(surveyOptionLabel(option))}</em>`).join("")}</span>
          </div>
        `).join("")}
      </div>
    `;
  }
  if (templateType === "html_fragment") {
    const htmlText = htmlTextPreview(content.html || content.fragment || content.markup || "");
    return `
      <div class="message-preview-fragment">
        <b>Guarded HTML fragment</b>
        <em>${escapeHtml(htmlText || "Advanced sanitized HTML will render in the SDK.")}</em>
      </div>
    `;
  }
  return "";
}

function surveyQuestionsForPreview(content = {}) {
  const survey = content.survey && typeof content.survey === "object" ? content.survey : {};
  if (Array.isArray(content.questions) && content.questions.length) return content.questions;
  if (Array.isArray(survey.questions) && survey.questions.length) return survey.questions;
  if (content.question || survey.question) return [{ label: content.question || survey.question, options: content.options || survey.options || [] }];
  return [{ label: "How relevant is this offer?", options: ["Low", "Medium", "High"] }];
}

function surveyOptionLabel(option) {
  const optionObject = option && typeof option === "object" ? option : {};
  return optionObject.label || optionObject.title || optionObject.value || String(option);
}

function htmlTextPreview(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function renderMessageImageGuidance(templateType) {
  const target = document.querySelector("#message-image-guidance");
  if (!target) return;
  const guidance = {
    banner: "Recommended 1200 x 420 px, wide landscape.",
    modal: "Recommended 800 x 600 px, centered subject.",
    alert: "Optional small image, 600 x 240 px.",
    inline: "Recommended 1000 x 560 px for in-page placements.",
    toast: "Avoid large images; icon-sized assets work best.",
    card: "Recommended 800 x 520 px with concise copy.",
    carousel: "Use Content JSON items for each slide; keep titles short.",
    survey: "Use Content JSON questions with options for quick feedback.",
    recommendation: "Use Content JSON items or products for personalized lists.",
    html_fragment: "Advanced template: SDK sanitizes HTML and blocks unsafe tags."
  };
  target.textContent = guidance[templateType] || "Recommended size depends on template.";
}

function handleMessageImageDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("dragging");
  const file = event.dataTransfer?.files?.[0];
  if (file) loadMessageImageFile(file);
}

function handleMessageImageFile(event) {
  const file = event.target.files?.[0];
  if (file) loadMessageImageFile(file);
  event.target.value = "";
}

async function loadMessageImageFile(file) {
  if (!file.type.startsWith("image/")) {
    messageOutput.textContent = "Choose an image file.";
    return;
  }
  messageOutput.textContent = `Uploading image: ${file.name}`;
  try {
    const dataUrl = await readFileAsDataUrl(file);
    const body = await api("/v1/message-assets", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type,
        data_url: dataUrl,
        metadata: {
          source: "message_editor_upload",
          message_id: selectedMessageId || document.querySelector("#message-id").value.trim() || ""
        }
      })
    });
    cachedMessageAssets = [body.asset, ...cachedMessageAssets.filter((asset) => asset.id !== body.asset.id)];
    document.querySelector("#message-preview-image").value = body.asset.content_url;
    syncMessageJsonFromPreviewLive();
    renderMessageAssetList();
    messageOutput.textContent = `Uploaded image asset: ${file.name}`;
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function cleanupMessageAssets() {
  try {
    const result = await api("/v1/message-assets/cleanup", { method: "POST", body: "{}" });
    const body = await api("/v1/message-assets");
    cachedMessageAssets = body.assets || [];
    renderMessageAssetList();
    messageOutput.textContent = `Cleaned ${result.deleted || 0} unused asset${result.deleted === 1 ? "" : "s"}.`;
  } catch (error) {
    messageOutput.textContent = error.message;
  }
}

function messagePreviewChecks({ status, startsAt, expiresAt, ttl, templateType, placement, surface, title, body, footer, imageUrl, ctas, displayMode, triggerType, maxImpressions, targetDevices, application, previewDevice, consentCategory, dismissBehavior, tokens }) {
  const checks = [];
  const content = parseJsonSafe(document.querySelector("#message-content")?.value || "{}");
  const items = Array.isArray(content.items) ? content.items : Array.isArray(content.products) ? content.products : Array.isArray(content.recommendations) ? content.recommendations : [];
  const survey = content.survey && typeof content.survey === "object" ? content.survey : {};
  const questions = Array.isArray(content.questions) && content.questions.length
    ? content.questions
    : Array.isArray(survey.questions) ? survey.questions : [];
  const runtime = messageRuntimeProfile({ templateType, placement, surface, application, targetDevices, triggerType, previewDevice, content });
  const now = Date.now();
  const starts = startsAt ? new Date(startsAt).getTime() : 0;
  const expires = expiresAt ? new Date(expiresAt).getTime() : 0;
  if (status === "archived") checks.push({ level: "warn", title: "Archived", detail: "Archived messages can still be referenced, but should not be used for new live experiences." });
  if (starts && starts > now) checks.push({ level: "info", title: "Scheduled", detail: `Starts ${formatTime(new Date(starts).toISOString())}.` });
  if (expires && expires < now) checks.push({ level: "error", title: "Expired", detail: `Expired ${formatTime(new Date(expires).toISOString())}.` });
  if (starts && expires && expires <= starts) checks.push({ level: "error", title: "Invalid window", detail: "Expires at must be later than starts at." });
  if (!title) checks.push({ level: "warn", title: "Missing title", detail: "Add a clear headline before launch." });
  if (!body) checks.push({ level: "warn", title: "Missing body", detail: "Add supporting copy so the offer is understandable." });
  if (!ctas.length) checks.push({ level: "warn", title: "No CTA", detail: "Most message templates should include at least one action." });
  ctas.forEach((cta, index) => {
    if (cta.label && !cta.url) checks.push({ level: "warn", title: `${index === 0 ? "Primary" : "Secondary"} CTA URL missing`, detail: "Add a URL or remove the CTA label." });
    if (!cta.label && cta.url) checks.push({ level: "warn", title: `${index === 0 ? "Primary" : "Secondary"} CTA label missing`, detail: "Add a short CTA label." });
  });
  if (ttl <= 0 && !["always", "once"].includes(displayMode)) checks.push({ level: "warn", title: "Cooldown missing", detail: `${messageDeliveryLabel(displayMode)} should usually have a cooldown or max-impression cap.` });
  if (ttl <= 0) checks.push({ level: "info", title: "No cooldown TTL", detail: "Clients will not receive a message-specific cooldown hint." });
  if (maxImpressions <= 0 && ["modal", "toast"].includes(templateType)) checks.push({ level: "warn", title: "No impression cap", detail: "Interruptive formats should usually define a maximum impression count." });
  if (triggerType === "manual" && !placement) checks.push({ level: "info", title: "Manual trigger", detail: "Make sure the app calls the SDK manually for this placement." });
  if (triggerType !== "page_load" && triggerType !== "manual") checks.push({ level: "info", title: "Custom trigger", detail: `${messageDeliveryLabel(triggerType)} requires client SDK trigger wiring.` });
  if (!consentCategory) checks.push({ level: "info", title: "No consent category", detail: "Add one when this message is marketing or personalization-related." });
  if (targetDevices !== "any" && !placement) checks.push({ level: "info", title: "Device-specific delivery", detail: "Pair device targeting with a clear placement contract." });
  if (dismissBehavior === "ignore" && ["modal", "toast"].includes(templateType)) checks.push({ level: "warn", title: "Dismiss ignored", detail: "Ignoring dismissals on interruptive formats can feel repetitive." });
  if (["modal", "toast"].includes(templateType) && body.length > 220) checks.push({ level: "warn", title: "Long compact copy", detail: "This may feel crowded in modal or toast placements." });
  if (body.length > 320 || footer.length > 180 || title.length > 70) checks.push({ level: "warn", title: "Mobile clipping risk", detail: "Preview on mobile and shorten content if it pushes below the fold." });
  if (templateType === "banner" && !imageUrl) checks.push({ level: "info", title: "No image", detail: "Banners can work without media, but a visual may improve recognition." });
  if (["carousel", "recommendation"].includes(templateType) && !items.length) checks.push({ level: "warn", title: "No items configured", detail: "Add items, products, or recommendations in Content JSON for this template." });
  if (templateType === "survey" && !questions.length && !content.question && !survey.question) checks.push({ level: "warn", title: "No survey question", detail: "Add questions in the Survey Builder before launching this message." });
  if (templateType === "survey" && questions.some((question) => surveyQuestionType(question.type || "choice") !== "text" && !(Array.isArray(question.options) && question.options.length))) {
    checks.push({ level: "warn", title: "Survey option missing", detail: "Choice and rating questions need at least one answer option." });
  }
  if (templateType === "survey" && questions.length) {
    const questionIds = new Set(questions.map((question) => question.id || question.tracking_name || question.trackingName || "").filter(Boolean));
    const invalidBranch = questions.find((question) => {
      const showIf = normalizeSurveyShowIf(question.show_if || question.showIf);
      return showIf && !questionIds.has(showIf.question);
    });
    if (invalidBranch) checks.push({ level: "warn", title: "Survey branch target missing", detail: `${invalidBranch.label || invalidBranch.id || "A follow-up question"} depends on a question ID that does not exist.` });
  }
  if (templateType === "html_fragment") {
    const html = String(content.html || content.fragment || content.markup || "");
    if (!html) checks.push({ level: "warn", title: "No HTML fragment", detail: "Add html, fragment, or markup in Content JSON." });
    if (/<script|<iframe|<form|\son/i.test(html)) checks.push({ level: "warn", title: "HTML will be sanitized", detail: "The SDK removes scripts, iframes, forms, and inline event handlers." });
  }
  if (runtime.platform === "mobile" && !application) {
    checks.push({ level: "warn", title: "Application missing", detail: "Native app delivery should usually be scoped to a named application." });
  }
  if (runtime.platform === "mobile" && runtime.htmlFragment) {
    checks.push({ level: "warn", title: "HTML fragment for mobile", detail: "Prefer structured templates over raw HTML for native mobile delivery." });
  }
  if (runtime.platform === "mobile" && targetDevices === "desktop") {
    checks.push({ level: "warn", title: "Platform/device mismatch", detail: "This looks mobile-scoped but the target device is desktop only." });
  }
  if (runtime.platform === "mobile" && previewDevice === "desktop") {
    checks.push({ level: "info", title: "Preview on mobile", detail: "Switch the preview frame to tablet or mobile before final review." });
  }
  if (runtime.platform === "mobile" && templateType === "survey" && questions.length > 3) {
    checks.push({ level: "warn", title: "Survey length", detail: "Keep in-app surveys short on mobile to avoid drop-off." });
  }
  if (!placement || surface === "-") checks.push({ level: "info", title: "Placement not fully defined", detail: "Surface and placement help client apps render this consistently." });
  if (tokens?.missing?.length) checks.push({ level: "warn", title: "Token sample missing", detail: `No sample value for ${tokens.missing.slice(0, 3).join(", ")}${tokens.missing.length > 3 ? "..." : ""}.` });
  if (tokens?.tokens?.length) checks.push({ level: "info", title: "Personalized content", detail: `${tokens.tokens.length} token${tokens.tokens.length === 1 ? "" : "s"} used in this message.` });
  const level = checks.some((item) => item.level === "error") ? "error" : checks.some((item) => item.level === "warn") ? "warn" : "ok";
  return {
    level,
    checks: checks.length ? checks : [{ level: "ok", title: "Ready for preview", detail: "No obvious content or delivery issues detected." }]
  };
}

function renderMessagePreviewHealth(health) {
  if (!messagePreviewHealth) return;
  messagePreviewHealth.innerHTML = `
    <div class="message-preview-health-head ${escapeHtml(health.level)}">
      <strong>${escapeHtml(messagePreviewHealthLabel(health))}</strong>
      <span>${escapeHtml(`${health.checks.length} check${health.checks.length === 1 ? "" : "s"}`)}</span>
    </div>
    <div class="message-preview-health-list">
      ${health.checks.map((item) => `
        <div class="message-preview-check ${escapeHtml(item.level)}">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.detail)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMessageReadiness(context, health) {
  if (!messageReadinessPanel) return;
  const report = messageReadinessReport(context, health);
  messageReadinessPanel.innerHTML = `
    <div class="message-readiness-head ${escapeHtml(report.level)}">
      <div>
        <strong>Launch Readiness</strong>
        <span>${escapeHtml(report.summary)}</span>
      </div>
      <span>${escapeHtml(messageReadinessLabel(report.level))}</span>
    </div>
    <div class="message-readiness-metrics">
      ${messageReadinessMetric("Rules", report.ruleLinks.length ? formatNumber(report.ruleLinks.length) : "0")}
      ${messageReadinessMetric("Campaign", report.campaignLabel || "Unassigned")}
      ${messageReadinessMetric("Platform", messageDeliveryLabel(report.runtime.platform || "web"))}
      ${messageReadinessMetric("Conflicts", report.conflicts.length ? formatNumber(report.conflicts.length) : "0")}
    </div>
    <div class="message-readiness-list">
      ${report.items.map(messageReadinessItemRow).join("")}
    </div>
  `;
}

function messageReadinessReport(context, health) {
  const ruleLinks = messageBacklinks(context.id);
  const conflicts = messagePlacementConflicts(context);
  const campaignLabel = [context.campaign, context.folder].filter(Boolean).join(" / ");
  const items = [
    ...messageHealthReadinessItems(health),
    ...messageRuleReadinessItems(context, ruleLinks),
    ...messageConflictReadinessItems(conflicts),
    ...messagePolicyReadinessItems(context)
  ];
  if (!items.length) {
    items.push({ level: "ok", title: "Ready to launch", detail: "Content, placement, rules, campaign, and delivery policy look aligned." });
  }
  const level = items.some((item) => item.level === "error") ? "error" : items.some((item) => item.level === "warn") ? "warn" : "ok";
  return {
    level,
    ruleLinks,
    conflicts,
    runtime: context.runtime || {},
    campaignLabel,
    items: items.slice(0, 8),
    summary: messageReadinessSummary({ level, items, ruleLinks, conflicts, campaignLabel })
  };
}

function messageHealthReadinessItems(health) {
  return (health?.checks || [])
    .filter((item) => item.level === "error" || item.level === "warn")
    .map((item) => ({
      level: item.level,
      title: item.title,
      detail: item.detail
    }));
}

function messageRuleReadinessItems(context, ruleLinks = []) {
  const items = [];
  if (!context.id) return [{ level: "warn", title: "Message ID missing", detail: "Save with a stable ID before linking this message to rules." }];
  if (!ruleLinks.length) {
    items.push({ level: "warn", title: "Not linked to a rule", detail: "No draft or published rule branch currently returns this message_id." });
  }
  const surfaceMismatches = ruleLinks.filter((link) => {
    const rule = cachedRuleSets.find((candidate) => candidate.decision_key === link.rule_key);
    return rule?.surface && context.surface && !messageSurfaceAligned(context.surface, rule.surface);
  });
  if (surfaceMismatches.length) {
    items.push({
      level: "error",
      title: "Rule surface mismatch",
      detail: `${surfaceMismatches.length} linked branch${surfaceMismatches.length === 1 ? "" : "es"} use a different surface.`
    });
  }
  const campaignMismatches = ruleLinks.filter((link) => {
    const rule = cachedRuleSets.find((candidate) => candidate.decision_key === link.rule_key);
    const ruleCampaign = campaignValue(rule?.metadata || {});
    return context.campaign && ruleCampaign && ruleCampaign !== context.campaign;
  });
  if (campaignMismatches.length) {
    items.push({
      level: "warn",
      title: "Campaign differs from rule",
      detail: `${campaignMismatches.length} linked branch${campaignMismatches.length === 1 ? "" : "es"} belong to another campaign.`
    });
  }
  return items;
}

function messageConflictReadinessItems(conflicts = []) {
  return conflicts.map((conflict) => ({
    level: conflict.level,
    title: conflict.title,
    detail: conflict.detail
  }));
}

function messagePolicyReadinessItems(context) {
  const items = [];
  const runtime = context.runtime || {};
  if (context.status !== "active") items.push({ level: "warn", title: "Not active", detail: "Only active messages should be used for live delivery." });
  if (["modal", "toast", "alert"].includes(context.templateType) && context.displayMode === "always" && !context.maxImpressions && !context.ttl) {
    items.push({ level: "warn", title: "Interruptive policy", detail: "Add a cap or cooldown before running this on high-traffic pages." });
  }
  if (context.targetDevices !== "any" && !context.placement) {
    items.push({ level: "warn", title: "Device targeting needs placement", detail: "Specify the placement where this device-specific message can render." });
  }
  if (runtime.platform === "mobile" && !context.application) {
    items.push({ level: "warn", title: "Application not specified", detail: "Add an application so native app teams can map this message to one runtime and deployment channel." });
  }
  if (runtime.platform === "mobile" && runtime.htmlFragment) {
    items.push({ level: "warn", title: "Native renderer mismatch", detail: "HTML fragments are better suited to web or webview placements than native in-app containers." });
  }
  return items;
}

function messagePlacementConflicts(context) {
  const currentId = context.id;
  const placement = String(context.placement || "").trim();
  const surface = String(context.surface || "").trim();
  const templateType = messageTemplateType(context.templateType);
  const interruptive = ["modal", "toast", "alert"].includes(templateType);
  if (!currentId || !surface || !placement || !interruptive) return [];
  const peers = cachedMessages.filter((message) => {
    if (message.id === currentId || (message.status || "active") !== "active") return false;
    const content = message.default_content || {};
    const peerTemplate = messageTemplateType(content.template_type || message.metadata?.template_type || "banner");
    if (!["modal", "toast", "alert"].includes(peerTemplate)) return false;
    const peerPlacement = String(content.placement || message.metadata?.placement || "").trim();
    return messageSurfaceAligned(surface, message.surface) && peerPlacement === placement;
  });
  if (!peers.length) return [];
  return [{
    level: "warn",
    title: "Competing interruptive messages",
    detail: `${peers.length} active modal/toast/alert message${peers.length === 1 ? "" : "s"} share ${placement}.`
  }];
}

function messageSurfaceAligned(left, right) {
  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/[.\s-]+/g, "_");
  const a = normalize(left);
  const b = normalize(right);
  return !a || !b || a === b || a.includes(b) || b.includes(a);
}

function messageReadinessSummary({ level, items, ruleLinks, conflicts, campaignLabel }) {
  if (level === "error") return `${items.filter((item) => item.level === "error").length} blocker${items.filter((item) => item.level === "error").length === 1 ? "" : "s"} before launch.`;
  if (level === "warn") return `${items.filter((item) => item.level === "warn").length} review item${items.filter((item) => item.level === "warn").length === 1 ? "" : "s"} before publish.`;
  return `${ruleLinks.length || 0} linked rule${ruleLinks.length === 1 ? "" : "s"} · ${conflicts.length || 0} conflicts · ${campaignLabel || "no campaign"}.`;
}

function messageReadinessLabel(level) {
  if (level === "error") return "Blocked";
  if (level === "warn") return "Review";
  return "Ready";
}

function messageReadinessMetric(label, value) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function messageReadinessItemRow(item) {
  return `
    <div class="message-readiness-item ${escapeHtml(item.level)}">
      <span>${escapeHtml(messageReadinessLabel(item.level))}</span>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <em>${escapeHtml(item.detail)}</em>
      </div>
    </div>
  `;
}

function messagePreviewHealthLabel(health) {
  if (health.level === "error") return "Needs fixes";
  if (health.level === "warn") return "Review recommended";
  return "Looks ready";
}

function normalizeMessageCtas(content) {
  if (Array.isArray(content.ctas)) {
    return content.ctas
      .filter((cta) => cta && (cta.label || cta.url))
      .map((cta, index) => ({
        label: String(cta.label || ""),
        url: String(cta.url || cta.href || ""),
        style: cta.style || (index === 0 ? "primary" : "secondary")
      }));
  }
  return [
    {
      label: String(content.cta_label || ""),
      url: String(content.cta_url || content.cta_href || ""),
      style: "primary"
    }
  ].filter((cta) => cta.label || cta.url);
}

function messageTemplateType(value) {
  return ["banner", "alert", "modal", "inline", "toast", "card", "carousel", "survey", "recommendation", "html_fragment"].includes(value) ? value : "banner";
}

function renderMessageRuleLinks() {
  if (!messageRuleLinks) return;
  const id = document.querySelector("#message-id")?.value.trim();
  if (!id) {
    messageRuleLinks.innerHTML = "";
    return;
  }
  const links = messageBacklinks(id);
  messageRuleLinks.innerHTML = `
    <div class="message-rule-links-head">
      <div>
        <strong>Used By Rules</strong>
        <span>${escapeHtml(links.length ? `${links.length} linked branch${links.length === 1 ? "" : "es"}` : "No rule branches return this message yet.")}</span>
      </div>
    </div>
    <div class="message-rule-link-list">
      ${links.length ? links.map(messageRuleLinkRow).join("") : `<div class="grid-empty">Add this message as a branch output with field <strong>message_id</strong>.</div>`}
    </div>
  `;
  messageRuleLinks.querySelectorAll("[data-message-rule-key]").forEach((button) => {
    button.addEventListener("click", () => {
      loadRule(button.dataset.messageRuleKey);
    });
  });
}

function messageBacklinks(messageId) {
  return cachedRuleSets.flatMap((rule) => {
    const links = [];
    const definitions = [
      { label: "draft", definition: rule.draft || rule.definition || rule.current_draft },
      { label: "published", definition: rule.published || rule.published_definition || rule.version?.definition || rule.active_version?.definition }
    ].filter((item, index, items) => item.definition && items.findIndex((candidate) => candidate.definition === item.definition) === index);
    for (const item of definitions) {
      collectMessageBacklinks(item.definition, messageId, {
        rule_key: rule.decision_key,
        rule_name: rule.name,
        rule_type: rule.type || "decision",
        rule_status: rule.status || "draft",
        definition: item.label
      }, links);
    }
    return links;
  });
}

function collectMessageBacklinks(definition, messageId, base, links) {
  if (!definition || typeof definition !== "object") return;
  for (const [index, branch] of (definition.branches || []).entries()) {
    collectMessageOutput(branch.outputs, messageId, {
      ...base,
      branch_id: branch.id || branch.label || `branch_${index + 1}`,
      result: branch.result || "eligible"
    }, links);
  }
  for (const node of definition.graph?.nodes || definition.nodes || []) {
    collectMessageOutput(node.outputs || node.output, messageId, {
      ...base,
      branch_id: node.id || node.type || "graph_node",
      result: node.result || node.type || "graph"
    }, links);
    if (node.message_id === messageId) {
      links.push({
        ...base,
        branch_id: node.id || node.type || "graph_node",
        result: node.type || "graph",
        output_field: "message_id"
      });
    }
  }
}

function collectMessageOutput(outputs, messageId, base, links) {
  if (!outputs || typeof outputs !== "object") return;
  for (const [field, value] of Object.entries(outputs)) {
    if (field === "message_id" && value === messageId) {
      links.push({ ...base, output_field: field });
    }
  }
}

function messageRuleLinkRow(link) {
  return `
    <button type="button" class="message-rule-link-row" data-message-rule-key="${escapeHtml(link.rule_key)}">
      <span>${escapeHtml(link.rule_type)}</span>
      <strong>${escapeHtml(link.rule_name || link.rule_key)}</strong>
      <small>${escapeHtml(`${link.definition} · ${link.branch_id} · ${link.result} · ${link.rule_status}`)}</small>
    </button>
  `;
}

async function loadLookupVersions(id) {
  lookupVersionList.innerHTML = header(["Version", "Updated", "Author", "Rows", "Action"]);
  if (!id) {
    lookupVersionList.innerHTML += row(["-", "-", "-", "-", "-"]);
    return;
  }
  try {
    const body = await api(`/v1/lookup-tables/${encodeURIComponent(id)}/versions`);
    if (!body.versions.length) {
      lookupVersionList.innerHTML += row(["No versions", "", "", "", ""]);
      return;
    }
    lookupVersionList.innerHTML += body.versions
      .map((item) =>
        row(
          [
            item.version,
            formatTime(item.updated_at),
            item.author,
            item.row_count,
            `<button type="button" data-lookup-version="${item.version}">Load</button>`
          ],
          { rawColumns: [4] }
        )
      )
      .join("");
    lookupVersionList.querySelectorAll("[data-lookup-version]").forEach((button) => {
      button.addEventListener("click", () => loadLookupVersion(id, button.dataset.lookupVersion));
    });
  } catch (error) {
    lookupVersionList.innerHTML += row([error.message, "", "", "", ""]);
  }
}

async function runEvaluate() {
  try {
    const request = readEvaluateInput();
    const validation = renderEvaluateValidation(request);
    if (validation.errors.length) throw new Error(`Fix request setup first: ${validation.errors.join("; ")}`);
    const requestKind = currentEvaluateRequestKind();
    const mode = requestKind === "surface" ? "surface" : document.querySelector("#eval-mode").value;
    const path = requestKind === "surface"
      ? "/v1/client/surface"
      : mode === "draft"
        ? `/v1/rule-sets/${encodeURIComponent(request.decision_key)}/test`
        : "/v1/evaluate";
    const body = await api(path, {
      method: "POST",
      body: JSON.stringify(request)
    });
    renderEvaluationSummary(body, mode);
    renderEvaluationOutputSummary(body);
    renderEvaluationTrace(body);
    evalOutput.textContent = formatDecisionOutput(body);
    loadAudit();
    loadMetrics();
  } catch (error) {
    renderEvaluationSummary(null, document.querySelector("#eval-mode").value, error);
    renderEvaluationOutputSummary(null, error);
    evalTrace.innerHTML = "";
    evalOutput.textContent = error.message;
  }
}

async function compareEvaluateVersions() {
  try {
    if (isSurfaceEvaluateMode()) throw new Error("Compare draft is only available for single decision rule evaluation.");
    const request = readEvaluateInput();
    const validation = renderEvaluateValidation(request);
    if (validation.errors.length) throw new Error(`Fix request setup first: ${validation.errors.join("; ")}`);
    const [published, draft] = await Promise.allSettled([
      api(`/v1/rule-sets/${encodeURIComponent(request.decision_key)}/test-published`, {
        method: "POST",
        body: JSON.stringify(request)
      }),
      api(`/v1/rule-sets/${encodeURIComponent(request.decision_key)}/test`, {
        method: "POST",
        body: JSON.stringify(request)
      })
    ]);
    const body = {
      decision_key: request.decision_key,
      profile_key: request.profile_key,
      compare: {
        published: published.status === "fulfilled" ? published.value : { error: published.reason.message },
        draft: draft.status === "fulfilled" ? draft.value : { error: draft.reason.message }
      }
    };
    renderEvaluationCompare(body);
    evalOutput.textContent = JSON.stringify(body, null, 2);
    loadAudit();
    loadMetrics();
  } catch (error) {
    renderEvaluationSummary(null, "compare", error);
    renderEvaluationOutputSummary(null, error);
    evalTrace.innerHTML = "";
    evalOutput.textContent = error.message;
  }
}

function renderEvaluationCompare(body) {
  const published = body.compare?.published || {};
  const draft = body.compare?.draft || {};
  const changed = compareDecisionResults(published, draft);
  evalSummary.innerHTML = [
    statusItem("Status", changed.length ? "Changed" : "Same"),
    statusItem("Mode", "Published vs draft"),
    statusItem("Published", published.error || published.result || "-"),
    statusItem("Draft", draft.error || draft.result || "-")
  ].join("");
  evalOutputSummary.innerHTML = `
    <div class="compare-grid">
      ${compareDecisionCard("Published", published)}
      ${compareDecisionCard("Draft", draft)}
    </div>
    <div class="compare-diff-card ${changed.length ? "warning" : ""}">
      <span>Differences</span>
      <strong>${escapeHtml(changed.length ? changed.join(", ") : "No functional difference detected")}</strong>
    </div>
  `;
  evalTrace.innerHTML = `
    <div class="trace-card">
      <div class="trace-card-header">
        <strong>Decision Path Compare</strong>
        <span class="trace-badge">${escapeHtml(changed.length ? `${changed.length} changes` : "same")}</span>
      </div>
      <div class="compare-trace-grid">
        <div>${traceCompareColumn("Published", published.trace)}</div>
        <div>${traceCompareColumn("Draft", draft.trace)}</div>
      </div>
    </div>
  `;
}

function compareDecisionCard(label, result) {
  if (result.error) {
    return `
      <div class="eval-output-card warning">
        <span>${escapeHtml(label)}</span>
        <strong>Error</strong>
        <small>${escapeHtml(result.error)}</small>
      </div>
    `;
  }
  return `
    <div class="eval-output-card ${label === "Draft" ? "primary" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(result.result || "-")}</strong>
      <small>${escapeHtml(result.matched_rules?.join(", ") || "fallback")}</small>
    </div>
  `;
}

function compareDecisionResults(left, right) {
  const changes = [];
  if (left.error || right.error) {
    if (left.error !== right.error) changes.push("availability");
    return changes;
  }
  if (left.result !== right.result) changes.push("result");
  if (JSON.stringify(left.outputs || {}) !== JSON.stringify(right.outputs || {})) changes.push("outputs");
  if (JSON.stringify(left.matched_rules || []) !== JSON.stringify(right.matched_rules || [])) changes.push("matched rules");
  if (JSON.stringify(left.errors || []) !== JSON.stringify(right.errors || [])) changes.push("errors");
  return changes;
}

function traceCompareColumn(label, trace = []) {
  const items = Array.isArray(trace) && trace.length ? trace : [{ type: "empty", message: "No trace returned" }];
  return `
    <div class="trace-compare-column">
      <strong>${escapeHtml(label)}</strong>
      <div class="trace-path compact">
        ${items.map(traceStepHtml).join("")}
      </div>
    </div>
  `;
}

function readEditorPayload() {
  const type = document.querySelector("#rule-type").value;
  const metadata = {
    ...(selectedRuleMetadata || {}),
    campaign: campaignMetadata(
      document.querySelector("#rule-campaign")?.value.trim(),
      document.querySelector("#rule-folder")?.value.trim()
    )
  };
  if (!metadata.campaign.name && !metadata.campaign.folder) delete metadata.campaign;
  const payload = {
    name: document.querySelector("#rule-name").value.trim(),
    decision_key: document.querySelector("#rule-key").value.trim(),
    description: document.querySelector("#rule-description").value.trim(),
    type,
    priority: Number(document.querySelector("#rule-priority").value || 0),
    surface: document.querySelector("#rule-surface").value.trim(),
    cache_policy: readCachePolicy(),
    metadata,
    draft: JSON.parse(document.querySelector("#rule-draft").value),
    tags: []
  };
  if (type === "experiment") payload.metadata.experiment = readExperimentMetadata();
  return payload;
}

function readCachePolicy() {
  const ttl = Number(document.querySelector("#rule-client-ttl").value || 0);
  const scope = document.querySelector("#rule-cache-scope").value;
  const failureMode = document.querySelector("#rule-dependency-failure-mode")?.value || "evaluate";
  const failureOutputsRaw = document.querySelector("#rule-dependency-failure-outputs")?.value.trim() || "";
  const policy = {};
  if (ttl > 0) policy.client_ttl = ttl;
  if (scope !== "none") policy.scope = scope;
  if (failureMode !== "evaluate") policy.dependency_failure_mode = failureMode;
  if (failureOutputsRaw) {
    try {
      policy.dependency_failure_outputs = JSON.parse(failureOutputsRaw);
    } catch {
      throw new Error("Dependency failure outputs must be valid JSON.");
    }
  }
  return policy;
}

function campaignMetadata(name = "", folder = "") {
  return {
    name: name || "",
    folder: folder || ""
  };
}

function campaignValue(metadata = {}) {
  if (typeof metadata?.campaign === "string") return metadata.campaign;
  return metadata?.campaign?.name || "";
}

function folderValue(metadata = {}) {
  return metadata?.campaign?.folder || metadata?.folder || "";
}

function campaignLabelForMetadata(metadata = {}) {
  return [campaignValue(metadata), folderValue(metadata)].filter(Boolean).join(" / ") || "Unassigned";
}

function applicationValue(metadata = {}) {
  if (typeof metadata?.application === "string") return metadata.application;
  return metadata?.application?.name || metadata?.app_id || metadata?.application_id || "";
}

function applicationSearchText(metadata = {}) {
  return [
    applicationValue(metadata),
    metadata?.application?.id,
    metadata?.application_id,
    metadata?.app_id
  ].filter(Boolean).join(" ").toLowerCase();
}

function campaignSearchText(metadata = {}) {
  return [
    campaignValue(metadata),
    folderValue(metadata),
    metadata?.campaign_id,
    metadata?.campaign?.id
  ].filter(Boolean).join(" ").toLowerCase();
}

function ruleMetadataForDecision(decisionKey) {
  return cachedRuleSets.find((item) => item.decision_key === decisionKey || item.key === decisionKey)?.metadata || {};
}

function campaignForDecisionKey(decisionKey) {
  const metadata = ruleMetadataForDecision(decisionKey);
  return [campaignValue(metadata), folderValue(metadata)].filter(Boolean).join(" / ");
}

function matchesDecisionCampaign(decisionKey, campaign) {
  if (!campaign) return true;
  return campaignSearchText(ruleMetadataForDecision(decisionKey)).includes(campaign);
}

function parseLiteral(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value !== "" && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

function newBranch(index) {
  return {
    id: `branch_${index}`,
    result: "eligible",
    outputs: JSON.stringify(defaultBranchOutputs()),
    logic: "all",
    conditions: [
      {
        source: "attribute",
        key: "lifetime_revenue",
        operator: "greater_than_or_equal",
        value: "5000"
      }
    ]
  };
}

function defaultBranchOutputs() {
  if (document.querySelector("#rule-type")?.value === "inapp_message") {
    const message = cachedMessages.find((item) => item.status !== "archived") || cachedMessages[0];
    return message ? { message_id: message.id } : {};
  }
  return {};
}

function renderBranchEditor() {
  branchEditor.innerHTML = "";
  builderBranches.forEach((branch, branchIndex) => {
    const node = document.querySelector("#branch-template").content.firstElementChild.cloneNode(true);
    node.dataset.branchIndex = String(branchIndex);
    bindBranchField(node, branchIndex, "id");
    bindBranchField(node, branchIndex, "result");
    bindBranchField(node, branchIndex, "outputs");
    bindBranchField(node, branchIndex, "logic");
    bindBranchSummary(node, branchIndex);
    bindOutputFieldEditor(node, branchIndex);
    bindLookupOutputHelper(node, branchIndex);
    bindTtlOutputHelper(node, branchIndex);
    bindConditionBlockHelper(node, branchIndex);
    node.querySelector("[data-action='remove-branch']").addEventListener("click", () => {
      builderBranches.splice(branchIndex, 1);
      renderBranchEditor();
      syncJsonFromBuilder();
    });
    node.querySelector("[data-action='add-condition']").addEventListener("click", () => {
      builderBranches[branchIndex].conditions.push({
        source: "attribute",
        key: "",
        operator: "equals",
        value: "",
        compare_mode: "value",
        value_source_source: "attribute",
        value_source_key: ""
      });
      renderBranchEditor();
      syncJsonFromBuilder();
    });
    node.querySelector("[data-action='add-output']").addEventListener("click", () => {
      const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
      outputs[uniqueOutputFieldName(Object.keys(outputs), "new_field")] = "";
      builderBranches[branchIndex].outputs = JSON.stringify(outputs);
      renderBranchEditor();
      syncJsonFromBuilder();
    });
    node.querySelector("[data-action='apply-condition-block']").addEventListener("click", () => {
      applyConditionBlock(node, branchIndex);
    });

    const conditions = node.querySelector("[data-role='conditions']");
    branch.conditions.forEach((condition, conditionIndex) => {
      const conditionNode = document.querySelector("#condition-template").content.firstElementChild.cloneNode(true);
      bindConditionField(conditionNode, branchIndex, conditionIndex, "source");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "key");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "operator");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "value");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "compare_mode");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "value_source_source");
      bindConditionField(conditionNode, branchIndex, conditionIndex, "value_source_key");
      bindSchemaKeySuggestions(conditionNode, branchIndex, conditionIndex);
      bindValueSourceSuggestions(conditionNode, branchIndex, conditionIndex);
      renderConditionCompareMode(conditionNode, builderBranches[branchIndex].conditions[conditionIndex]);
      renderConditionGuidance(conditionNode, builderBranches[branchIndex].conditions[conditionIndex]);
      conditionNode.querySelector("[data-action='remove-condition']").addEventListener("click", () => {
        builderBranches[branchIndex].conditions.splice(conditionIndex, 1);
        renderBranchEditor();
        syncJsonFromBuilder();
      });
      conditions.append(conditionNode);
    });

    branchEditor.append(node);
  });
  renderRuleGraph();
}

function switchBuilderMode() {
  const mode = document.querySelector("#builder-mode").value;
  if (mode === "graph" && (!graphBuilder.nodes || graphBuilder.nodes.length === 0)) {
    graphBuilder = starterGraphBuilder();
  }
  renderBuilderMode();
  syncJsonFromBuilder();
}

function renderBuilderMode() {
  const mode = document.querySelector("#builder-mode").value;
  const graphMode = mode === "graph";
  branchEditor.hidden = graphMode;
  graphEditor.hidden = !graphMode;
  document.querySelector("#add-branch").hidden = graphMode;
  document.querySelector("#fallback-result").closest("label").hidden = graphMode;
  document.querySelector("#fallback-outputs").closest("label").hidden = graphMode;
  if (graphMode) renderGraphBuilder();
  renderRuleGraph();
  renderRuleInspector();
}

function bindBranchSummary(node, branchIndex) {
  const target = node.querySelector("[data-role='branch-summary']");
  const branch = builderBranches[branchIndex];
  const outputs = parseJsonSafe(branch.outputs || "{}");
  const warnings = branchSummaryWarnings(branch, outputs);
  const items = [
    `${branch.conditions.length} condition${branch.conditions.length === 1 ? "" : "s"}`,
    `${Object.keys(outputs).length} output${Object.keys(outputs).length === 1 ? "" : "s"}`,
    outputs.ttl_seconds ? `offer TTL ${outputs.ttl_seconds}s` : "no offer TTL",
    branch.logic === "any" ? "match any" : "match all"
  ];
  const readable = branchReadableSummary(branch);
  target.innerHTML = [
    `<div class="branch-readable"><span>${escapeHtml(branch.conditions.length ? "IF " : "WHEN ")}</span><strong>${escapeHtml(readable)}</strong></div>`,
    `<div class="branch-chip-row">${[
      ...items.map((item) => `<span class="branch-chip">${escapeHtml(item)}</span>`),
      ...warnings.map((item) => `<span class="branch-chip warn">${escapeHtml(item)}</span>`)
    ].join("")}</div>`
  ].join("");
}

function branchSummaryWarnings(branch, outputs) {
  const warnings = [];
  if (!branch.conditions.length) warnings.push("no conditions");
  if (!Object.keys(outputs).length) warnings.push("no outputs");
  if (outputs.expires_at && Number.isNaN(Date.parse(outputs.expires_at))) warnings.push("invalid expiry");
  return warnings;
}

function branchReadableSummary(branch) {
  const result = branch.result || "eligible";
  if (!branch.conditions.length) return `Always return ${result}.`;
  const joiner = branch.logic === "any" ? " OR " : " AND ";
  const conditions = branch.conditions.map((condition) => conditionReadableText(condition)).filter(Boolean);
  return `${conditions.join(joiner)} THEN return ${result}.`;
}

function bindConditionBlockHelper(node) {
  const select = node.querySelector("[data-field='condition-block']");
  const blocks = availableConditionBlocks();
  select.innerHTML = [
    `<option value="">Choose a reusable block</option>`,
    ...blocks.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`)
  ].join("");
}

function applyConditionBlock(node, branchIndex) {
  const select = node.querySelector("[data-field='condition-block']");
  const template = availableConditionBlocks().find((item) => item.id === select.value);
  if (!template) return;
  const surface = document.querySelector("#rule-surface").value.trim();
  const nextConditions = template.conditions.map((condition) => ({
    source: condition.source || "attribute",
    key: condition.key || "",
    operator: condition.operator || "equals",
    value: template.id === "surface_match" ? surface : (condition.value ?? ""),
    compare_mode: "value",
    value_source_source: "attribute",
    value_source_key: ""
  }));
  builderBranches[branchIndex].conditions.push(...nextConditions);
  renderBranchEditor();
  syncJsonFromBuilder();
}

function availableConditionBlocks() {
  return conditionBlocksLoaded ? cachedConditionBlocks : defaultConditionBlockTemplates;
}

function bindOutputFieldEditor(node, branchIndex) {
  const target = node.querySelector("[data-role='outputs']");
  const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
  const entries = Object.entries(outputs);
  target.innerHTML = entries.length
    ? entries.map(([key, value]) => outputFieldRow(key, value)).join("")
    : `<div class="grid-empty">No output fields yet.</div>`;
  target.querySelectorAll("[data-output-key]").forEach((input) => {
    input.addEventListener("change", () => updateOutputField(branchIndex, input.dataset.outputKey, input.value, null));
  });
  target.querySelectorAll("[data-output-type]").forEach((select) => {
    select.addEventListener("change", () => updateOutputFieldType(branchIndex, select.dataset.outputType, select.value));
  });
  target.querySelectorAll("[data-output-value]").forEach((input) => {
    input.addEventListener("input", () => updateOutputField(branchIndex, input.dataset.outputValue, null, input.value));
    input.addEventListener("change", () => {
      if (input.dataset.outputValue === "message_id") renderBranchEditor();
      syncJsonFromBuilder();
    });
  });
  target.querySelectorAll("[data-open-output-message]").forEach((button) => {
    button.addEventListener("click", () => openLinkedMessage(button.dataset.openOutputMessage));
  });
  target.querySelectorAll("[data-remove-output]").forEach((button) => {
    button.addEventListener("click", () => {
      const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
      delete outputs[button.dataset.removeOutput];
      builderBranches[branchIndex].outputs = JSON.stringify(outputs);
      renderBranchEditor();
      syncJsonFromBuilder();
    });
  });
}

function outputFieldRow(key, value) {
  const type = outputValueType(value, key);
  const message = type === "message" ? cachedMessages.find((item) => item.id === value) : null;
  return `
    <div class="output-field-row${type === "message" ? " message-output-row" : ""}">
      <label>
        Field
        <input data-output-key="${escapeHtml(key)}" value="${escapeHtml(key)}" />
      </label>
      <label>
        Type
        <select data-output-type="${escapeHtml(key)}">
          <option value="static"${type === "static" ? " selected" : ""}>Static</option>
          <option value="reference"${type === "reference" ? " selected" : ""}>Reference</option>
          <option value="expression"${type === "expression" ? " selected" : ""}>Expression</option>
          <option value="message"${type === "message" ? " selected" : ""}>Message</option>
        </select>
      </label>
      <label>
        Value
        <input data-output-value="${escapeHtml(key)}" value="${escapeHtml(formatOutputValue(value))}" ${type === "message" ? `list="message-output-options"` : ""} />
      </label>
      <button type="button" data-remove-output="${escapeHtml(key)}">Remove</button>
      ${type === "message" ? messageOutputPreview(key, value, message) : ""}
    </div>
  `;
}

function outputValueType(value, key = "") {
  if (key === "message_id") return "message";
  if (typeof value === "string" && value.startsWith("=lookup(")) return "reference";
  if (typeof value === "string" && value.startsWith("=")) return "expression";
  return "static";
}

function formatOutputValue(value) {
  if (value == null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function updateOutputField(branchIndex, oldKey, nextKey, nextValue) {
  const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
  const key = nextKey ? slug(nextKey) : oldKey;
  const currentValue = outputs[oldKey];
  if (nextKey && key !== oldKey) delete outputs[oldKey];
  outputs[key] = nextValue == null ? currentValue : parseOutputInputValue(nextValue, currentValue);
  builderBranches[branchIndex].outputs = JSON.stringify(outputs);
  const advanced = branchEditor.querySelector(`[data-branch-index="${branchIndex}"] [data-field='outputs']`);
  if (advanced) advanced.value = builderBranches[branchIndex].outputs;
  renderRuleGraph();
}

function updateOutputFieldType(branchIndex, key, type) {
  const outputs = parseJsonSafe(builderBranches[branchIndex].outputs || "{}");
  const current = outputs[key];
  if (type === "message") {
    if (key !== "message_id") delete outputs[key];
    outputs.message_id = cachedMessages.find((item) => item.status !== "archived")?.id || cachedMessages[0]?.id || formatOutputValue(current) || "";
  } else if (type === "reference" && !(typeof current === "string" && current.startsWith("=lookup("))) {
    const table = preferredLookupTable();
    const column = firstLookupValueColumn(table) || "field_name";
    outputs[key] = table ? `=lookup(${JSON.stringify(table.id)}, ${defaultLookupKeyExpression(table, outputs) || "\"\""}, ${JSON.stringify(column)})` : "=lookup(\"table_id\", \"key\", \"field\")";
  } else if (type === "expression" && !(typeof current === "string" && current.startsWith("=")) ) {
    outputs[key] = `=${formatOutputValue(current) || "\"\""}`;
  } else if (type === "static" && typeof current === "string" && current.startsWith("=")) {
    outputs[key] = "";
  }
  builderBranches[branchIndex].outputs = JSON.stringify(outputs);
  renderBranchEditor();
  syncJsonFromBuilder();
}

function ensureInAppMessageOutputs() {
  if (document.querySelector("#rule-type")?.value !== "inapp_message") return;
  if (!cachedMessages.length) return;
  const message = cachedMessages.find((item) => item.status !== "archived") || cachedMessages[0];
  builderBranches.forEach((branch) => {
    const outputs = parseJsonSafe(branch.outputs || "{}");
    if (Object.keys(outputs).length || outputs.message_id) return;
    outputs.message_id = message.id;
    branch.outputs = JSON.stringify(outputs);
  });
}

function messageOutputPreview(key, value, message) {
  const content = message?.default_content || {};
  const title = content.title || content.headline || message?.name || value || "No message selected";
  const template = messageTemplateType(content.template_type || content.type || message?.metadata?.template_type || "banner");
  const ctas = normalizeMessageCtas(content);
  const state = message ? "linked" : value ? "missing" : "empty";
  return `
    <div class="message-output-preview ${state}">
      <div class="message-output-copy">
        <span>${escapeHtml(message ? [template, message.surface || content.placement].filter(Boolean).join(" · ") : "Message link")}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(message ? (content.body || "No body text") : (value ? `No saved message found for ${value}` : "Choose a message to return from this branch"))}</small>
        ${ctas.length ? `<em>${escapeHtml(ctas.map((cta) => cta.label || cta.url).filter(Boolean).join(" + "))}</em>` : ""}
      </div>
      <button type="button" data-open-output-message="${escapeHtml(value || "")}" ${message ? "" : "disabled"}>Open Message</button>
    </div>
  `;
}

function openLinkedMessage(id) {
  const message = cachedMessages.find((item) => item.id === id);
  if (!message) return;
  loadMessage(message.id, cachedMessages);
}

function renderMessageOutputOptions() {
  const list = document.querySelector("#message-output-options");
  if (!list) return;
  list.innerHTML = cachedMessages
    .map((item) => `<option value="${escapeHtml(item.id)}" label="${escapeHtml([item.name, item.surface, item.status].filter(Boolean).join(" / "))}"></option>`)
    .join("");
}

function parseOutputInputValue(raw, previousValue) {
  if (typeof previousValue === "string" && previousValue.startsWith("=")) return raw;
  return parseReferenceCell(raw);
}

function uniqueOutputFieldName(fields, base) {
  if (!fields.includes(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}_${index}`;
    if (!fields.includes(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

function renderRuleGraph() {
  if (!ruleGraph) return;
  if (document.querySelector("#builder-mode").value === "graph") {
    renderAdvancedGraphPreview();
    return;
  }
  if (graphMinimap) {
    graphMinimap.hidden = true;
    graphMinimap.innerHTML = "";
  }
  const fallbackResult = document.querySelector("#fallback-result").value.trim() || "deferred";
  const fallbackOutputs = parseJsonSafe(document.querySelector("#fallback-outputs").value || "{}");
  const branchCards = builderBranches.map((branch, index) => {
    const outputs = parseJsonSafe(branch.outputs || "{}");
    const conditionText = branch.conditions.length
      ? `${branch.conditions.length} ${branch.logic === "any" ? "any" : "all"} condition${branch.conditions.length === 1 ? "" : "s"}`
      : "No conditions";
    return `
      <button type="button" class="graph-node branch-node" data-graph-branch="${index}">
        <span class="graph-kicker">Branch ${index + 1}</span>
        <strong>${escapeHtml(branch.id || `branch_${index + 1}`)}</strong>
        <span>${escapeHtml(conditionText)}</span>
        <span>${escapeHtml(branch.result || "eligible")}</span>
        <small>${escapeHtml(Object.keys(outputs).length ? `${Object.keys(outputs).length} output field${Object.keys(outputs).length === 1 ? "" : "s"}` : "No outputs")}</small>
      </button>
    `;
  }).join("");
  ruleGraph.innerHTML = `
    <div class="graph-stage">
      <div class="graph-node input-node">
        <span class="graph-kicker">Input</span>
        <strong>Profile + context</strong>
        <span>Attributes, segments, identifiers</span>
      </div>
      <div class="graph-lane">
        ${branchCards || '<div class="graph-empty">Add a branch to start the decision flow.</div>'}
      </div>
      <div class="graph-node fallback-node">
        <span class="graph-kicker">Fallback</span>
        <strong>${escapeHtml(fallbackResult)}</strong>
        <span>${escapeHtml(Object.keys(fallbackOutputs).length ? `${Object.keys(fallbackOutputs).length} output field${Object.keys(fallbackOutputs).length === 1 ? "" : "s"}` : "No outputs")}</span>
      </div>
    </div>
  `;
  ruleGraph.querySelectorAll("[data-graph-branch]").forEach((button) => {
    button.addEventListener("click", () => {
      const branchIndex = Number(button.dataset.graphBranch);
      const target = branchEditor.querySelector(`[data-branch-index="${branchIndex}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("highlight");
      setTimeout(() => target?.classList.remove("highlight"), 900);
    });
  });
}

function renderAdvancedGraphPreview() {
  const nodes = graphBuilder.nodes || [];
  autoLayoutGraph(false);
  const layout = graphCanvasLayout();
  const cards = nodes.map((node) => {
    const edges = graphNodeEdges(node);
    const nodeLayout = normalizedGraphNodeLayout(node);
    const selected = node.id === selectedGraphNodeId;
    const connectTarget = graphConnectionDraft && node.id !== graphConnectionDraft.source;
    return `
      <div
        role="button"
        tabindex="0"
        class="graph-node branch-node graph-node-draggable graph-node-type-${escapeHtml(graphNodeTypeClass(node.type))}${selected ? " selected" : ""}${connectTarget ? " connect-target" : ""}"
        data-graph-node="${escapeHtml(node.id)}"
        style="left:${nodeLayout.x}px; top:${nodeLayout.y}px;"
        aria-label="Edit graph node ${escapeHtml(node.id || "node")}"
      >
        <span class="graph-drag-handle" data-graph-drag="${escapeHtml(node.id)}" title="Drag node">drag</span>
        <span class="graph-kicker">${escapeHtml(node.type || "node")}${node.id === graphBuilder.entry ? " / entry" : ""}</span>
        <strong>${escapeHtml(node.id || "node")}</strong>
        <span>${escapeHtml(graphNodeSummary(node))}</span>
        <small>${escapeHtml(edges.length ? `Routes to ${edges.join(", ")}` : "Terminal node")}</small>
        <span class="graph-route-ports" aria-label="Connection routes">
          ${graphConnectableRoutes(node).map((route) => `
            <span
              role="button"
              tabindex="0"
              class="graph-route-port${graphConnectionDraft?.source === node.id && graphConnectionDraft?.field === route.field ? " active" : ""}${graphRouteTarget(node, route.field) ? " connected" : ""}"
              data-graph-route-source="${escapeHtml(node.id || "")}"
              data-graph-route-field="${escapeHtml(route.field)}"
              title="Connect ${escapeHtml(route.label)} route"
            >${escapeHtml(route.label)}</span>
          `).join("")}
        </span>
      </div>
    `;
  }).join("");
  ruleGraph.innerHTML = `
    <div class="graph-stage advanced-graph-stage">
      <div class="graph-canvas-shell">
        <div class="graph-canvas-status">
          <strong>Canvas</strong>
          <span>${graphConnectionDraft ? `Connect ${escapeHtml(graphConnectionDraft.field)} from ${escapeHtml(graphConnectionDraft.source)}: click a target node` : `Entry: ${escapeHtml(graphBuilder.entry || "input")} &middot; ${escapeHtml(graphReachabilitySummary())}`}</span>
          ${graphConnectionDraft ? '<button type="button" data-graph-action="cancel-connect">Cancel</button>' : ""}
        </div>
        <div class="graph-canvas-controls">
          <button type="button" data-graph-action="open-node-picker">+ Add node</button>
        </div>
        <div class="graph-canvas${graphSnapEnabled ? " snap-enabled" : ""}" style="width:${layout.width}px; height:${layout.height}px; --graph-grid-size:${graphSnapSize}px;">
          ${graphEdgeSvg(layout.width, layout.height)}
          ${cards || '<div class="graph-empty graph-canvas-empty">Create a graph template or add a node.</div>'}
        </div>
        <div class="graph-minimap graph-minimap-overlay" aria-live="polite">
          ${graphMinimapHtml(layout)}
        </div>
      </div>
    </div>
  `;
  ruleGraph.querySelector("[data-graph-action='open-node-picker']")?.addEventListener("click", openGraphNodePicker);
  ruleGraph.querySelector("[data-graph-action='cancel-connect']")?.addEventListener("click", () => {
    graphConnectionDraft = null;
    renderRuleGraph();
  });
  ruleGraph.querySelectorAll("[data-graph-route-source]").forEach((port) => {
    const activate = (event) => {
      event.preventDefault();
      event.stopPropagation();
      graphConnectionDraft = {
        source: port.dataset.graphRouteSource || "",
        field: port.dataset.graphRouteField || ""
      };
      selectedGraphNodeId = graphConnectionDraft.source;
      renderRuleGraph();
    };
    port.addEventListener("click", activate);
    port.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") activate(event);
    });
  });
  ruleGraph.querySelectorAll("[data-graph-node]").forEach((button) => {
    const activateNode = () => {
      if (button.dataset.dragged === "true") {
        button.dataset.dragged = "false";
        return;
      }
      if (graphConnectionDraft && button.dataset.graphNode !== graphConnectionDraft.source) {
        connectGraphNodes(graphConnectionDraft.source, graphConnectionDraft.field, button.dataset.graphNode || "");
        graphConnectionDraft = null;
        selectedGraphNodeId = button.dataset.graphNode || "";
        renderGraphBuilder();
        syncJsonFromBuilder();
        return;
      }
      selectedGraphNodeId = button.dataset.graphNode || "";
      graphConnectionDraft = null;
      renderGraphBuilder();
      const target = graphNodeEditor.querySelector(`[data-node-id="${cssEscape(selectedGraphNodeId)}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    button.addEventListener("click", activateNode);
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateNode();
      }
    });
  });
  ruleGraph.querySelectorAll("[data-graph-minimap-node]").forEach((button) => {
    button.addEventListener("click", () => focusGraphNode(button.dataset.graphMinimapNode));
  });
  bindGraphNodeDrag();
  renderGraphMinimap(layout);
}

function renderGraphMinimap(layout = graphCanvasLayout()) {
  if (!graphMinimap) return;
  graphMinimap.hidden = true;
  graphMinimap.innerHTML = "";
}

function graphMinimapHtml(layout = graphCanvasLayout()) {
  const nodes = graphBuilder.nodes || [];
  if (document.querySelector("#builder-mode")?.value !== "graph") {
    return "";
  }
  const minimapWidth = 168;
  const minimapHeight = 92;
  const scale = Math.min(
    (minimapWidth - 16) / Math.max(layout.width, 1),
    (minimapHeight - 16) / Math.max(layout.height, 1)
  );
  const miniNodes = nodes.map((node) => {
    const nodeLayout = normalizedGraphNodeLayout(node);
    const left = Math.max(6, Math.round(nodeLayout.x * scale) + 6);
    const top = Math.max(6, Math.round(nodeLayout.y * scale) + 6);
    const width = Math.max(18, Math.round(layout.nodeWidth * scale));
    const height = Math.max(12, Math.round(layout.nodeHeight * scale));
    return `
      <button
        type="button"
        class="graph-minimap-node ${node.id === graphBuilder.entry ? "entry" : ""}"
        data-graph-minimap-node="${escapeHtml(node.id || "")}"
        style="left:${left}px; top:${top}px; width:${width}px; height:${height}px;"
        title="${escapeHtml(node.id || "node")}"
        aria-label="Focus graph node ${escapeHtml(node.id || "node")}"
      ></button>
    `;
  }).join("");
  return `
    <div class="graph-minimap-copy">
      <strong>Canvas map</strong>
      <span>${escapeHtml(graphReachabilitySummary())} &middot; ${nodes.length} node${nodes.length === 1 ? "" : "s"}</span>
    </div>
    <div class="graph-minimap-stage" style="width:${minimapWidth}px; height:${minimapHeight}px;">
      ${miniNodes || '<span class="graph-minimap-empty">No nodes</span>'}
    </div>
  `;
}

function focusGraphNode(nodeId) {
  if (!nodeId) return;
  selectedGraphNodeId = nodeId;
  renderRuleGraph();
  renderGraphNodeEditor();
  const canvasNode = ruleGraph?.querySelector(`[data-graph-node="${cssEscape(nodeId)}"]`);
  const editorNode = graphNodeEditor?.querySelector(`[data-node-id="${cssEscape(nodeId)}"]`);
  canvasNode?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  editorNode?.scrollIntoView({ behavior: "smooth", block: "center" });
  [canvasNode, editorNode].forEach((node) => {
    node?.classList.add("highlight");
    setTimeout(() => node?.classList.remove("highlight"), 900);
  });
}

function normalizedGraphNodeLayout(node) {
  const layout = node.layout && typeof node.layout === "object" && !Array.isArray(node.layout) ? node.layout : {};
  return {
    x: Number.isFinite(Number(layout.x)) ? Math.max(16, Number(layout.x)) : 16,
    y: Number.isFinite(Number(layout.y)) ? Math.max(16, Number(layout.y)) : 16
  };
}

function normalizedGraphSnapSize() {
  const nextSize = Number(graphSnapSizeInput?.value || graphSnapSize || 24);
  if (!Number.isFinite(nextSize)) return 24;
  return Math.min(80, Math.max(8, Math.round(nextSize)));
}

function snapGraphCoordinate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 16;
  if (!graphSnapEnabled) return Math.round(numeric);
  const size = normalizedGraphSnapSize();
  return Math.round(numeric / size) * size;
}

function autoLayoutGraph(force = false) {
  const nodes = graphBuilder.nodes || [];
  if (!nodes.length) return;
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const depthById = new Map();
  const queue = [{ id: graphBuilder.entry || nodes[0].id, depth: 0 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current.id || depthById.has(current.id)) continue;
    depthById.set(current.id, current.depth);
    const node = nodeMap.get(current.id);
    if (!node) continue;
    graphNodeEdges(node).forEach((target) => queue.push({ id: target, depth: current.depth + 1 }));
  }
  nodes.forEach((node) => {
    if (!depthById.has(node.id)) depthById.set(node.id, depthById.size ? Math.max(...depthById.values()) + 1 : 0);
  });
  const rowsByDepth = new Map();
  nodes.forEach((node, index) => {
    const depth = depthById.get(node.id) || 0;
    const row = rowsByDepth.get(depth) || 0;
    rowsByDepth.set(depth, row + 1);
    if (force || !node.layout || !Number.isFinite(Number(node.layout.x)) || !Number.isFinite(Number(node.layout.y))) {
      node.layout = {
        x: 24 + depth * 250,
        y: 24 + row * 150 + (index % 2 ? 12 : 0)
      };
    }
  });
}

function graphCanvasLayout() {
  const nodeWidth = 210;
  const nodeHeight = 124;
  const layouts = (graphBuilder.nodes || []).map(normalizedGraphNodeLayout);
  const maxX = Math.max(620, ...layouts.map((layout) => layout.x + nodeWidth + 24));
  const maxY = Math.max(320, ...layouts.map((layout) => layout.y + nodeHeight + 24));
  return { width: maxX, height: maxY, nodeWidth, nodeHeight };
}

function graphEdgeSvg(width, height) {
  const nodes = new Map((graphBuilder.nodes || []).map((node) => [node.id, node]));
  const layout = graphCanvasLayout();
  const lines = [];
  for (const node of graphBuilder.nodes || []) {
    const from = normalizedGraphNodeLayout(node);
    const targets = graphNodeEdgesDetailed(node);
    targets.forEach((edge, edgeIndex) => {
      const targetNode = nodes.get(edge.target);
      if (!targetNode) return;
      const to = normalizedGraphNodeLayout(targetNode);
      const startX = from.x + layout.nodeWidth;
      const startY = from.y + layout.nodeHeight / 2;
      const endX = to.x;
      const endY = to.y + layout.nodeHeight / 2;
      const labelX = startX + (endX - startX) / 2;
      const labelY = startY + (endY - startY) / 2 - 8 - edgeIndex * 10;
      lines.push(`
        <line
          x1="${startX}"
          y1="${startY}"
          x2="${endX}"
          y2="${endY}"
        ></line>
        <text x="${labelX}" y="${labelY}">${escapeHtml(edge.label)}</text>
      `);
    });
  }
  return `<svg class="graph-edge-svg" width="${width}" height="${height}" aria-hidden="true">${lines.join("")}</svg>`;
}

function bindGraphNodeDrag() {
  ruleGraph.querySelectorAll("[data-graph-drag]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      const button = handle.closest("[data-graph-node]");
      const node = (graphBuilder.nodes || []).find((item) => item.id === button?.dataset.graphNode);
      const canvas = ruleGraph.querySelector(".graph-canvas");
      if (!button || !node || !canvas) return;
      event.preventDefault();
      event.stopPropagation();
      const start = { x: event.clientX, y: event.clientY };
      const original = normalizedGraphNodeLayout(node);
      let moved = false;
      const move = (moveEvent) => {
        const canvasRect = canvas.getBoundingClientRect();
        const next = {
          x: Math.max(16, Math.min(canvasRect.width - 226, original.x + moveEvent.clientX - start.x)),
          y: Math.max(16, Math.min(canvasRect.height - 140, original.y + moveEvent.clientY - start.y))
        };
        moved = moved || Math.abs(next.x - original.x) > 4 || Math.abs(next.y - original.y) > 4;
        node.layout = { x: Math.max(16, snapGraphCoordinate(next.x)), y: Math.max(16, snapGraphCoordinate(next.y)) };
        button.style.left = `${node.layout.x}px`;
        button.style.top = `${node.layout.y}px`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (moved) {
          button.dataset.dragged = "true";
          renderRuleGraph();
          syncJsonFromBuilder();
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
    });
  });
}

function renderGraphBuilder() {
  document.querySelector("#graph-entry").value = graphBuilder.entry || "";
  if (graphSnapEnabledInput) graphSnapEnabledInput.checked = graphSnapEnabled;
  if (graphSnapSizeInput) graphSnapSizeInput.value = String(normalizedGraphSnapSize());
  if (!selectedGraphNodeId && graphBuilder.nodes?.length) selectedGraphNodeId = graphBuilder.entry || graphBuilder.nodes[0].id || "";
  renderFrequencyCapHelperOptions();
  renderGraphNodeEditor();
  renderRuleGraph();
}

function renderGraphNodeEditor() {
  if (!graphNodeEditor) return;
  const nodes = graphBuilder.nodes || [];
  if (selectedGraphNodeId && !nodes.some((node) => node.id === selectedGraphNodeId)) selectedGraphNodeId = "";
  const selectedIndex = nodes.findIndex((node) => node.id === selectedGraphNodeId);
  graphNodeEditor.innerHTML = selectedIndex >= 0
    ? graphNodeEditorCard(nodes[selectedIndex], selectedIndex)
    : graphSettingsEditorCard(nodes);
  graphNodeEditor.querySelectorAll("[data-graph-field]").forEach((input) => {
    input.addEventListener("input", () => updateGraphNodeField(Number(input.dataset.nodeIndex), input.dataset.graphField, input.value));
    input.addEventListener("change", () => {
      if (["id", "table", "message_id", "type"].includes(input.dataset.graphField)) renderGraphBuilder();
      syncJsonFromBuilder();
    });
  });
  graphNodeEditor.querySelectorAll("[data-graph-variant-field]").forEach((input) => {
    input.addEventListener("input", () => {
      updateGraphVariantField(Number(input.dataset.nodeIndex), Number(input.dataset.variantIndex), input.dataset.graphVariantField, input.value);
    });
    input.addEventListener("change", () => {
      updateGraphVariantField(Number(input.dataset.nodeIndex), Number(input.dataset.variantIndex), input.dataset.graphVariantField, input.value);
      renderGraphBuilder();
      syncJsonFromBuilder();
    });
  });
  graphNodeEditor.querySelectorAll("[data-graph-variant-action]").forEach((button) => {
    button.addEventListener("click", () => {
      updateGraphVariantAction(Number(button.dataset.nodeIndex), Number(button.dataset.variantIndex || 0), button.dataset.graphVariantAction);
    });
  });
  graphNodeEditor.querySelectorAll("[data-remove-graph-node]").forEach((button) => {
    button.addEventListener("click", () => {
      const removed = graphBuilder.nodes[Number(button.dataset.removeGraphNode)]?.id || "";
      graphBuilder.nodes.splice(Number(button.dataset.removeGraphNode), 1);
      if (selectedGraphNodeId === removed) selectedGraphNodeId = "";
      renderGraphBuilder();
      syncJsonFromBuilder();
    });
  });
}

function graphSettingsEditorCard(nodes = []) {
  return `
    <section class="graph-edit-card graph-settings-card">
      <div class="graph-edit-head compact">
        <div>
          <strong>Graph settings</strong>
          <span>${escapeHtml(nodes.length)} node${nodes.length === 1 ? "" : "s"} &middot; ${escapeHtml(graphReachabilitySummary())}</span>
        </div>
      </div>
      <p class="status-line">Select a node on the canvas to edit its behavior. Use graph settings for entry, layout, snap, and frequency-cap helpers.</p>
      ${graphReadinessPanel()}
    </section>
  `;
}

function renderFrequencyCapHelperOptions() {
  const decisionList = document.querySelector("#frequency-cap-decision-options");
  const messageList = document.querySelector("#frequency-cap-message-options");
  const surfaceList = document.querySelector("#frequency-cap-surface-options");
  if (decisionList) decisionList.innerHTML = datalistOptions(cachedRuleSets.map((item) => item.decision_key));
  if (messageList) messageList.innerHTML = datalistOptions(cachedMessages.map((item) => item.id));
  if (surfaceList) surfaceList.innerHTML = datalistOptions(graphSurfaceSuggestions());
  const decisionInput = document.querySelector("#frequency-cap-decision");
  if (decisionInput && !decisionInput.value) decisionInput.placeholder = document.querySelector("#rule-key")?.value || "Use current rule";
}

function datalistOptions(values) {
  return [...new Set((values || []).filter(Boolean).map(String))]
    .map((value) => `<option value="${escapeHtml(value)}"></option>`)
    .join("");
}

function applyFrequencyCapMessageSuggestion() {
  const messageId = document.querySelector("#frequency-cap-message")?.value.trim();
  const message = cachedMessages.find((item) => item.id === messageId);
  const surfaceInput = document.querySelector("#frequency-cap-surface");
  if (message?.surface && surfaceInput && !surfaceInput.value) surfaceInput.value = message.surface;
}

function addFrequencyCapFromHelper() {
  const node = {
    ...graphNodeDefaults("frequency_cap", uniqueGraphNodeId("frequency_cap")),
    event_type: document.querySelector("#frequency-cap-event")?.value || "impression",
    max: Number(document.querySelector("#frequency-cap-max")?.value || 1),
    window_days: Number(document.querySelector("#frequency-cap-window")?.value || 1),
    decision_key: document.querySelector("#frequency-cap-decision")?.value.trim() || document.querySelector("#rule-key")?.value.trim() || "",
    message_id: document.querySelector("#frequency-cap-message")?.value.trim() || "",
    surface: document.querySelector("#frequency-cap-surface")?.value.trim() || document.querySelector("#rule-surface")?.value.trim() || "",
    capped: document.querySelector("#frequency-cap-capped")?.value.trim() || "",
    output_key: document.querySelector("#frequency-cap-output-key")?.value.trim() || "frequency_count"
  };
  graphBuilder.nodes.push(node);
  if (!graphBuilder.entry) graphBuilder.entry = node.id;
  renderGraphBuilder();
  syncJsonFromBuilder();
}

function graphNodeEditorCard(node, index) {
  return `
    <section class="graph-edit-card" data-node-id="${escapeHtml(node.id || "")}">
      <div class="graph-edit-head">
        <label>
          Node ID
          <input data-node-index="${index}" data-graph-field="id" value="${escapeHtml(node.id || "")}" />
        </label>
        <label>
          Type
          <select data-node-index="${index}" data-graph-field="type">
            ${graphNodeTypes().map((type) => `<option value="${type}"${node.type === type ? " selected" : ""}>${graphNodeTypeLabel(type)}</option>`).join("")}
          </select>
        </label>
        ${graphRouteField(index, "next", "Default route", node.next || "")}
        <button type="button" data-remove-graph-node="${index}">Remove</button>
      </div>
      <div class="graph-edge-line">${escapeHtml(graphNodeEdgeSummary(node))}</div>
      ${graphReadinessPanel([node.id])}
      <div class="graph-edit-fields">
        ${graphNodeSpecificFields(node, index)}
      </div>
    </section>
  `;
}

function graphReadinessPanel(nodeIds = null) {
  const scopedIds = Array.isArray(nodeIds) ? new Set(nodeIds) : null;
  const checks = graphReadinessChecks(graphBuilder)
    .filter((check) => !scopedIds || !check.node_id || scopedIds.has(check.node_id));
  const visibleChecks = checks.length
    ? checks
    : [readinessCheck(true, scopedIds ? "Node ready" : "Graph ready", scopedIds ? "No obvious issues detected for this node." : "Routes, entry, and split variants look ready.")];
  return `
    <div class="graph-readiness-panel">
      <div class="readiness-list compact">
        ${visibleChecks.slice(0, 8).map((check) => `
          <div class="readiness-item ${escapeHtml(check.level)}">
            <span>${check.level === "ok" ? "OK" : check.level === "error" ? "!" : "!"}</span>
            <div>
              <em>${escapeHtml(check.title)}</em>
              <small>${escapeHtml(check.detail)}</small>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function graphReadinessChecks(graph = {}) {
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const checks = [];
  const ids = new Set();
  const duplicateIds = new Set();
  if (!graph.entry) checks.push(readinessCheck(false, "Entry node", "Choose a graph entry node.", "error"));
  if (!nodes.length) checks.push(readinessCheck(false, "Nodes", "Add at least one graph node.", "error"));
  for (const node of nodes) {
    if (!node.id) {
      checks.push(readinessCheck(false, "Node ID", "Every node needs an ID.", "error"));
      continue;
    }
    if (ids.has(node.id)) duplicateIds.add(node.id);
    ids.add(node.id);
  }
  for (const id of duplicateIds) checks.push({ ...readinessCheck(false, "Duplicate node ID", `${id} is used by more than one node.`, "error"), node_id: id });
  if (graph.entry && nodes.length && !ids.has(graph.entry)) checks.push(readinessCheck(false, "Entry route", `${graph.entry} does not match a node ID.`, "error"));
  for (const node of nodes) {
    if (!node?.id) continue;
    const type = node.type || "input";
    if (!["output", "fallback", "error"].includes(type) && !graphNodeEdgesDetailed(node).length) {
      checks.push({ ...readinessCheck(false, "No route", `${node.id} does not route anywhere.`, "error"), node_id: node.id });
    }
    for (const edge of graphNodeEdgesDetailed(node)) {
      if (!ids.has(edge.target)) checks.push({ ...readinessCheck(false, "Missing target", `${node.id} ${edge.label} routes to missing node ${edge.target}.`, "error"), node_id: node.id });
    }
    if (type === "experiment_split") checks.push(...graphExperimentSplitReadinessChecks(node));
  }
  return checks;
}

function graphExperimentSplitReadinessChecks(node) {
  const variants = Array.isArray(node.variants) ? normalizedGraphNodeVariants(node) : [];
  const checks = [];
  const keys = new Set();
  let weightTotal = 0;
  if (variants.length < 2) {
    checks.push({ ...readinessCheck(false, "Variants", `${node.id} needs at least control and one treatment.`, "error"), node_id: node.id });
  }
  for (const variant of variants) {
    if (!variant.key) checks.push({ ...readinessCheck(false, "Variant key", `${node.id} has a variant without a key.`, "error"), node_id: node.id });
    if (keys.has(variant.key)) checks.push({ ...readinessCheck(false, "Duplicate variant", `${node.id} repeats variant key ${variant.key}.`, "error"), node_id: node.id });
    keys.add(variant.key);
    if (Number(variant.weight) < 0 || !Number.isFinite(Number(variant.weight))) {
      checks.push({ ...readinessCheck(false, "Variant weight", `${variant.key || "Variant"} has an invalid weight.`, "error"), node_id: node.id });
    }
    weightTotal += Math.max(0, Number(variant.weight || 0));
    if (!variant.route) checks.push({ ...readinessCheck(false, "Variant route", `${variant.key || "Variant"} needs a route.`, "error"), node_id: node.id });
  }
  if (weightTotal <= 0) checks.push({ ...readinessCheck(false, "Allocation", `${node.id} needs positive variant weight.`, "error"), node_id: node.id });
  if (weightTotal > 0 && Math.round(weightTotal) !== 100) {
    checks.push({ ...readinessCheck(false, "Allocation total", `${node.id} variant weights total ${formatNumber(weightTotal)}%. Runtime normalizes this, but 100% is easier to review.`, "warn"), node_id: node.id });
  }
  if (!checks.some((check) => check.level === "error")) {
    checks.push({ ...readinessCheck(true, "Experiment split", `${variants.length} variants configured; ${formatNumber(weightTotal)}% total weight.`, "warn"), node_id: node.id });
  }
  return checks;
}

function graphNodeSpecificFields(node, index) {
  const field = (name, label, value = node[name] ?? "", attrs = "") => `
    <label>
      ${label}
      <input data-node-index="${index}" data-graph-field="${name}" value="${escapeHtml(formatOutputValue(value))}" ${attrs} />
    </label>
  `;
  const route = (name, label, value = node[name] ?? "") => graphRouteField(index, name, label, value);
  const lookupTableList = graphDatalist(`graph-lookup-tables-${index}`, cachedLookupTables.map((item) => item.id));
  const lookupColumnList = graphDatalist(`graph-lookup-columns-${index}`, lookupColumns(lookupTableById(node.table)));
  const lookupExpressionList = graphDatalist(`graph-lookup-expressions-${index}`, graphLookupExpressionSuggestions(node));
  const messageList = graphDatalist(`graph-messages-${index}`, cachedMessages.map((item) => item.id));
  const surfaceList = graphDatalist(`graph-surfaces-${index}`, graphSurfaceSuggestions());
  const ruleList = graphDatalist(`graph-decisions-${index}`, cachedRuleSets.map((item) => item.decision_key));
  const eventList = graphDatalist(`graph-event-types-${index}`, ["impression", "exposure"]);
  if (node.type === "condition") {
    return [
      field("expression", "Expression"),
      route("true", "True route"),
      route("false", "False route")
    ].join("");
  }
  if (node.type === "score") {
    return [
      field("label", "Score label"),
      field("rules", "Rules JSON", JSON.stringify(node.rules || []))
    ].join("");
  }
  if (node.type === "lookup") {
    return [
      field("table", "Reference table", node.table, `list="graph-lookup-tables-${index}"`),
      field("key_expression", "Key expression", node.key_expression, `list="graph-lookup-expressions-${index}"`),
      field("column", "Field to return", node.column, `list="graph-lookup-columns-${index}"`),
      field("output_key", "Store as context"),
      lookupTableList,
      lookupColumnList,
      lookupExpressionList
    ].join("");
  }
  if (node.type === "frequency_cap") {
    return [
      field("event_type", "Event type", node.event_type || "impression", `list="graph-event-types-${index}"`),
      field("max", "Max events"),
      field("window_days", "Window days"),
      field("decision_key", "Decision key", node.decision_key || "", `list="graph-decisions-${index}"`),
      field("message_id", "Message ID", node.message_id, `list="graph-messages-${index}"`),
      field("surface", "Surface", node.surface, `list="graph-surfaces-${index}"`),
      route("capped", "Capped route"),
      field("output_key", "Store count as"),
      eventList,
      ruleList,
      messageList,
      surfaceList
    ].join("");
  }
  if (node.type === "experiment_split") {
    return [
      field("experiment_key", "Experiment key", node.experiment_key || node.id),
      graphSelectField(index, "mode", "Mode", node.mode || "fixed", [
        ["fixed", "A/B or multivariant"],
        ["bandit", "Bandit-ready weighted split"]
      ]),
      graphSelectField(index, "unit", "Assignment unit", node.unit || "profile", [
        ["profile", "Profile"],
        ["session", "Session"],
        ["identifier", "Identifier"]
      ]),
      field("output_key", "Store variant as", node.output_key || "variant_key"),
      route("fallback", "Fallback route"),
      graphExperimentVariantsEditor(node, index)
    ].join("");
  }
  if (["output", "fallback", "error"].includes(node.type)) {
    return [
      field("result", "Result"),
      field("outputs", "Outputs JSON", JSON.stringify(node.outputs || {}))
    ].join("");
  }
  return [
    field("defaults", "Defaults JSON", JSON.stringify(node.defaults || {}))
  ].join("");
}

function graphSelectField(index, name, label, value, options) {
  const selectedValue = String(value || "");
  return `
    <label>
      ${label}
      <select data-node-index="${index}" data-graph-field="${name}">
        ${options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}"${optionValue === selectedValue ? " selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}
      </select>
    </label>
  `;
}

function graphExperimentVariantsEditor(node, index) {
  const variants = normalizedGraphNodeVariants(node);
  return `
    <div class="graph-experiment-variants">
      <div class="graph-experiment-variants-head">
        <strong>Variants</strong>
        <span>Weights are normalized automatically. Connect each route from the canvas ports or here.</span>
      </div>
      <div class="graph-experiment-variant-grid" role="group" aria-label="Experiment variants">
        ${variants.map((variant, variantIndex) => `
          <div class="graph-experiment-variant-row">
            <label>
              Key
              <input data-node-index="${index}" data-variant-index="${variantIndex}" data-graph-variant-field="key" value="${escapeHtml(variant.key)}" />
            </label>
            <label>
              Weight
              <input type="number" min="0" step="1" data-node-index="${index}" data-variant-index="${variantIndex}" data-graph-variant-field="weight" value="${escapeHtml(variant.weight)}" />
            </label>
            ${graphVariantRouteField(index, variantIndex, variant.route || "")}
            <button type="button" data-node-index="${index}" data-variant-index="${variantIndex}" data-graph-variant-action="remove">Remove</button>
          </div>
        `).join("")}
      </div>
      <button type="button" class="secondary" data-node-index="${index}" data-graph-variant-action="add">Add variant</button>
    </div>
  `;
}

function graphVariantRouteField(index, variantIndex, value = "") {
  const normalized = String(value || "");
  const options = graphRouteOptions(normalized);
  return `
    <label>
      Route
      <select data-node-index="${index}" data-variant-index="${variantIndex}" data-graph-variant-field="route">
        <option value=""${normalized ? "" : " selected"}>No route</option>
        ${options.map((option) => `<option value="${escapeHtml(option)}"${option === normalized ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function graphRouteField(index, name, label, value = "") {
  const normalized = String(value || "");
  const options = graphRouteOptions(normalized);
  return `
    <label>
      ${label}
      <select data-node-index="${index}" data-graph-field="${name}">
        <option value=""${normalized ? "" : " selected"}>No route</option>
        ${options.map((option) => `<option value="${escapeHtml(option)}"${option === normalized ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function graphRouteOptions(currentValue = "") {
  return [...new Set([
    ...(graphBuilder.nodes || []).map((node) => node.id).filter(Boolean),
    currentValue
  ].filter(Boolean).map(String))];
}

function graphConnectableRoutes(node = {}) {
  if (["output", "fallback", "error"].includes(node.type)) return [];
  if (node.type === "condition") {
    return [
      { field: "true", label: "true" },
      { field: "false", label: "false" }
    ];
  }
  if (node.type === "frequency_cap") {
    return [
      { field: "next", label: "next" },
      { field: "capped", label: "capped" }
    ];
  }
  if (node.type === "experiment_split") {
    return [
      ...normalizedGraphNodeVariants(node).map((variant) => ({
        field: `variant:${variant.key}`,
        label: variant.key
      })),
      { field: "fallback", label: "fallback" }
    ];
  }
  return [{ field: "next", label: "next" }];
}

function connectGraphNodes(sourceId, routeField, targetId) {
  if (!sourceId || !routeField || !targetId || sourceId === targetId) return;
  const source = (graphBuilder.nodes || []).find((node) => node.id === sourceId);
  if (!source) return;
  if (routeField.startsWith("variant:")) {
    const variantKey = routeField.slice("variant:".length);
    const variants = ensureGraphNodeVariants(source);
    const variant = variants.find((item) => item.key === variantKey);
    if (variant) variant.route = targetId;
    return;
  }
  source[routeField] = targetId;
}

function graphRouteTarget(node, routeField) {
  if (!node || !routeField) return "";
  if (routeField.startsWith("variant:")) {
    const variantKey = routeField.slice("variant:".length);
    return normalizedGraphNodeVariants(node).find((variant) => variant.key === variantKey)?.route || "";
  }
  return node[routeField] || "";
}

function graphNodeEdgeSummary(node) {
  const edges = graphNodeEdgesDetailed(node);
  return edges.length ? `Routes: ${edges.map((edge) => `${edge.label} -> ${edge.target}`).join(", ")}` : "Terminal or incomplete node";
}

function updateGraphNodeField(index, field, rawValue) {
  const node = graphBuilder.nodes[index];
  if (!node) return;
  const previousId = node.id;
  if (field === "id" && graphBuilder.entry === node.id) graphBuilder.entry = rawValue.trim();
  if (["rules", "outputs", "defaults"].includes(field)) {
    node[field] = parseJsonSafe(rawValue, field === "rules" ? [] : {});
  } else if (["max", "window_days"].includes(field)) {
    node[field] = Number(rawValue || 0);
  } else if (rawValue.trim() === "") {
    delete node[field];
  } else {
    node[field] = field === "id" ? rawValue.trim() : rawValue;
  }
  if (field === "id" && selectedGraphNodeId === previousId) selectedGraphNodeId = node.id || "";
  applyGraphNodeHelpers(node, field);
  if (field === "type") Object.assign(node, graphNodeDefaults(node.type, node.id));
  renderRuleGraph();
}

function updateGraphVariantField(nodeIndex, variantIndex, field, rawValue) {
  const node = graphBuilder.nodes[nodeIndex];
  if (!node) return;
  const variants = ensureGraphNodeVariants(node);
  const variant = variants[variantIndex];
  if (!variant) return;
  if (field === "weight") variant.weight = Math.max(0, Number(rawValue || 0));
  else if (field === "key") variant.key = slug(rawValue || `variant_${variantIndex + 1}`) || `variant_${variantIndex + 1}`;
  else if (rawValue === "") delete variant[field];
  else variant[field] = rawValue;
  renderRuleGraph();
}

function updateGraphVariantAction(nodeIndex, variantIndex, action) {
  const node = graphBuilder.nodes[nodeIndex];
  if (!node) return;
  const variants = ensureGraphNodeVariants(node);
  if (action === "add") {
    variants.push({ key: uniqueGraphVariantKey(node), weight: 0, route: "" });
  } else if (action === "remove" && variants.length > 2) {
    variants.splice(variantIndex, 1);
  }
  renderGraphBuilder();
  syncJsonFromBuilder();
}

function ensureGraphNodeVariants(node) {
  node.variants = normalizedGraphNodeVariants(node);
  return node.variants;
}

function normalizedGraphNodeVariants(node = {}) {
  const source = Array.isArray(node.variants) && node.variants.length
    ? node.variants
    : [
      { key: "control", weight: 50, route: "" },
      { key: "variant_a", weight: 50, route: "" }
    ];
  return source.map((variant, index) => ({
    key: slug(variant.key || variant.id || variant.name || `variant_${index + 1}`) || `variant_${index + 1}`,
    weight: Number.isFinite(Number(variant.weight)) ? Number(variant.weight) : 0,
    route: variant.route || variant.next || ""
  }));
}

function uniqueGraphVariantKey(node) {
  const keys = new Set(normalizedGraphNodeVariants(node).map((variant) => variant.key));
  for (let index = 1; index < 100; index += 1) {
    const key = `variant_${index}`;
    if (!keys.has(key)) return key;
  }
  return `variant_${Date.now()}`;
}

function applyGraphNodeHelpers(node, field) {
  if (node.type === "lookup" && field === "table") {
    const table = lookupTableById(node.table);
    const column = firstLookupValueColumn(table);
    if (column && !node.column) node.column = column;
    if (table && (!node.key_expression || node.key_expression === "\"\"")) node.key_expression = defaultLookupKeyExpression(table, {});
  }
  if (node.type === "frequency_cap" && field === "message_id") {
    const message = cachedMessages.find((item) => item.id === node.message_id);
    if (message?.surface && !node.surface) node.surface = message.surface;
  }
}

function graphDatalist(id, values) {
  const unique = [...new Set((values || []).filter((value) => value != null && String(value).trim() !== "").map(String))];
  return `<datalist id="${escapeHtml(id)}">${unique.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("")}</datalist>`;
}

function graphLookupExpressionSuggestions(node) {
  const table = lookupTableById(node.table);
  const tableKey = table?.key_column;
  return [
    ...(tableKey ? [`attribute("${tableKey}")`, `context("${tableKey}")`] : []),
    ...schemaItemsForSource("attribute").slice(0, 25).map((item) => `attribute("${item.name}")`),
    ...schemaItemsForSource("context").slice(0, 25).map((item) => `context("${item.name}")`)
  ];
}

function graphSurfaceSuggestions() {
  return [
    ...cachedMessages.map((item) => item.surface),
    ...cachedRuleSets.map((item) => item.surface)
  ];
}

function addGraphNode(type = "condition") {
  const id = uniqueGraphNodeId(type);
  const node = graphNodeDefaults(type, id);
  const layout = graphCanvasLayout();
  node.layout = {
    x: snapGraphCoordinate(Math.min(layout.width - layout.nodeWidth - 24, Math.max(24, (ruleGraph?.querySelector(".graph-canvas-shell")?.scrollLeft || 0) + 80))),
    y: snapGraphCoordinate(Math.min(layout.height - layout.nodeHeight - 24, Math.max(24, (ruleGraph?.querySelector(".graph-canvas-shell")?.scrollTop || 0) + 80)))
  };
  graphBuilder.nodes.push(node);
  if (!graphBuilder.entry) graphBuilder.entry = id;
  selectedGraphNodeId = id;
  renderGraphBuilder();
  syncJsonFromBuilder();
}

function openGraphNodePicker() {
  if (!graphNodePicker) return;
  renderGraphNodePicker();
  graphNodePicker.hidden = false;
  graphNodePickerSearch?.focus();
}

function closeGraphNodePicker() {
  if (!graphNodePicker) return;
  graphNodePicker.hidden = true;
  if (graphNodePickerSearch) graphNodePickerSearch.value = "";
}

function renderGraphNodePicker() {
  if (!graphNodePickerList) return;
  const query = String(graphNodePickerSearch?.value || "").trim().toLowerCase();
  const groups = graphNodePickerCatalog()
    .map((group) => ({
      ...group,
      nodes: group.nodes.filter((node) => [node.type, node.label, node.description, group.label].join(" ").toLowerCase().includes(query))
    }))
    .filter((group) => group.nodes.length);
  graphNodePickerList.innerHTML = groups.map((group) => `
    <section class="graph-node-picker-group">
      <h4>${escapeHtml(group.label)}</h4>
      <div>
        ${group.nodes.map((node) => `
          <button type="button" data-node-picker-type="${escapeHtml(node.type)}">
            <span>${escapeHtml(node.icon)}</span>
            <strong>${escapeHtml(node.label)}</strong>
            <em>${escapeHtml(node.description)}</em>
          </button>
        `).join("")}
      </div>
    </section>
  `).join("") || '<div class="status-line">No matching nodes.</div>';
  graphNodePickerList.querySelectorAll("[data-node-picker-type]").forEach((button) => {
    button.addEventListener("click", () => {
      addGraphNode(button.dataset.nodePickerType || "condition");
      closeGraphNodePicker();
    });
  });
}

function graphNodePickerCatalog() {
  return [
    {
      label: "Logic",
      nodes: [
        { type: "condition", label: "Condition split", icon: "?", description: "Route a profile by an expression such as attribute or context checks." },
        { type: "score", label: "Score", icon: "+", description: "Calculate a reusable score from weighted rules." },
        { type: "lookup", label: "Reference lookup", icon: "L", description: "Read a value from Reference Data and store it as context." }
      ]
    },
    {
      label: "Eligibility",
      nodes: [
        { type: "frequency_cap", label: "Frequency cap", icon: "F", description: "Suppress or route profiles after recent client events." }
      ]
    },
    {
      label: "Experimentation",
      nodes: [
        { type: "experiment_split", label: "Experiment split", icon: "A/B", description: "Assign profiles to A/B, multivariant, or bandit-ready weighted variants." }
      ]
    },
    {
      label: "Decision output",
      nodes: [
        { type: "output", label: "Output", icon: "O", description: "Return an eligible, deferred, or suppressed decision payload." },
        { type: "fallback", label: "Fallback", icon: "!", description: "Terminal fallback result for incomplete or failed routing." },
        { type: "error", label: "Error", icon: "X", description: "Explicit terminal error result for guarded graph paths." }
      ]
    }
  ];
}

function starterGraphBuilder() {
  return {
    entry: "input",
    nodes: [
      { id: "input", type: "input", next: "condition" },
      { id: "condition", type: "condition", expression: "attribute(\"lead_score\") >= 50", true: "eligible", false: "fallback" },
      { id: "eligible", type: "output", result: "eligible", outputs: {} },
      { id: "fallback", type: "output", result: "deferred", outputs: {} }
    ]
  };
}

function graphNodeDefaults(type, id) {
  const base = { id, type };
  if (type === "input") return { ...base, next: "" };
  if (type === "condition") return { ...base, expression: "attribute(\"lead_score\") >= 50", true: "", false: "" };
  if (type === "score") return { ...base, label: id, rules: [], next: "" };
  if (type === "lookup") {
    const table = preferredLookupTable();
    return {
      ...base,
      table: table?.id || "",
      key_expression: defaultLookupKeyExpression(table, {}) || "\"\"",
      column: firstLookupValueColumn(table) || "",
      output_key: id,
      next: ""
    };
  }
  if (type === "frequency_cap") {
    const message = cachedMessages.find((item) => item.status !== "archived") || cachedMessages[0];
    return {
      ...base,
      event_type: "impression",
      max: 3,
      window_days: 7,
      decision_key: "",
      message_id: message?.id || "",
      surface: message?.surface || "",
      next: "",
      capped: ""
    };
  }
  if (type === "experiment_split") {
    return {
      ...base,
      experiment_key: id,
      mode: "fixed",
      unit: "profile",
      output_key: "variant_key",
      variants: [
        { key: "control", weight: 50, route: "" },
        { key: "variant_a", weight: 50, route: "" }
      ],
      fallback: ""
    };
  }
  return { ...base, result: type === "fallback" ? "deferred" : "eligible", outputs: {} };
}

function graphNodeTypes() {
  return ["input", "condition", "score", "lookup", "frequency_cap", "experiment_split", "output", "fallback", "error"];
}

function graphNodeTypeLabel(type) {
  return {
    input: "Input",
    condition: "Condition",
    score: "Score",
    lookup: "Reference lookup",
    frequency_cap: "Frequency cap",
    experiment_split: "Experiment split",
    output: "Output",
    fallback: "Fallback",
    error: "Error"
  }[type] || type;
}

function graphNodeTypeClass(type = "") {
  return String(type || "node").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

function uniqueGraphNodeId(type) {
  const ids = new Set((graphBuilder.nodes || []).map((node) => node.id));
  const base = slug(type || "node");
  for (let index = 1; index < 100; index += 1) {
    const id = `${base}_${index}`;
    if (!ids.has(id)) return id;
  }
  return `${base}_${Date.now()}`;
}

function graphNodeEdges(node) {
  return graphNodeEdgesDetailed(node).map((edge) => edge.target);
}

function graphNodeEdgesDetailed(node) {
  const variantEdges = node.type === "experiment_split"
    ? normalizedGraphNodeVariants(node).map((variant) => ({ label: variant.key, target: variant.route }))
    : [];
  return [
    ...variantEdges,
    ...["next", "true", "false", "capped", "fallback"]
    .map((field) => ({ label: graphEdgeLabel(field), target: node[field] }))
  ]
    .filter((edge) => edge.target)
    .filter((edge, index, array) => array.findIndex((item) => item.target === edge.target && item.label === edge.label) === index);
}

function graphEdgeLabel(field) {
  return {
    next: "next",
    true: "true",
    false: "false",
    capped: "capped",
    fallback: "fallback"
  }[field] || field;
}

function graphNodeSummary(node) {
  if (node.type === "condition") return node.expression || "No expression";
  if (node.type === "score") return `${(node.rules || []).length} scoring rule${(node.rules || []).length === 1 ? "" : "s"}`;
  if (node.type === "lookup") return [node.table, node.column].filter(Boolean).join(" / ") || "Reference lookup";
  if (node.type === "frequency_cap") return `Max ${node.max || 0} in ${node.window_days || 0} days`;
  if (node.type === "experiment_split") return `${normalizedGraphNodeVariants(node).length} variants / ${node.mode || "fixed"}`;
  if (["output", "fallback", "error"].includes(node.type)) return node.result || "deferred";
  return "Defaults and routing";
}

function graphReachabilitySummary() {
  const nodes = new Map((graphBuilder.nodes || []).map((node) => [node.id, node]));
  const visited = new Set();
  const stack = [graphBuilder.entry];
  while (stack.length) {
    const id = stack.pop();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    const node = nodes.get(id);
    if (!node) continue;
    stack.push(...graphNodeEdges(node));
  }
  const unreachable = (graphBuilder.nodes || []).filter((node) => !visited.has(node.id)).length;
  return unreachable ? `${unreachable} unreachable` : "All reachable";
}

function graphFromBuilder() {
  return {
    graph: {
      entry: graphBuilder.entry || "input",
      nodes: (graphBuilder.nodes || []).map((node) => cleanGraphNode(node))
    }
  };
}

function cleanGraphNode(node) {
  const copy = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === "" || value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    copy[key] = value;
  }
  return copy;
}

function bindLookupOutputHelper(node, branchIndex) {
  const branch = builderBranches[branchIndex];
  const targetInput = node.querySelector("[data-helper='target']");
  const tableInput = node.querySelector("[data-helper='table']");
  const keyInput = node.querySelector("[data-helper='key']");
  const columnInput = node.querySelector("[data-helper='column']");
  const outputs = parseJsonSafe(branch.outputs || "{}");
  const existingLookup = firstLookupOutput(outputs);
  const defaultTable = existingLookup?.table || preferredLookupTable()?.id || "";
  const table = lookupTableById(defaultTable);
  const defaultColumn = existingLookup?.column || firstLookupValueColumn(table) || "";
  targetInput.value = existingLookup?.target || defaultColumn;
  tableInput.value = defaultTable;
  keyInput.value = existingLookup?.keyExpression || defaultLookupKeyExpression(table, outputs);
  columnInput.value = defaultColumn;
  attachLookupDatalist(tableInput, "lookup-table-options", cachedLookupTables.map((item) => item.id));
  setLookupColumnDatalist(columnInput, table);
  tableInput.addEventListener("input", () => {
    const nextTable = lookupTableById(tableInput.value.trim());
    setLookupColumnDatalist(columnInput, nextTable);
    const nextColumn = firstLookupValueColumn(nextTable);
    if (nextColumn) {
      columnInput.value = nextColumn;
      if (!targetInput.value || targetInput.value === columnInput.defaultValue) targetInput.value = nextColumn;
    }
    const nextKeyExpression = defaultLookupKeyExpression(nextTable, outputs);
    if (nextKeyExpression) keyInput.placeholder = nextKeyExpression;
  });
  node.querySelector("[data-action='apply-lookup-output']").addEventListener("click", () => {
    try {
      const target = slug(targetInput.value || columnInput.value);
      const table = tableInput.value.trim();
      const keyExpression = keyInput.value.trim();
      const column = columnInput.value.trim();
      if (!target || !table || !keyExpression || !column) throw new Error("Reference data output needs target, table, key expression, and returned field");
      const nextOutputs = parseJsonField(null, `Outputs for ${branch.id || `branch_${branchIndex + 1}`}`, branch.outputs || "{}");
      nextOutputs[target] = `=lookup(${JSON.stringify(table)}, ${keyExpression}, ${JSON.stringify(column)})`;
      branch.outputs = JSON.stringify(nextOutputs);
      renderBranchEditor();
      syncJsonFromBuilder();
    } catch (error) {
      editorOutput.textContent = error.message;
    }
  });
}

function bindTtlOutputHelper(node, branchIndex) {
  const branch = builderBranches[branchIndex];
  const ttlInput = node.querySelector("[data-helper='ttl-seconds']");
  const expiresInput = node.querySelector("[data-helper='expires-at']");
  const outputs = parseJsonSafe(branch.outputs || "{}");
  ttlInput.value = outputs.ttl_seconds || "";
  expiresInput.value = outputs.expires_at ? toDateTimeLocal(outputs.expires_at) : "";
  node.querySelector("[data-action='apply-ttl-output']").addEventListener("click", () => {
    const nextOutputs = parseJsonSafe(branch.outputs || "{}");
    const ttl = Number(ttlInput.value || 0);
    if (Number.isFinite(ttl) && ttl > 0) nextOutputs.ttl_seconds = ttl;
    else delete nextOutputs.ttl_seconds;
    if (expiresInput.value) nextOutputs.expires_at = new Date(expiresInput.value).toISOString();
    else delete nextOutputs.expires_at;
    branch.outputs = JSON.stringify(nextOutputs);
    renderBranchEditor();
    syncJsonFromBuilder();
  });
  node.querySelector("[data-action='clear-ttl-output']").addEventListener("click", () => {
    const nextOutputs = parseJsonSafe(branch.outputs || "{}");
    delete nextOutputs.ttl_seconds;
    delete nextOutputs.expires_at;
    branch.outputs = JSON.stringify(nextOutputs);
    renderBranchEditor();
    syncJsonFromBuilder();
  });
}

function toDateTimeLocal(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function firstLookupOutput(outputs) {
  for (const [target, value] of Object.entries(outputs || {})) {
    if (typeof value !== "string") continue;
    const match = value.match(/^=lookup\("([^"]+)",\s*(.+),\s*"([^"]+)"\)$/);
    if (match) return { target, table: match[1], keyExpression: match[2].trim(), column: match[3] };
  }
  return null;
}

function preferredLookupTable() {
  return cachedLookupTables[0] || null;
}

function lookupTableById(id) {
  return cachedLookupTables.find((item) => item.id === id) || null;
}

function lookupColumns(table) {
  if (!table) return [];
  return [...new Set((table.rows || []).flatMap((rowItem) => Object.keys(rowItem || {})))];
}

function firstLookupValueColumn(table) {
  const columns = lookupColumns(table);
  return columns.find((column) => column !== table?.key_column) || columns[0] || "";
}

function defaultLookupKeyExpression(table, outputs) {
  if (table?.key_column && outputs[table.key_column] != null) return `outputs.${table.key_column}`;
  if (table?.rows?.[0]?.[table.key_column] != null) return JSON.stringify(table.rows[0][table.key_column]);
  return table?.key_column ? `attributes.${table.key_column}` : "";
}

function attachLookupDatalist(input, id, values) {
  const list = document.createElement("datalist");
  list.id = `${id}-${Math.random().toString(16).slice(2)}`;
  list.innerHTML = values.map((value) => `<option value="${escapeHtml(String(value))}"></option>`).join("");
  input.setAttribute("list", list.id);
  input.after(list);
}

function setLookupColumnDatalist(input, table) {
  input.nextElementSibling?.matches("datalist[data-lookup-columns='true']") && input.nextElementSibling.remove();
  const columns = lookupColumns(table);
  const list = document.createElement("datalist");
  list.dataset.lookupColumns = "true";
  list.id = `lookup-column-options-${Math.random().toString(16).slice(2)}`;
  list.innerHTML = columns.map((value) => `<option value="${escapeHtml(String(value))}"></option>`).join("");
  input.setAttribute("list", list.id);
  input.after(list);
}

function bindBranchField(node, branchIndex, field) {
  const input = node.querySelector(`[data-field='${field}']`);
  input.value = builderBranches[branchIndex][field] || "";
  input.addEventListener("input", () => {
    builderBranches[branchIndex][field] = input.value;
    syncJsonFromBuilder();
  });
  input.addEventListener("change", syncJsonFromBuilder);
}

function bindConditionField(node, branchIndex, conditionIndex, field) {
  const input = node.querySelector(`[data-field='${field}']`);
  input.value = builderBranches[branchIndex].conditions[conditionIndex][field] ?? "";
  input.addEventListener("input", () => {
    builderBranches[branchIndex].conditions[conditionIndex][field] = input.value;
    if (field === "source") {
      builderBranches[branchIndex].conditions[conditionIndex].key = "";
      renderBranchEditor();
    }
    if (field === "value_source_source") {
      builderBranches[branchIndex].conditions[conditionIndex].value_source_key = "";
      renderBranchEditor();
    }
    if (field === "compare_mode") renderConditionCompareMode(node, builderBranches[branchIndex].conditions[conditionIndex]);
    renderConditionGuidance(node, builderBranches[branchIndex].conditions[conditionIndex]);
    refreshBranchSummary(branchIndex);
    syncJsonFromBuilder();
  });
  input.addEventListener("change", () => {
    if (["source", "value_source_source", "compare_mode"].includes(field)) renderBranchEditor();
    renderConditionGuidance(node, builderBranches[branchIndex].conditions[conditionIndex]);
    refreshBranchSummary(branchIndex);
    syncJsonFromBuilder();
  });
}

function refreshBranchSummary(branchIndex) {
  const node = branchEditor.querySelector(`[data-branch-index="${branchIndex}"]`);
  if (node) bindBranchSummary(node, branchIndex);
}

function bindSchemaKeySuggestions(node, branchIndex, conditionIndex) {
  const keyInput = node.querySelector("[data-field='key']");
  const source = builderBranches[branchIndex].conditions[conditionIndex].source || "attribute";
  const items = schemaItemsForSource(source);
  if (!items.length) {
    keyInput.removeAttribute("list");
    return;
  }
  const list = document.createElement("datalist");
  list.id = `schema-options-${branchIndex}-${conditionIndex}`;
  list.innerHTML = items
    .map((item) => `<option value="${escapeHtml(item.name)}" label="${escapeHtml([item.type, item.dimension].filter(Boolean).join(" / "))}"></option>`)
    .join("");
  keyInput.setAttribute("list", list.id);
  keyInput.after(list);
}

function bindValueSourceSuggestions(node, branchIndex, conditionIndex) {
  const keyInput = node.querySelector("[data-field='value_source_key']");
  const source = builderBranches[branchIndex].conditions[conditionIndex].value_source_source || "attribute";
  const items = schemaItemsForSource(source);
  if (!items.length) {
    keyInput.removeAttribute("list");
    return;
  }
  const list = document.createElement("datalist");
  list.id = `value-source-options-${branchIndex}-${conditionIndex}`;
  list.innerHTML = items
    .map((item) => `<option value="${escapeHtml(item.name)}" label="${escapeHtml([item.type, item.dimension].filter(Boolean).join(" / "))}"></option>`)
    .join("");
  keyInput.setAttribute("list", list.id);
  keyInput.after(list);
}

function renderConditionCompareMode(node, condition) {
  const mode = condition.compare_mode || "value";
  node.classList.toggle("field-mode", mode === "field");
  node.classList.toggle("value-mode", mode !== "field");
}

function renderConditionGuidance(node, condition) {
  const target = node.querySelector("[data-role='condition-guidance']");
  if (!target) return;
  const schema = conditionSchemaStatus(condition.source, condition.key);
  const compareSchema = condition.compare_mode === "field"
    ? conditionSchemaStatus(condition.value_source_source, condition.value_source_key)
    : null;
  const chips = [
    schemaChipHtml(schema),
    compareSchema ? schemaChipHtml(compareSchema, "Compare field") : ""
  ].filter(Boolean).join("");
  target.innerHTML = `
    <div class="condition-readable">${escapeHtml(conditionReadableText(condition))}</div>
    <div class="condition-schema-hints">${chips}</div>
  `;
}

function syncJsonFromBuilder() {
  clearInvalid();
  try {
    const draft = document.querySelector("#builder-mode").value === "graph" ? graphFromBuilder() : draftFromBuilder();
    validateDraft(draft);
    document.querySelector("#rule-draft").value = JSON.stringify(draft, null, 2);
    renderRuleGraph();
    renderRuleInspector();
    editorOutput.textContent = `Draft synced${formatSchemaWarnings(schemaReferenceWarnings(draft))}`;
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function syncBuilderFromJson() {
  clearInvalid();
  try {
    const draft = JSON.parse(document.querySelector("#rule-draft").value);
    validateDraft(draft);
    if (draft.graph) {
      document.querySelector("#builder-mode").value = "graph";
      graphBuilder = {
        entry: draft.graph.entry || "input",
        nodes: (draft.graph.nodes || []).map((node) => ({ ...node }))
      };
      selectedGraphNodeId = graphBuilder.entry || graphBuilder.nodes[0]?.id || "";
      renderBuilderMode();
    } else {
      document.querySelector("#builder-mode").value = "branches";
      document.querySelector("#fallback-result").value = draft.fallback?.result || "deferred";
      document.querySelector("#fallback-outputs").value = JSON.stringify(draft.fallback?.outputs || {});
      builderBranches = (draft.branches || []).map((branch, index) => branchToBuilder(branch, index));
      if (builderBranches.length === 0) builderBranches = [newBranch(1)];
      renderBranchEditor();
      renderBuilderMode();
    }
    renderRuleInspector();
    editorOutput.textContent = "Builder synced";
  } catch (error) {
    editorOutput.textContent = error.message;
  }
}

function draftFromBuilder() {
  return {
    fallback: {
      result: document.querySelector("#fallback-result").value.trim() || "deferred",
      outputs: parseJsonField(document.querySelector("#fallback-outputs"), "Fallback outputs")
    },
    branches: builderBranches.map((branch, index) => {
      const conditions = branch.conditions.map(conditionFromBuilder);
      const when = conditions.length === 1 ? conditions[0] : { [branch.logic || "all"]: conditions };
      return {
        id: slug(branch.id || `branch_${index + 1}`),
        label: branch.id || `Branch ${index + 1}`,
        when,
        result: branch.result || "eligible",
        outputs: parseJsonField(null, `Outputs for ${branch.id || `branch_${index + 1}`}`, branch.outputs || "{}")
      };
    })
  };
}

function conditionFromBuilder(condition) {
  const output = {
    source: condition.source || "attribute",
    key: condition.key || "",
    operator: condition.operator || "equals"
  };
  if (!["is_blank", "is_not_blank"].includes(output.operator)) {
    if (condition.compare_mode === "field") {
      output.value_source = {
        source: condition.value_source_source || "attribute",
        key: condition.value_source_key || ""
      };
    } else {
      output.value = condition.operator === "in" || condition.operator === "not_in"
        ? String(condition.value || "").split(",").map((item) => parseLiteral(item.trim()))
        : parseLiteral(String(condition.value ?? "").trim());
    }
  }
  return output;
}

function branchToBuilder(branch, index) {
  const group = branch.when?.all ? "all" : branch.when?.any ? "any" : "all";
  const conditions = branch.when?.all || branch.when?.any || (branch.when ? [branch.when] : []);
  return {
    id: branch.id || `branch_${index + 1}`,
    result: branch.result || "eligible",
    outputs: JSON.stringify(branch.outputs || {}),
    logic: group,
    conditions: conditions.map((condition) => ({
      source: condition.source || "attribute",
      key: condition.key || "",
      operator: condition.operator || "equals",
      value: Array.isArray(condition.value) ? condition.value.join(", ") : condition.value ?? "",
      compare_mode: condition.value_source ? "field" : "value",
      value_source_source: condition.value_source?.source || "attribute",
      value_source_key: condition.value_source?.key || ""
    }))
  };
}

function validateDraft(draft) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw new Error("Draft must be a JSON object");
  if (draft.graph) {
    validateGraphDraft(draft.graph);
    return;
  }
  if (!Array.isArray(draft.branches)) throw new Error("Draft must include a branches array");
  if (draft.branches.length === 0) throw new Error("Draft needs at least one branch");
  draft.branches.forEach((branch, index) => {
    if (!branch.id) throw new Error(`Branch ${index + 1} needs an ID`);
    if (!branch.result) throw new Error(`Branch ${branch.id} needs a result`);
    validateConditionGroup(branch.when, `Branch ${branch.id}`, 1);
  });
}

function validateGraphDraft(graph) {
  if (!graph || typeof graph !== "object" || Array.isArray(graph)) throw new Error("Graph must be a JSON object");
  const errors = graphReadinessChecks(graph).filter((check) => check.level === "error");
  if (errors.length) throw new Error(errors[0].detail || errors[0].title || "Graph has validation errors");
}

function validateConditionGroup(group, label, depth) {
  if (!group || typeof group !== "object" || Array.isArray(group)) throw new Error(`${label} needs a condition`);
  if (depth > 3) throw new Error(`${label} exceeds 3 condition levels`);
  if (group.all || group.any) {
    const children = group.all || group.any;
    if (!Array.isArray(children) || children.length === 0) throw new Error(`${label} has an empty condition group`);
    children.forEach((child) => validateConditionGroup(child, label, depth + 1));
    return;
  }
  if (!group.source || !group.key || !group.operator) throw new Error(`${label} has an incomplete condition`);
  if (group.value_source && (!group.value_source.source || !group.value_source.key)) {
    throw new Error(`${label} has an incomplete compare field`);
  }
}

function schemaItemsForSource(source) {
  const kind = source === "attribute" ? "attribute" : source === "segment" ? "segment" : source === "context" ? "context" : null;
  return kind ? cachedSchema.filter((item) => item.kind === kind) : [];
}

function schemaItemForSource(source, key) {
  if (!key) return null;
  return schemaItemsForSource(source).find((item) => item.name === key) || null;
}

function conditionReadableText(condition) {
  const source = condition.source || "attribute";
  const key = condition.key || "";
  const field = schemaDisplayName(source, key);
  const operator = condition.operator || "equals";
  const operatorText = conditionOperatorText(operator);
  if (!key) return `${sourceLabel(source)} field is not selected`;
  if (["is_blank", "is_not_blank"].includes(operator)) return `${field} ${operatorText}`;
  const value = condition.compare_mode === "field"
    ? schemaDisplayName(condition.value_source_source || "attribute", condition.value_source_key || "")
    : conditionValueText(condition);
  return `${field} ${operatorText} ${value || "(empty)"}`;
}

function schemaDisplayName(source, key) {
  if (!key) return `${sourceLabel(source)} field`;
  const item = schemaItemForSource(source, key);
  const label = item?.raw?.name || item?.raw?.label || item?.raw?.display_name || item?.dimension || "";
  const display = label && label !== "value" && label !== "audience" ? label : humanizeKey(key);
  return `${display} (${sourceLabel(source)})`;
}

function conditionValueText(condition) {
  const operator = condition.operator || "equals";
  const raw = String(condition.value ?? "").trim();
  if (["in", "not_in"].includes(operator)) {
    const values = raw.split(",").map((item) => item.trim()).filter(Boolean);
    return values.length ? values.join(", ") : "(empty list)";
  }
  return raw;
}

function conditionOperatorText(operator) {
  const labels = {
    equals: "is",
    not_equals: "is not",
    greater_than: "is greater than",
    greater_than_or_equal: "is at least",
    less_than: "is less than",
    less_than_or_equal: "is at most",
    in: "is one of",
    not_in: "is not one of",
    contains: "contains",
    not_contains: "does not contain",
    is_blank: "is blank",
    is_not_blank: "is not blank",
    matches_regex: "matches pattern",
    within_last_days: "was seen within the last days",
    before_date: "is before",
    after_date: "is after"
  };
  return labels[operator] || operator.replaceAll("_", " ");
}

function sourceLabel(source) {
  if (source === "segment") return "Segment";
  if (source === "context") return "Context";
  return "Attribute";
}

function humanizeKey(key) {
  return String(key || "")
    .replace(/^identifier\./, "")
    .replace(/^event\./, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function conditionSchemaStatus(source, key) {
  const items = schemaItemsForSource(source);
  const item = schemaItemForSource(source, key);
  if (!key) {
    return {
      state: "empty",
      label: `${sourceLabel(source)} not selected`,
      detail: items.length ? `${items.length} synced options available` : "No synced schema options"
    };
  }
  if (!items.length) {
    return {
      state: "unknown",
      label: `${sourceLabel(source)} schema not synced`,
      detail: key
    };
  }
  if (!item) {
    return {
      state: "warn",
      label: "Not in synced schema",
      detail: `${sourceLabel(source)} ${key}`
    };
  }
  return {
    state: "ok",
    label: `Known ${sourceLabel(source)}`,
    detail: [item.type, item.dimension, item.source].filter(Boolean).join(" · ") || item.name
  };
}

function schemaChipHtml(status, prefix = "") {
  const label = prefix ? `${prefix}: ${status.label}` : status.label;
  return `
    <span class="condition-schema-chip ${escapeHtml(status.state)}">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(status.detail)}</span>
    </span>
  `;
}

function schemaReferenceWarnings(draft) {
  if (!draft || draft.graph) return [];
  const warnings = [];
  for (const branch of draft.branches || []) collectSchemaWarnings(branch.when, branch.id || branch.label || "branch", warnings);
  return [...new Set(warnings)];
}

function collectSchemaWarnings(group, label, warnings) {
  if (!group || typeof group !== "object" || Array.isArray(group)) return;
  for (const key of ["all", "any"]) {
    if (Array.isArray(group[key])) {
      group[key].forEach((child) => collectSchemaWarnings(child, label, warnings));
      return;
    }
  }
  if (group.not) {
    collectSchemaWarnings(group.not, label, warnings);
    return;
  }
  if (group.expression) return;
  const items = schemaItemsForSource(group.source);
  if (items.length && !items.some((item) => item.name === group.key)) {
    warnings.push(`${label}: ${group.source}.${group.key || "(empty)"} is not in cached schema`);
  }
  if (group.value_source) {
    const valueItems = schemaItemsForSource(group.value_source.source);
    if (valueItems.length && !valueItems.some((item) => item.name === group.value_source.key)) {
      warnings.push(`${label}: ${group.value_source.source}.${group.value_source.key || "(empty)"} is not in cached schema`);
    }
  }
}

function formatSchemaWarnings(warnings) {
  return warnings.length ? `\n\nSchema warnings:\n${warnings.map((item) => `- ${item}`).join("\n")}` : "";
}

function clearInvalid() {
  document.querySelectorAll(".invalid").forEach((item) => item.classList.remove("invalid"));
}

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "branch";
}

function openLookupDetail() {
  if (!lookupDetailPanel) return;
  lookupDetailPanel.hidden = false;
  lookupDetailPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function newLookup(options = {}) {
  selectedLookupId = null;
  selectedLookupMetadata = defaultLookupMetadata();
  document.querySelector("#lookup-id").value = "reference_table";
  document.querySelector("#lookup-id").disabled = false;
  document.querySelector("#lookup-name").value = "Reference Table";
  document.querySelector("#lookup-key-column").value = "key";
  document.querySelector("#lookup-rows").value = JSON.stringify(
    [
      { key: "A", label: "Segment A", priority: 80 },
      { key: "B", label: "Segment B", priority: 40 }
    ],
    null,
    2
  );
  renderLookupValidationRules();
  renderReferenceGrid();
  document.querySelector("#lookup-csv").value = "";
  loadLookupVersions(null);
  renderLookupInspector();
  lookupOutput.textContent = "Ready for a new reference table";
  if (!options.silent) openLookupDetail();
}

function referenceRowsFromJson() {
  const rowsInput = document.querySelector("#lookup-rows");
  try {
    const rows = JSON.parse(rowsInput.value || "[]");
    if (!Array.isArray(rows)) throw new Error("Rows JSON must be an array");
    return rows.map((rowItem) => rowItem && typeof rowItem === "object" && !Array.isArray(rowItem) ? rowItem : {});
  } catch (error) {
    rowsInput.classList.add("invalid");
    throw error;
  }
}

function referenceColumns(rows = referenceRowsFromJson()) {
  return referenceColumnsFromRows(rows);
}

function referenceColumnsFromRows(rows) {
  const keyColumn = document.querySelector("#lookup-key-column").value.trim() || "key";
  const discovered = [...new Set((rows || []).flatMap((rowItem) => Object.keys(rowItem || {})))];
  return [keyColumn, ...discovered.filter((column) => column !== keyColumn)];
}

function renderReferenceGrid() {
  clearInvalid();
  let rows;
  try {
    rows = referenceRowsFromJson();
  } catch (error) {
    referenceGrid.innerHTML = `<div class="grid-empty">${escapeHtml(error.message)}</div>`;
    return;
  }
  const columns = referenceColumns(rows);
  const headerCells = columns
    .map((column) => `
      <div class="reference-header-cell">
        <input data-column-name="${escapeHtml(column)}" value="${escapeHtml(column)}" />
        <button type="button" data-remove-column="${escapeHtml(column)}">Remove</button>
      </div>
    `)
    .join("");
  const bodyRows = rows
    .map((rowItem, rowIndex) => `
      <div class="reference-grid-row">
        ${columns.map((column) => `
          <input data-row-index="${rowIndex}" data-column="${escapeHtml(column)}" value="${escapeHtml(formatReferenceCell(rowItem[column]))}" />
        `).join("")}
        <button type="button" data-remove-row="${rowIndex}">Remove</button>
      </div>
    `)
    .join("");
  referenceGrid.style.setProperty("--reference-columns", `repeat(${Math.max(columns.length, 1)}, minmax(130px, 1fr)) 82px`);
  referenceGrid.innerHTML = `
    <div class="reference-grid-row header-row">${headerCells}<div></div></div>
    ${bodyRows || `<div class="grid-empty">No rows yet. Add a row or paste CSV.</div>`}
  `;
  referenceGrid.querySelectorAll("[data-row-index]").forEach((input) => {
    input.addEventListener("input", syncReferenceJsonFromGrid);
  });
  referenceGrid.querySelectorAll("[data-column-name]").forEach((input) => {
    input.addEventListener("change", renameReferenceColumn);
  });
  referenceGrid.querySelectorAll("[data-remove-row]").forEach((button) => {
    button.addEventListener("click", () => removeReferenceRow(Number(button.dataset.removeRow)));
  });
  referenceGrid.querySelectorAll("[data-remove-column]").forEach((button) => {
    button.addEventListener("click", () => removeReferenceColumn(button.dataset.removeColumn));
  });
  renderLookupValidationRules(columns);
  renderLookupInspector(rows);
}

function renderLookupInspector(rows = null) {
  if (!lookupInspectorSummary) return;
  let currentRows = rows;
  try {
    currentRows = currentRows || referenceRowsFromJson();
  } catch {
    currentRows = [];
  }
  const columns = referenceColumnsFromRows(currentRows);
  const keyColumn = document.querySelector("#lookup-key-column").value.trim() || "key";
  const tableId = document.querySelector("#lookup-id").value.trim() || "reference_table";
  const firstReturnColumn = columns.find((column) => column !== keyColumn) || keyColumn;
  lookupInspectorSummary.innerHTML = [
    statusItem("Rows", formatNumber(currentRows.length)),
    statusItem("Columns", formatNumber(columns.length)),
    statusItem("Match column", keyColumn),
    statusItem("Version", selectedLookupId ? "current" : "new")
  ].join("");
  lookupHelpTable.textContent = tableId;
  lookupHelpKey.textContent = keyColumn;
  lookupHelpExpression.textContent = `=lookup("${tableId}", attributes.${keyColumn}, "${firstReturnColumn}")`;
  renderLookupValidation(currentRows, columns, keyColumn);
}

function renderLookupValidationFromCurrentRows() {
  let rows = [];
  try {
    rows = referenceRowsFromJson();
  } catch {
    rows = [];
  }
  renderLookupValidation(rows, referenceColumnsFromRows(rows), document.querySelector("#lookup-key-column").value.trim() || "key");
}

function renderLookupValidation(rows, columns, keyColumn) {
  if (!lookupValidationSummary) return;
  const checks = validateLookupColumns(rows, columns, keyColumn, readLookupValidationMetadata());
  lookupValidationSummary.innerHTML = checks
    .map((check) => `
      <div class="lookup-validation-item ${escapeHtml(check.level)}">
        <strong>${escapeHtml(check.title)}</strong>
        <span>${escapeHtml(check.detail)}</span>
      </div>
    `)
    .join("");
}

function validateLookupColumns(rows, columns, keyColumn, validation = defaultLookupValidation()) {
  if (!rows.length) return [{ level: "warn", title: "No rows", detail: "Add rows or import CSV before using this table in rules." }];
  const checks = [];
  const keyValues = rows.map((rowItem) => rowItem?.[keyColumn]).filter((value) => value !== "" && value != null);
  const duplicateKeys = duplicateValues(keyValues);
  const blankKeyCount = rows.filter((rowItem) => rowItem?.[keyColumn] === "" || rowItem?.[keyColumn] == null).length;
  if (blankKeyCount) checks.push({ level: "warn", title: "Blank match keys", detail: `${formatNumber(blankKeyCount)} row${blankKeyCount === 1 ? "" : "s"} cannot be matched.` });
  if (duplicateKeys.length) checks.push({ level: "warn", title: "Duplicate match keys", detail: duplicateKeys.slice(0, 4).join(", ") });
  for (const column of columns) {
    const values = rows.map((rowItem) => rowItem?.[column]).filter((value) => value !== "" && value != null);
    const missing = rows.length - values.length;
    const types = [...new Set(values.map(referenceValueType))].filter(Boolean);
    if (missing && column !== keyColumn) checks.push({ level: "info", title: `${column} missing values`, detail: `${formatNumber(missing)} row${missing === 1 ? "" : "s"} are blank.` });
    if (types.length > 1) checks.push({ level: "warn", title: `${column} mixed types`, detail: `Contains ${types.join(", ")} values.` });
  }
  for (const rule of validation.rules || []) {
    const column = rule.column;
    if (!column || !columns.includes(column)) {
      checks.push({ level: "warn", title: "Validation column missing", detail: column ? `${column} is not present in this table.` : "A validation rule has no target column." });
      continue;
    }
    const values = rows.map((rowItem) => rowItem?.[column]).filter((value) => value !== "" && value != null);
    const missing = rows.length - values.length;
    const duplicates = rule.unique ? duplicateValues(values) : [];
    const wrongTypes = values.filter((value) => !lookupValueMatchesType(value, rule.type));
    if (rule.required && missing) checks.push({ level: "warn", title: `${column} required`, detail: `${formatNumber(missing)} row${missing === 1 ? "" : "s"} violate the required rule.` });
    if (rule.unique && duplicates.length) checks.push({ level: "warn", title: `${column} unique`, detail: `Duplicate values: ${duplicates.slice(0, 4).join(", ")}.` });
    if (rule.type && rule.type !== "any" && wrongTypes.length) checks.push({ level: "warn", title: `${column} type`, detail: `${formatNumber(wrongTypes.length)} value${wrongTypes.length === 1 ? "" : "s"} are not ${rule.type}.` });
  }
  if (!checks.length) checks.push({ level: "ok", title: "Ready", detail: "Match keys are unique and populated, with consistent column value types." });
  return checks.slice(0, 8);
}

function defaultLookupMetadata() {
  return { validation: defaultLookupValidation() };
}

function defaultLookupValidation() {
  return { policy: "advisory", rules: [] };
}

function readLookupValidationMetadata() {
  const validation = selectedLookupMetadata.validation || defaultLookupValidation();
  return {
    policy: ["advisory", "warn", "block"].includes(validation.policy) ? validation.policy : "advisory",
    rules: Array.isArray(validation.rules) ? validation.rules.map(normalizeLookupValidationRule).filter((rule) => rule.column || rule.type !== "any" || rule.required || rule.unique) : []
  };
}

function syncLookupValidationMetadata() {
  const policy = document.querySelector("#lookup-validation-policy")?.value || "advisory";
  const rules = lookupValidationRules
    ? [...lookupValidationRules.querySelectorAll("[data-validation-rule-index]")].map((rowNode) => normalizeLookupValidationRule({
        column: rowNode.querySelector("[data-validation-field='column']")?.value,
        type: rowNode.querySelector("[data-validation-field='type']")?.value,
        required: rowNode.querySelector("[data-validation-field='required']")?.checked,
        unique: rowNode.querySelector("[data-validation-field='unique']")?.checked
      }))
    : [];
  selectedLookupMetadata = {
    ...(selectedLookupMetadata || {}),
    validation: {
      policy,
      rules: rules.filter((rule) => rule.column)
    }
  };
}

function renderLookupValidationRules(columns = null) {
  if (!lookupValidationRules) return;
  const validation = readLookupValidationMetadata();
  document.querySelector("#lookup-validation-policy").value = validation.policy;
  const knownColumns = columns || safeReferenceColumns();
  lookupValidationRules.innerHTML = validation.rules.length
    ? validation.rules.map((rule, index) => lookupValidationRuleRow(rule, index, knownColumns)).join("")
    : `<div class="status-line">No saved validation rules. Add a rule to require, type-check, or enforce uniqueness on a column.</div>`;
}

function lookupValidationRuleRow(rule, index, columns) {
  const columnOptions = columns.map((column) => `<option value="${escapeHtml(column)}"${column === rule.column ? " selected" : ""}></option>`).join("");
  return `
    <div class="lookup-validation-rule-row" data-validation-rule-index="${index}">
      <label>
        Column
        <input data-validation-field="column" list="lookup-validation-columns-${index}" value="${escapeHtml(rule.column || "")}" placeholder="column_name" />
        <datalist id="lookup-validation-columns-${index}">${columnOptions}</datalist>
      </label>
      <label>
        Type
        <select data-validation-field="type">
          ${["any", "text", "number", "boolean", "object", "array", "url", "email"].map((type) => `<option value="${type}"${type === rule.type ? " selected" : ""}>${type}</option>`).join("")}
        </select>
      </label>
      <label class="checkbox-label"><input type="checkbox" data-validation-field="required"${rule.required ? " checked" : ""} /> Required</label>
      <label class="checkbox-label"><input type="checkbox" data-validation-field="unique"${rule.unique ? " checked" : ""} /> Unique</label>
      <button type="button" data-remove-validation-rule="${index}">Remove</button>
    </div>
  `;
}

function addLookupValidationRule() {
  syncLookupValidationMetadata();
  const columns = safeReferenceColumns();
  selectedLookupMetadata.validation.rules.push({
    column: columns[0] || document.querySelector("#lookup-key-column").value.trim() || "key",
    type: "any",
    required: true,
    unique: false
  });
  renderLookupValidationRules(columns);
  renderLookupInspector();
}

function handleLookupValidationRulesClick(event) {
  const button = event.target.closest("[data-remove-validation-rule]");
  if (!button) return;
  syncLookupValidationMetadata();
  selectedLookupMetadata.validation.rules.splice(Number(button.dataset.removeValidationRule), 1);
  renderLookupValidationRules();
  renderLookupInspector();
}

function normalizeLookupValidationRule(rule = {}) {
  return {
    column: String(rule.column || "").trim(),
    type: ["any", "text", "number", "boolean", "object", "array", "url", "email"].includes(rule.type) ? rule.type : "any",
    required: Boolean(rule.required),
    unique: Boolean(rule.unique)
  };
}

function safeReferenceColumns() {
  try {
    return referenceColumns(referenceRowsFromJson());
  } catch {
    return [];
  }
}

function lookupValueMatchesType(value, type) {
  if (!type || type === "any") return true;
  if (type === "url") {
    try {
      const parsed = new URL(String(value));
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
  if (type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
  return referenceValueType(value) === type;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    const key = String(value);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  });
  return [...duplicates];
}

function referenceValueType(value) {
  if (Array.isArray(value)) return "array";
  if (value == null) return "";
  if (value instanceof Date) return "date";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object") return "object";
  return "text";
}

function formatReferenceCell(value) {
  if (value == null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function parseReferenceCell(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (!Number.isNaN(Number(trimmed)) && /^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function syncReferenceJsonFromGrid() {
  const rows = [];
  referenceGrid.querySelectorAll(".reference-grid-row:not(.header-row)").forEach((rowNode) => {
    const rowItem = {};
    rowNode.querySelectorAll("[data-column]").forEach((input) => {
      rowItem[input.dataset.column] = parseReferenceCell(input.value);
    });
    if (Object.values(rowItem).some((value) => value !== "")) rows.push(rowItem);
  });
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
  renderLookupInspector(rows);
}

function syncReferenceGridFromJson() {
  renderReferenceGrid();
  lookupOutput.textContent = "Reference grid synced from JSON";
}

function addReferenceRow() {
  const rows = referenceRowsFromJson();
  const columns = referenceColumns(rows);
  rows.push(Object.fromEntries(columns.map((column) => [column, ""])));
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
  renderReferenceGrid();
}

function addReferenceColumn() {
  const rows = referenceRowsFromJson();
  const nextColumn = uniqueColumnName(referenceColumns(rows), "new_field");
  const nextRows = rows.length ? rows.map((rowItem) => ({ ...rowItem, [nextColumn]: "" })) : [{ [document.querySelector("#lookup-key-column").value.trim() || "key"]: "", [nextColumn]: "" }];
  document.querySelector("#lookup-rows").value = JSON.stringify(nextRows, null, 2);
  renderReferenceGrid();
}

function uniqueColumnName(columns, base) {
  if (!columns.includes(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}_${index}`;
    if (!columns.includes(candidate)) return candidate;
  }
  return `${base}_${Date.now()}`;
}

function renameReferenceColumn(event) {
  const oldName = event.target.dataset.columnName;
  const newName = slug(event.target.value || oldName);
  const rows = referenceRowsFromJson().map((rowItem) => {
    if (oldName === newName) return rowItem;
    const next = {};
    for (const [key, value] of Object.entries(rowItem)) next[key === oldName ? newName : key] = value;
    return next;
  });
  if (document.querySelector("#lookup-key-column").value.trim() === oldName) {
    document.querySelector("#lookup-key-column").value = newName;
  }
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
  renderReferenceGrid();
}

function removeReferenceRow(index) {
  const rows = referenceRowsFromJson().filter((_, rowIndex) => rowIndex !== index);
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
  renderReferenceGrid();
}

function removeReferenceColumn(column) {
  const keyColumn = document.querySelector("#lookup-key-column").value.trim() || "key";
  if (column === keyColumn) {
    lookupOutput.textContent = "The match column cannot be removed. Change the match column first.";
    return;
  }
  const rows = referenceRowsFromJson().map((rowItem) => {
    const next = { ...rowItem };
    delete next[column];
    return next;
  });
  document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
  renderReferenceGrid();
}

function loadLookup(id, tables) {
  const table = tables.find((item) => item.id === id);
  if (!table) {
    lookupOutput.textContent = `Reference table not found: ${id}`;
    return;
  }
  selectedLookupId = id;
  document.querySelector("#lookup-id").value = table.id;
  document.querySelector("#lookup-id").disabled = true;
  document.querySelector("#lookup-name").value = table.name;
  document.querySelector("#lookup-key-column").value = table.key_column;
  document.querySelector("#lookup-rows").value = JSON.stringify(table.rows || [], null, 2);
  selectedLookupMetadata = table.metadata || defaultLookupMetadata();
  renderLookupValidationRules();
  renderReferenceGrid();
  document.querySelector("#lookup-csv").value = "";
  loadLookupVersions(id);
  renderLookupInspector();
  lookupOutput.textContent = `Loaded ${id}`;
  openLookupDetail();
}

async function loadLookupVersion(id, version) {
  try {
    const body = await api(`/v1/lookup-tables/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`);
    const table = body.lookup_table;
    document.querySelector("#lookup-name").value = table.name;
    document.querySelector("#lookup-key-column").value = table.key_column;
    document.querySelector("#lookup-rows").value = JSON.stringify(table.rows || [], null, 2);
    selectedLookupMetadata = table.metadata || defaultLookupMetadata();
    renderLookupValidationRules();
    renderReferenceGrid();
    renderLookupInspector();
    lookupOutput.textContent = `Loaded ${id} version ${version} into the editor. Save Reference Table to restore it as the current version.`;
  } catch (error) {
    lookupOutput.textContent = error.message;
  }
}

async function saveLookup(event) {
  event.preventDefault();
  clearInvalid();
  try {
    const id = selectedLookupId || document.querySelector("#lookup-id").value.trim();
    syncReferenceJsonFromGrid();
    const rowsInput = document.querySelector("#lookup-rows");
    const rows = JSON.parse(rowsInput.value || "[]");
    if (!Array.isArray(rows)) {
      rowsInput.classList.add("invalid");
      throw new Error("Rows JSON must be an array of objects");
    }
    for (const rowItem of rows) {
      if (rowItem == null || typeof rowItem !== "object" || Array.isArray(rowItem)) {
        rowsInput.classList.add("invalid");
        throw new Error("Every lookup row must be an object");
      }
    }
    syncLookupValidationMetadata();
    const columns = referenceColumnsFromRows(rows);
    const validation = readLookupValidationMetadata();
    const validationChecks = validateLookupColumns(rows, columns, document.querySelector("#lookup-key-column").value.trim() || "key", validation);
    const blockingChecks = validationChecks.filter((item) => item.level === "warn" || item.level === "error");
    if (blockingChecks.length && validation.policy === "block") {
      renderLookupValidation(rows, columns, document.querySelector("#lookup-key-column").value.trim() || "key");
      throw new Error(`Reference table validation blocked save: ${blockingChecks.map((item) => item.title).join(", ")}`);
    }
    const body = await api(`/v1/lookup-tables/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({
        name: document.querySelector("#lookup-name").value.trim() || id,
        key_column: document.querySelector("#lookup-key-column").value.trim() || "key",
        rows,
        metadata: selectedLookupMetadata
      })
    });
    selectedLookupId = body.lookup_table.id;
    selectedLookupMetadata = body.lookup_table.metadata || selectedLookupMetadata;
    document.querySelector("#lookup-id").disabled = true;
    lookupOutput.textContent = validation.policy === "warn" && blockingChecks.length
      ? `Saved with validation warnings: ${blockingChecks.map((item) => item.title).join(", ")}\n\n${JSON.stringify(body, null, 2)}`
      : JSON.stringify(body, null, 2);
    await loadLookups();
    await loadLookupVersions(selectedLookupId);
    renderLookupInspector(rows);
  } catch (error) {
    lookupOutput.textContent = error.message;
  }
}

async function exportLookupCsv() {
  if (!selectedLookupId) {
    lookupOutput.textContent = "Select or save a reference table before exporting CSV.";
    return;
  }
  try {
    const response = await fetch(`/v1/lookup-tables/${encodeURIComponent(selectedLookupId)}/export?format=csv`, {
      headers: { authorization: `Bearer ${tokenInput.value}` }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text);
    lookupOutput.textContent = text;
  } catch (error) {
    lookupOutput.textContent = error.message;
  }
}

function importLookupCsv() {
  clearInvalid();
  try {
    const csvInput = document.querySelector("#lookup-csv");
    const rows = parseCsv(csvInput.value);
    if (rows.length === 0) throw new Error("CSV must include a header row and at least one data row");
    document.querySelector("#lookup-rows").value = JSON.stringify(rows, null, 2);
    const headers = Object.keys(rows[0]);
    if (!headers.includes(document.querySelector("#lookup-key-column").value)) {
      document.querySelector("#lookup-key-column").value = headers[0] || "key";
    }
    renderReferenceGrid();
    renderLookupInspector(rows);
    lookupOutput.textContent = `Imported ${rows.length} CSV rows`;
  } catch (error) {
    document.querySelector("#lookup-csv").classList.add("invalid");
    lookupOutput.textContent = error.message;
  }
}

function parseCsv(source) {
  const rows = [];
  let field = "";
  let rowBuffer = [];
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      field += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      rowBuffer.push(field);
      field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      rowBuffer.push(field);
      if (rowBuffer.some((value) => value.trim() !== "")) rows.push(rowBuffer);
      rowBuffer = [];
      field = "";
    } else {
      field += char;
    }
  }
  rowBuffer.push(field);
  if (rowBuffer.some((value) => value.trim() !== "")) rows.push(rowBuffer);
  if (quoted) throw new Error("CSV has an unclosed quoted field");
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => slug(header).replaceAll("_", "_"));
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, parseLiteral((values[index] || "").trim())]))
  );
}

function renderEvaluateRuleOptions() {
  const select = document.querySelector("#eval-rule-key");
  const current = select.value || "next_best_offer";
  select.innerHTML = cachedRuleSets
    .map((ruleSet) => `<option value="${escapeHtml(ruleSet.decision_key)}">${escapeHtml(ruleSet.name)} (${escapeHtml(ruleSet.decision_key)})</option>`)
    .join("");
  if (cachedRuleSets.some((ruleSet) => ruleSet.decision_key === current)) select.value = current;
  else if (cachedRuleSets[0]) select.value = cachedRuleSets[0].decision_key;
}

function currentEvaluateRequestKind() {
  return evalRequestKind?.value === "surface" ? "surface" : "decision";
}

function isSurfaceEvaluateMode() {
  return currentEvaluateRequestKind() === "surface";
}

function isSurfaceEvaluationResponse(body) {
  return Boolean(body && typeof body === "object" && "surface" in body && Array.isArray(body.candidates));
}

function inferredEvaluateRequestKind(rule = selectedEvaluateRule(), request = readEvaluateInputSafe()) {
  if (request?.surface) return "surface";
  return rule?.type === "inapp_message" ? "surface" : "decision";
}

function syncEvaluateRequestKind(rule = selectedEvaluateRule(), request = readEvaluateInputSafe()) {
  if (!evalRequestKind) return;
  evalRequestKind.value = inferredEvaluateRequestKind(rule, request);
  updateEvaluateRequestModeUi(rule, request);
}

function updateEvaluateRequestModeUi(rule = selectedEvaluateRule(), request = readEvaluateInputSafe()) {
  const isSurface = currentEvaluateRequestKind() === "surface";
  const surfaceValue = request?.surface || request?.context?.surface || rule?.surface || "homepage_hero";
  if (evalSurfaceInput && !evalSurfaceInput.value.trim()) evalSurfaceInput.value = surfaceValue;
  if (evalSurfaceInput) {
    evalSurfaceInput.disabled = !isSurface;
    evalSurfaceInput.placeholder = rule?.surface || "homepage_hero";
  }
  if (evalLimitInput) {
    evalLimitInput.disabled = !isSurface;
    evalLimitInput.value = String(Math.min(Math.max(Number(request?.limit || evalLimitInput.value || 20), 1), 50));
  }
  const evalMode = document.querySelector("#eval-mode");
  if (evalMode) {
    evalMode.disabled = isSurface;
    if (isSurface) evalMode.value = "published";
  }
  if (evalCompareButton) evalCompareButton.hidden = isSurface;
}

function syncEvaluatePayloadFromControls() {
  const body = readEvaluateInputSafe();
  body.decision_key = document.querySelector("#eval-rule-key").value || body.decision_key;
  body.profile_key = document.querySelector("#eval-profile-key").value.trim() || body.profile_key;
  if (isSurfaceEvaluateMode()) {
    body.surface = evalSurfaceInput?.value.trim() || selectedEvaluateRule()?.surface || body.surface || "";
    const limit = Number(evalLimitInput?.value || body.limit || 20);
    body.limit = Math.min(Math.max(Number.isFinite(limit) ? limit : 20, 1), 50);
    body.context = body.context && typeof body.context === "object" && !Array.isArray(body.context) ? body.context : {};
    body.context.surface = body.surface;
  } else {
    delete body.limit;
    if ("surface" in body) delete body.surface;
  }
  evalInput.value = JSON.stringify(body, null, 2);
}

function loadEvaluatePreset() {
  const preset = document.querySelector("#eval-preset")?.value || "nbo_green";
  const request = preset === "rule_default"
    ? evaluatePresetForRule(selectedEvaluateRule())
    : preset === "experiment_holdout"
      ? experimentEvaluatePreset(selectedEvaluateRule(), { holdout: true })
      : evaluatePreset(preset);
  document.querySelector("#eval-rule-key").value = request.decision_key;
  syncEvaluateRequestKind(selectedEvaluateRule(), request);
  if (request.surface && evalSurfaceInput) evalSurfaceInput.value = request.surface;
  if (request.limit && evalLimitInput) evalLimitInput.value = String(request.limit);
  document.querySelector("#eval-profile-key").value = request.profile_key;
  evalInput.value = JSON.stringify(request, null, 2);
  renderEvaluateProfileBuilder(request);
  renderEvaluateModeLabels();
  renderEvaluateValidation(request);
}

function loadEvaluatePresetForSelectedRule() {
  const previous = readEvaluateInputSafe();
  const rule = selectedEvaluateRule();
  const request = evaluatePresetForRule(rule);
  const currentProfileKey = document.querySelector("#eval-profile-key").value.trim() || previous.profile_key || "";
  if (currentProfileKey && !currentProfileKey.startsWith("preset-")) request.profile_key = currentProfileKey;
  if (previous.surface && !request.surface && rule.type === "inapp_message") request.surface = previous.surface;
  syncEvaluateRequestKind(rule, request);
  if (evalSurfaceInput) evalSurfaceInput.value = request.surface || rule.surface || previous.surface || "homepage_hero";
  if (evalLimitInput) evalLimitInput.value = String(request.limit || previous.limit || 20);
  document.querySelector("#eval-profile-key").value = request.profile_key;
  syncEvaluatePresetSelect(rule);
  evalInput.value = JSON.stringify(request, null, 2);
  renderEvaluateProfileBuilder(request);
  renderEvaluateModeLabels();
  renderEvaluationSummary(null, document.querySelector("#eval-mode").value);
  renderEvaluationOutputSummary(null);
  evalTrace.innerHTML = "";
  evalOutput.textContent = "";
  renderEvaluateValidation(request);
}

async function loadEvaluationProfiles() {
  try {
    const body = await api("/v1/evaluation-profiles");
    cachedEvaluationProfiles = body.profiles || [];
    renderSavedEvaluateProfiles();
  } catch {
    cachedEvaluationProfiles = readSavedEvaluateProfiles();
    renderSavedEvaluateProfiles();
  }
}

function renderSavedEvaluateProfiles() {
  if (!evalSavedProfile) return;
  const profiles = cachedEvaluationProfiles.length ? cachedEvaluationProfiles : readSavedEvaluateProfiles();
  evalSavedProfile.innerHTML = [
    `<option value="">No saved profile selected</option>`,
    ...profiles.map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)} · ${escapeHtml(profile.decision_key || "any rule")}</option>`)
  ].join("");
}

function readSavedEvaluateProfiles() {
  try {
    const profiles = JSON.parse(localStorage.getItem(savedProfileStorageKey) || "[]");
    return Array.isArray(profiles) ? profiles : [];
  } catch {
    return [];
  }
}

function writeSavedEvaluateProfiles(profiles) {
  localStorage.setItem(savedProfileStorageKey, JSON.stringify(profiles.slice(0, 50)));
}

async function saveEvaluateProfile() {
  try {
    const request = readEvaluateInput();
    const validation = renderEvaluateValidation(request);
    if (validation.errors.length) throw new Error(`Profile cannot be saved: ${validation.errors.join("; ")}`);
    const name = window.prompt("Saved profile name", `${request.decision_key} · ${request.profile_key}`);
    if (!name) return;
    const id = `${request.decision_key}:${request.profile_key}:${name}`.toLowerCase().replace(/[^a-z0-9:_-]+/g, "_");
    const payload = {
      name,
      decision_key: request.decision_key,
      profile_key: request.profile_key,
      request
    };
    try {
      const response = await api(`/v1/evaluation-profiles/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      await loadEvaluationProfiles();
      evalSavedProfile.value = response.profile.id;
    } catch {
      const profiles = readSavedEvaluateProfiles();
      const next = profiles.filter((profile) => profile.id !== id);
      next.unshift({ id, ...payload, updated_at: new Date().toISOString() });
      writeSavedEvaluateProfiles(next);
      cachedEvaluationProfiles = [];
      renderSavedEvaluateProfiles();
      evalSavedProfile.value = id;
    }
    renderEvaluateValidation(request, "Saved profile is ready for reuse.");
  } catch (error) {
    renderEvaluateValidation(null, error.message);
  }
}

async function deleteEvaluateProfile() {
  const id = evalSavedProfile?.value;
  if (!id) return;
  try {
    await api(`/v1/evaluation-profiles/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadEvaluationProfiles();
  } catch {
    writeSavedEvaluateProfiles(readSavedEvaluateProfiles().filter((profile) => profile.id !== id));
    cachedEvaluationProfiles = [];
    renderSavedEvaluateProfiles();
  }
  renderSavedEvaluateProfiles();
  renderEvaluateValidation(null, "Saved profile deleted.");
}

function loadSavedEvaluateProfile() {
  const id = evalSavedProfile?.value;
  if (!id) return;
  const profile = [...cachedEvaluationProfiles, ...readSavedEvaluateProfiles()].find((item) => item.id === id);
  if (!profile) return;
  const request = structuredClone(profile.request);
  if (cachedRuleSets.some((ruleSet) => ruleSet.decision_key === request.decision_key)) {
    document.querySelector("#eval-rule-key").value = request.decision_key;
  }
  syncEvaluateRequestKind(selectedEvaluateRule(), request);
  if (evalSurfaceInput) evalSurfaceInput.value = request.surface || request.context?.surface || selectedEvaluateRule()?.surface || "homepage_hero";
  if (evalLimitInput) evalLimitInput.value = String(request.limit || 20);
  document.querySelector("#eval-profile-key").value = request.profile_key || "";
  syncEvaluatePresetSelect(selectedEvaluateRule());
  evalInput.value = JSON.stringify(request, null, 2);
  renderEvaluateProfileBuilder(request);
  renderEvaluateModeLabels();
  renderEvaluateValidation(request, "Loaded saved profile.");
}

function renderEvaluateProfileBuilder(request = readEvaluateInputSafe()) {
  renderEvaluateBuilderList("attribute", request.attributes || {});
  renderEvaluateBuilderList("context", request.context || {});
  renderEvaluateBuilderList("segment", request.segments || {});
}

function renderEvaluateBuilderList(kind, values = {}) {
  const target = document.querySelector(`#eval-${kind}-builder`);
  if (!target) return;
  const entries = Object.entries(values || {});
  target.innerHTML = entries.length
    ? entries.map(([key, value], index) => evaluateBuilderRow(kind, key, value, index)).join("")
    : `<div class="eval-builder-empty">No ${kind === "attribute" ? "attributes" : `${kind}s`} yet.</div>`;
  target.querySelectorAll("[data-eval-builder-remove]").forEach(attachEvaluateBuilderRemove);
}

function evaluateBuilderRow(kind, key = "", rawValue = "", index = Date.now()) {
  const value = normalizeEvaluateBuilderValue(kind, rawValue);
  const type = inferBuilderValueType(value);
  const listId = `eval-${kind}-keys-${index}`;
  return `
    <div class="eval-builder-row" data-eval-builder-kind="${kind}">
      <input data-eval-builder-key value="${escapeHtml(key)}" placeholder="${kind === "attribute" ? "lead_score" : kind === "context" ? "channel" : "vip_segment"}" list="${listId}" />
      <input data-eval-builder-value value="${escapeHtml(valueToBuilderText(value))}" placeholder="value" />
      <select data-eval-builder-type>
        ${["string", "number", "boolean", "json"].map((item) => `<option value="${item}"${item === type ? " selected" : ""}>${item}</option>`).join("")}
      </select>
      <button type="button" data-eval-builder-remove>Remove</button>
      ${graphDatalist(listId, evaluateBuilderKeySuggestions(kind))}
    </div>
  `;
}

function addEvaluateBuilderRow(kind) {
  const target = document.querySelector(`#eval-${kind}-builder`);
  if (!target) return;
  target.querySelector(".eval-builder-empty")?.remove();
  const existing = new Set([...target.querySelectorAll("[data-eval-builder-key]")].map((input) => input.value.trim()).filter(Boolean));
  const suggestion = evaluateBuilderKeySuggestions(kind).find((key) => !existing.has(key)) || "";
  target.insertAdjacentHTML("beforeend", evaluateBuilderRow(kind, suggestion, kind === "segment" ? true : "", Date.now()));
  attachEvaluateBuilderRemove(target.querySelector(".eval-builder-row:last-child [data-eval-builder-remove]"));
}

function attachEvaluateBuilderRemove(button) {
  if (!button) return;
  button.addEventListener("click", () => {
    const row = button.closest(".eval-builder-row");
    const target = row?.parentElement;
    const kind = row?.dataset.evalBuilderKind || "item";
    row?.remove();
    if (target && !target.querySelector(".eval-builder-row")) {
      target.innerHTML = `<div class="eval-builder-empty">No ${kind === "attribute" ? "attributes" : `${kind}s`} yet.</div>`;
    }
  });
}

function evaluateBuilderKeySuggestions(kind) {
  if (kind === "attribute") return schemaItemsForSource("attribute").map((item) => item.name);
  if (kind === "context") {
    return [
      ...schemaItemsForSource("context").map((item) => item.name),
      "channel",
      "surface",
      "session_id",
      "request_source"
    ];
  }
  return schemaItemsForSource("segment").map((item) => item.name).filter(Boolean);
}

function normalizeEvaluateBuilderValue(kind, rawValue) {
  if (kind === "attribute" && Array.isArray(rawValue)) return rawValue[0]?.value ?? "";
  if (rawValue && typeof rawValue === "object" && "value" in rawValue) return rawValue.value;
  return rawValue;
}

function inferBuilderValueType(value) {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value && typeof value === "object") return "json";
  return "string";
}

function valueToBuilderText(value) {
  if (value == null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function syncEvaluatePayloadFromBuilder() {
  const body = readEvaluateInputSafe();
  body.decision_key = document.querySelector("#eval-rule-key").value || body.decision_key;
  body.profile_key = document.querySelector("#eval-profile-key").value.trim() || body.profile_key;
  body.identifiers = Array.isArray(body.identifiers) ? body.identifiers : [];
  body.attributes = readEvaluateBuilderObject("attribute");
  body.context = readEvaluateBuilderObject("context");
  body.segments = readEvaluateBuilderObject("segment");
  if (isSurfaceEvaluateMode()) {
    body.surface = evalSurfaceInput?.value.trim() || body.surface || selectedEvaluateRule()?.surface || "";
    body.limit = Math.min(Math.max(Number(evalLimitInput?.value || body.limit || 20), 1), 50);
    body.context.surface = body.surface;
  } else {
    delete body.limit;
    if ("surface" in body) delete body.surface;
  }
  evalInput.value = JSON.stringify(body, null, 2);
  renderEvaluateValidation(body, "Profile builder applied to payload.");
}

function readEvaluateBuilderObject(kind) {
  const rows = [...document.querySelectorAll(`[data-eval-builder-kind="${kind}"]`)];
  return rows.reduce((acc, row) => {
    const key = row.querySelector("[data-eval-builder-key]")?.value.trim();
    if (!key) return acc;
    const type = row.querySelector("[data-eval-builder-type]")?.value || "string";
    const rawValue = row.querySelector("[data-eval-builder-value]")?.value || "";
    const value = parseBuilderValue(rawValue, type);
    acc[key] = kind === "attribute" ? [{ value }] : value;
    return acc;
  }, {});
}

function parseBuilderValue(rawValue, type) {
  if (type === "number") return Number(rawValue || 0);
  if (type === "boolean") return ["true", "1", "yes", "y"].includes(String(rawValue).trim().toLowerCase());
  if (type === "json") return parseJsonSafe(rawValue || "null", null);
  return rawValue;
}

function syncEvaluatePresetSelect(rule = {}) {
  const presetSelect = document.querySelector("#eval-preset");
  if (!presetSelect) return;
  if (rule.decision_key === "next_best_offer") {
    if (!presetSelect.value.startsWith("nbo_")) presetSelect.value = "nbo_green";
    return;
  }
  if (rule.type === "experiment" && presetSelect.value !== "experiment_holdout") {
    presetSelect.value = "rule_default";
    return;
  }
  presetSelect.value = rule.decision_key === "loan_eligibility" ? "loan" : "rule_default";
}

function toggleEvalPayload() {
  if (!evalPayloadPanel || !evalPayloadToggle) return;
  evalPayloadPanel.hidden = !evalPayloadPanel.hidden;
  evalPayloadToggle.textContent = evalPayloadPanel.hidden ? "Show Payload JSON" : "Hide Payload JSON";
  if (!evalPayloadPanel.hidden) evalPayloadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function readEvaluateInput() {
  const body = JSON.parse(evalInput.value || "{}");
  body.decision_key = document.querySelector("#eval-rule-key").value || body.decision_key;
  body.profile_key = document.querySelector("#eval-profile-key").value.trim() || body.profile_key;
  if (isSurfaceEvaluateMode()) {
    body.surface = evalSurfaceInput?.value.trim() || body.surface || selectedEvaluateRule()?.surface || "";
    const limit = Number(evalLimitInput?.value || body.limit || 20);
    body.limit = Math.min(Math.max(Number.isFinite(limit) ? limit : 20, 1), 50);
    body.context = body.context && typeof body.context === "object" && !Array.isArray(body.context) ? body.context : {};
    body.context.surface = body.surface;
  } else {
    delete body.limit;
    if ("surface" in body) delete body.surface;
  }
  return body;
}

function readEvaluateInputSafe() {
  try {
    return JSON.parse(evalInput.value || "{}");
  } catch {
    return {};
  }
}

function renderEvaluateValidation(request = null, notice = "") {
  if (!evalValidation) return { errors: [], warnings: [] };
  let body = request;
  const errors = [];
  const warnings = [];
  const requestKind = currentEvaluateRequestKind();
  if (!body) {
    try {
      body = readEvaluateInput();
    } catch (error) {
      errors.push(`Payload JSON is invalid: ${error.message}`);
    }
  }
  if (body) {
    if (!body.decision_key) errors.push("decision_key is required");
    if (!body.profile_key) errors.push("profile_key is required");
    if (requestKind === "surface" && !body.surface) errors.push("surface is required for client surface evaluation");
    if (!Array.isArray(body.identifiers)) errors.push("identifiers must be an array");
    if (!body.attributes || typeof body.attributes !== "object" || Array.isArray(body.attributes)) warnings.push("attributes should be an object of Meiro attribute arrays");
    if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) warnings.push("context should be an object");
    const selected = selectedEvaluateRule();
    if (selected?.input_schema?.properties || selected?.input_schema?.attributes) {
      const required = Object.keys(selected.input_schema.properties || selected.input_schema.attributes || {});
      const missing = required.filter((key) => !(key in (body.attributes || {})) && !(key in (body.context || {})) && !(key in (body.segments || {})));
      if (missing.length) warnings.push(`schema fields not present in payload: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`);
    }
    const mode = document.querySelector("#eval-mode").value;
    if (requestKind === "surface") {
      if (selected?.type !== "inapp_message") warnings.push("client surface mode is mainly for published in-app messages on a shared surface");
      if (!selected?.surface && !body.surface) warnings.push("choose a surface that matches published in-app messages");
    }
    if (requestKind === "decision" && mode === "draft" && selected?.status === "archived") warnings.push("selected rule is archived; draft tests may not reflect a published route");
  }
  const className = errors.length ? "error" : warnings.length ? "warning" : "ok";
  const items = errors.length ? errors : warnings.length ? warnings : [notice || "Request shape looks ready."];
  evalValidation.className = `eval-validation ${className}`;
  evalValidation.innerHTML = `
    <strong>${errors.length ? "Fix before running" : warnings.length ? "Review before running" : "Ready"}</strong>
    <span>${escapeHtml(items.join(" · "))}</span>
  `;
  return { errors, warnings };
}

function formatDecisionOutput(body) {
  if (isSurfaceEvaluationResponse(body)) {
    return JSON.stringify({
      summary: {
        surface: body.surface,
        profile_key: body.profile_key,
        selected: body.selected?.decision_key || null,
        selected_result: body.selected?.result || null,
        candidate_count: Array.isArray(body.candidates) ? body.candidates.length : 0,
        no_candidate_reason: body.diagnostics?.no_candidate_reason || "",
        matched_rules: body.selected?.matched_rules || [],
        trace: body.selected?.trace || [],
        diagnostics: body.diagnostics || {}
      },
      response: body
    }, null, 2);
  }
  return JSON.stringify({
    summary: {
      result: body.result,
      offer_id: body.outputs?.offer_id,
      offer_tier: body.outputs?.offer_tier,
      promotion_category: body.outputs?.promotion_category,
      suppression_reason: body.outputs?.suppression_reason,
      matched_rules: body.matched_rules,
      trace: body.trace,
      errors: body.errors,
      tested_version: body.tested_version || "published"
    },
    response: body
  }, null, 2);
}

function renderEvaluateModeLabels() {
  const mode = document.querySelector("#eval-mode").value;
  if (isSurfaceEvaluateMode()) {
    evalEndpointLabel.textContent = "/v1/client/surface";
    evalAuditLabel.textContent = "No, client surface response";
    return;
  }
  evalEndpointLabel.textContent = mode === "draft" ? "/v1/rule-sets/:key/test" : "/v1/evaluate";
  evalAuditLabel.textContent = mode === "draft" ? "No, draft test" : "Yes, published mode";
}

function evaluateModeLabel(mode) {
  if (mode === "draft") return "Draft";
  if (mode === "compare") return "Compare";
  if (mode === "surface") return "Client surface";
  return "Published";
}

function renderEvaluationSummary(body, mode, error) {
  if (!evalSummary) return;
  const effectiveMode = isSurfaceEvaluationResponse(body) || (!body && isSurfaceEvaluateMode()) ? "surface" : mode;
  if (error) {
    evalSummary.innerHTML = [
      statusItem("Status", "Error"),
      statusItem("Mode", evaluateModeLabel(effectiveMode)),
      statusItem("Result", "-"),
      statusItem("Matched", "-")
    ].join("");
    return;
  }
  if (!body) {
    evalSummary.innerHTML = [
      statusItem("Status", "Ready"),
      statusItem("Mode", evaluateModeLabel(effectiveMode)),
      statusItem("Result", "-"),
      statusItem("Matched", "-")
    ].join("");
    return;
  }
  if (isSurfaceEvaluationResponse(body)) {
    evalSummary.innerHTML = [
      statusItem("Status", body.selected ? "OK" : body.candidates?.length ? "Review" : "Empty"),
      statusItem("Mode", evaluateModeLabel("surface")),
      statusItem("Result", body.selected?.result || "not_selected"),
      statusItem("Matched", body.selected?.decision_key || body.diagnostics?.no_candidate_reason || "none")
    ].join("");
    return;
  }
  evalSummary.innerHTML = [
    statusItem("Status", body.errors?.length ? "Warning" : "OK"),
    statusItem("Mode", evaluateModeLabel(mode)),
    statusItem("Result", body.result || "-"),
    statusItem("Matched", body.matched_rules?.join(", ") || "fallback")
  ].join("");
}

function renderEvaluationOutputSummary(body, error = null) {
  if (!evalOutputSummary) return;
  if (error) {
    evalOutputSummary.innerHTML = `<div class="eval-empty-state">Evaluation failed. Review the response panel for details.</div>`;
    renderEvaluationRuntimeSummary(null, error);
    return;
  }
  if (!body) {
    evalOutputSummary.innerHTML = `<div class="eval-empty-state">${isSurfaceEvaluateMode()
      ? "Run a client surface evaluation to inspect candidate messages, selected payloads, and suppression diagnostics."
      : "Run an evaluation to inspect outputs, matched rules, and response warnings."}</div>`;
    renderEvaluationRuntimeSummary(null);
    return;
  }
  if (isSurfaceEvaluationResponse(body)) {
    renderSurfaceEvaluationOutputSummary(body);
    renderEvaluationRuntimeSummary(body);
    return;
  }
  const outputEntries = Object.entries(body.outputs || {});
  const errors = Array.isArray(body.errors) ? body.errors : [];
  const enrichment = renderProfileEnrichmentCard(body.profile_cache);
  evalOutputSummary.innerHTML = `
    <div class="eval-output-card primary">
      <span>Result</span>
      <strong>${escapeHtml(body.result || "-")}</strong>
      <small>${escapeHtml(body.decision_key || "decision")}</small>
    </div>
    <div class="eval-output-card">
      <span>Matched rules</span>
      <strong>${escapeHtml(body.matched_rules?.join(", ") || "fallback")}</strong>
      <small>${escapeHtml(body.rule_version ? `version ${body.rule_version}` : body.tested_version ? "draft test" : "published")}</small>
    </div>
    ${outputEntries.length
      ? outputEntries.map(([key, value]) => `
        <div class="eval-output-card">
          <span>${escapeHtml(key)}</span>
          <strong>${escapeHtml(formatDecisionValue(value))}</strong>
        </div>
      `).join("")
      : `<div class="eval-output-card"><span>Outputs</span><strong>No outputs</strong></div>`}
    ${errors.length
      ? `<div class="eval-output-card warning"><span>Errors</span><strong>${escapeHtml(errors.join(", "))}</strong></div>`
      : ""}
    ${enrichment}
  `;
  renderEvaluationRuntimeSummary(body);
}

function renderSurfaceEvaluationOutputSummary(body = {}) {
  const selected = body.selected || null;
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const diagnostics = body.diagnostics || {};
  const selectedOutputs = Object.entries(selected?.outputs || {}).slice(0, 8);
  const enrichment = renderProfileEnrichmentCard(selected?.profile_cache || candidates[0]?.profile_cache || null);
  evalOutputSummary.innerHTML = `
    <div class="eval-output-card primary">
      <span>Selected</span>
      <strong>${escapeHtml(selected?.decision_key || "No eligible message")}</strong>
      <small>${escapeHtml(selected?.result || diagnostics.no_candidate_reason || body.surface || "surface")}</small>
    </div>
    <div class="eval-output-card">
      <span>Surface</span>
      <strong>${escapeHtml(body.surface || "-")}</strong>
      <small>${escapeHtml(`${formatNumber(candidates.length)} candidates evaluated`)}</small>
    </div>
    <div class="eval-output-card">
      <span>Priority</span>
      <strong>${escapeHtml(selected?.priority != null ? String(selected.priority) : "-")}</strong>
      <small>${escapeHtml(selected?.surface || "published selection")}</small>
    </div>
    <div class="eval-output-card ${selected ? "" : "warning"}">
      <span>Selection reason</span>
      <strong>${escapeHtml(selected ? "Highest eligible candidate" : diagnostics.no_candidate_reason || "No surface candidate selected")}</strong>
      <small>${escapeHtml(candidates.length ? "Review candidate availability below." : "No published surface candidates matched.")}</small>
    </div>
    ${selectedOutputs.map(([key, value]) => `
      <div class="eval-output-card">
        <span>${escapeHtml(key)}</span>
        <strong>${escapeHtml(formatDecisionValue(value))}</strong>
      </div>
    `).join("")}
    ${candidates.slice(0, 8).map((candidate) => `
      <div class="eval-output-card ${candidate.result === "eligible" ? "" : "warning"}">
        <span>${escapeHtml(candidate.decision_key || "candidate")}</span>
        <strong>${escapeHtml(candidate.result || "-")}</strong>
        <small>${escapeHtml(surfaceCandidateDetail(candidate))}</small>
      </div>
    `).join("")}
    ${!candidates.length
      ? `<div class="eval-output-card warning"><span>Diagnostics</span><strong>${escapeHtml(diagnostics.no_candidate_reason || "No candidates available")}</strong></div>`
      : ""}
    ${enrichment}
  `;
}

function surfaceCandidateDetail(candidate = {}) {
  const bits = [];
  if (candidate.priority != null) bits.push(`priority ${candidate.priority}`);
  if (candidate.message?.name) bits.push(candidate.message.name);
  if (candidate.message_id) bits.push(candidate.message_id);
  if (candidate.message?.availability?.reason) bits.push(candidate.message.availability.reason.replace(/_/g, " "));
  if (candidate.errors?.length) bits.push(candidate.errors[0]);
  return bits.join(" · ") || "Candidate evaluated";
}

function renderEvaluationRuntimeSummary(body = null, error = null) {
  if (!evalRuntimeSummary) return;
  if (error) {
    evalRuntimeSummary.innerHTML = `<div class="eval-empty-state">Runtime diagnostics unavailable because the evaluation failed.</div>`;
    return;
  }
  if (!body) {
    evalRuntimeSummary.innerHTML = `<div class="eval-empty-state">${isSurfaceEvaluateMode()
      ? "Run a client surface evaluation to inspect selected message runtime, profile enrichment, and no-candidate reasons."
      : "Run an evaluation to inspect app/mobile rendering contract, suppression reasons, and enrichment readiness."}</div>`;
    return;
  }
  const request = readEvaluateInputSafe();
  const runtime = isSurfaceEvaluationResponse(body)
    ? surfaceEvaluationRuntimeProfile(body, request)
    : evaluationRuntimeProfile(body, request);
  const issues = evaluationRuntimeIssues(runtime);
  evalRuntimeSummary.innerHTML = evaluationRuntimeCardHtml(runtime, issues);
}

function evaluationRuntimeCardHtml(runtime = {}, issues = evaluationRuntimeIssues(runtime)) {
  return `
    <div class="eval-runtime-card ${escapeHtml(runtime.level)}">
      <div class="eval-runtime-head">
        <div>
          <strong>Runtime Diagnostics</strong>
          <span>${escapeHtml(runtime.summary)}</span>
        </div>
        <span>${escapeHtml(runtime.level === "warning" ? "Review" : "Ready")}</span>
      </div>
      <div class="eval-runtime-grid">
        ${evaluationRuntimeMetric("Platform", messageDeliveryLabel(runtime.platform || "web"))}
        ${evaluationRuntimeMetric("Application", runtime.application || "Not set")}
        ${evaluationRuntimeMetric("Placement", runtime.placement || runtime.surface || "Not set")}
        ${evaluationRuntimeMetric("Template", runtime.templateType ? messageDeliveryLabel(runtime.templateType) : "None")}
        ${evaluationRuntimeMetric("Enrichment", runtime.enrichmentSource || "Not used")}
        ${evaluationRuntimeMetric("Suppression", runtime.suppressionReason || "None")}
      </div>
      <div class="eval-runtime-list">
        ${issues.map((item) => `
          <div class="eval-runtime-item ${escapeHtml(item.level)}">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function surfaceEvaluationRuntimeProfile(body = {}, request = {}) {
  if (body.selected) return evaluationRuntimeProfile(body.selected, request);
  const candidate = (Array.isArray(body.candidates) ? body.candidates : []).find((item) => item?.message?.rendering) || body.candidates?.[0];
  if (!candidate) {
    return {
      hasMessage: false,
      platform: request.context?.platform || "web",
      application: request.context?.application || request.context?.app_id || "",
      placement: request.context?.placement || body.surface || "",
      surface: body.surface || "",
      templateType: "",
      enrichmentSource: "No profile enrichment available",
      missingRequired: [],
      suppressionReason: body.diagnostics?.no_candidate_reason || "",
      availability: {},
      level: "warning",
      summary: "No surface candidate was selected for this request."
    };
  }
  const renderingFallback = candidate.message?.rendering || {};
  return {
    ...(candidate.message?.rendering ? messageRuntimeProfile({
      templateType: candidate.message.rendering.template_type,
      placement: candidate.message.rendering.placement || body.surface,
      surface: candidate.message.rendering.surface || body.surface,
      application: candidate.message.rendering.application?.key || candidate.message.rendering.application?.id || "",
      targetDevices: candidate.message.rendering.platform_hints?.target_devices || candidate.delivery?.targeting?.devices || "any",
      triggerType: candidate.delivery?.trigger?.type || request.context?.trigger || "page_load",
      previewDevice: request.context?.device_type || request.context?.platform || "desktop",
      content: {}
    }) : {}),
    platform: renderingFallback.platform_hints?.platform || request.context?.platform || "web",
    application: renderingFallback.application?.key || renderingFallback.application?.id || request.context?.application || request.context?.app_id || "",
    placement: renderingFallback.placement || request.context?.placement || body.surface || "",
    surface: renderingFallback.surface || body.surface || "",
    templateType: renderingFallback.template_type || "",
    hasMessage: Boolean(candidate.message),
    surfaceCandidate: true,
    enrichmentSource: profileEnrichmentStatusLabel(candidate.profile_cache?.status || ""),
    missingRequired: candidate.profile_cache?.diagnostics?.missing_required_attributes || [],
    suppressionReason: candidate.message?.availability?.reason || candidate.errors?.[0] || body.diagnostics?.no_candidate_reason || "",
    availability: candidate.message?.availability || {},
    level: candidate.result === "eligible" ? "ok" : "warning",
    summary: candidate.result === "eligible"
      ? "DEE resolved a candidate contract for this surface."
      : `Surface candidate was not selected because ${candidate.message?.availability?.reason || body.diagnostics?.no_candidate_reason || "it was not eligible"}.`
  };
}

function evaluationRuntimeProfile(body = {}, request = {}) {
  const message = body.outputs?.message && typeof body.outputs.message === "object" ? body.outputs.message : null;
  const rendering = message?.rendering && typeof message.rendering === "object" ? message.rendering : null;
  const availability = message?.availability && typeof message.availability === "object" ? message.availability : {};
  const delivery = body.delivery?.message && typeof body.delivery.message === "object" ? body.delivery.message : {};
  const profileDiagnostics = body.profile_cache?.diagnostics || {};
  const content = message?.content && typeof message.content === "object" ? message.content : {};
  const runtime = rendering || messageRuntimeProfile({
    templateType: content.template_type || body.outputs?.template || "banner",
    placement: content.placement || request.context?.placement || request.context?.surface || "",
    surface: message?.surface || request.context?.surface || request.surface || "",
    application: request.context?.application || request.context?.app_id || "",
    targetDevices: delivery.targeting?.devices || "any",
    triggerType: delivery.trigger?.type || request.context?.trigger || "page_load",
    previewDevice: request.context?.device_type || request.context?.platform || "desktop",
    content
  });
  return {
    ...runtime,
    result: body.result || "",
    decisionKey: body.decision_key || "",
    enrichmentSource: profileDiagnostics.source || profileEnrichmentStatusLabel(body.profile_cache?.status || ""),
    missingRequired: Array.isArray(profileDiagnostics.missing_required_attributes) ? profileDiagnostics.missing_required_attributes : [],
    suppressionReason: body.outputs?.suppression_reason || availability.reason || "",
    availability,
    hasMessage: Boolean(message),
    level: evaluationRuntimeLevel({ ...runtime, body, message, availability, profileDiagnostics }),
    summary: evaluationRuntimeSummary({ ...runtime, body, message, availability, profileDiagnostics })
  };
}

function evaluationRuntimeLevel(context = {}) {
  if (context.suppressionReason) return "warning";
  if (context.platform === "mobile" && !context.application) return "warning";
  if (context.platform === "mobile" && context.templateType === "html_fragment") return "warning";
  if (Array.isArray(context.missingRequired) && context.missingRequired.length) return "warning";
  return "ok";
}

function evaluationRuntimeSummary(context = {}) {
  if (!context.hasMessage) return "This response does not include a resolved in-app message payload.";
  if (context.suppressionReason) return `Message delivery was suppressed by ${context.suppressionReason.replace(/_/g, " ")}.`;
  if (context.platform === "mobile") return "Resolved message payload looks usable for a native or hybrid app client.";
  return "Resolved message payload looks aligned with web SDK delivery.";
}

function evaluationRuntimeIssues(runtime = {}) {
  const items = [];
  if (!runtime.hasMessage) {
    items.push({
      level: "info",
      title: "No message payload",
      detail: runtime.surfaceCandidate
        ? "DEE evaluated this surface candidate, but it did not resolve into a deliverable message payload."
        : "This rule returned regular decision outputs rather than a resolved in-app message contract."
    });
    return items;
  }
  if (runtime.suppressionReason) {
    items.push({
      level: "warn",
      title: "Suppressed",
      detail: runtime.availability?.message || `DEE returned a suppression reason of ${runtime.suppressionReason}.`
    });
  }
  if (runtime.platform === "mobile" && !runtime.application) {
    items.push({
      level: "warn",
      title: "Application missing",
      detail: "For app delivery, include an application identifier in context or message metadata so runtime ownership stays explicit."
    });
  }
  if (runtime.platform === "mobile" && !runtime.placement) {
    items.push({
      level: "warn",
      title: "Placement missing",
      detail: "Native app teams need a concrete placement such as home.hero or inbox.top to render this consistently."
    });
  }
  if (runtime.platform === "mobile" && runtime.templateType === "html_fragment") {
    items.push({
      level: "warn",
      title: "HTML fragment on mobile",
      detail: "Structured templates are a safer fit for native app renderers than sanitized HTML fragments."
    });
  }
  if (runtime.missingRequired?.length) {
    items.push({
      level: "warn",
      title: "Missing required fields",
      detail: runtime.missingRequired.slice(0, 4).join(", ") + (runtime.missingRequired.length > 4 ? "..." : "")
    });
  }
  if (!items.length) {
    items.push({
      level: "ok",
      title: "Portable contract",
      detail: "DEE returned a resolved message payload with delivery and enrichment context that client teams can implement against."
    });
  }
  return items.slice(0, 4);
}

function evaluationRuntimeMetric(label, value) {
  return `
    <div class="eval-runtime-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function renderProfileEnrichmentCard(profileCache = null) {
  if (!profileCache) return "";
  const diagnostics = profileCache.diagnostics || {};
  const fieldsAdded = diagnostics.fields_added || {};
  const drift = diagnostics.schema_drift || {};
  const freshness = diagnostics.cache_freshness || {};
  const missing = diagnostics.missing_required_attributes || [];
  const driftCount = [
    drift.profile_attributes_not_in_schema,
    drift.schema_attributes_missing_from_profile,
    drift.profile_segments_not_in_schema,
    drift.schema_segments_missing_from_profile
  ].reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
  const addedCount = [
    fieldsAdded.attributes,
    fieldsAdded.segments,
    fieldsAdded.context
  ].reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
  const status = profileCache.status || "not_used";
  const state = status === "error" || missing.length || driftCount ? "warning" : diagnostics.enriched ? "ok" : "neutral";
  const source = diagnostics.source || profileEnrichmentStatusLabel(status);
  const freshnessText = freshness.expires_at
    ? `expires ${formatTime(freshness.expires_at)}`
    : Number(freshness.ttl_seconds || profileCache.ttl_seconds || 0) > 0
      ? `${formatNumber(freshness.ttl_seconds || profileCache.ttl_seconds)}s TTL`
      : "no profile cache TTL";
  return `
    <div class="profile-enrichment-card ${escapeHtml(state)}">
      <div class="profile-enrichment-head">
        <div>
          <span>Profile enrichment</span>
          <strong>${escapeHtml(source)}</strong>
        </div>
        <em>${escapeHtml(status)}</em>
      </div>
      <div class="profile-enrichment-grid">
        ${profileEnrichmentMetric("Source", diagnostics.enriched ? "Meiro Profile API" : "Request payload", diagnostics.identifier_type ? `Identifier: ${diagnostics.identifier_type}` : profileCache.reason || profileCache.error || "")}
        ${profileEnrichmentMetric("Fields added", formatNumber(addedCount), `Attributes ${countList(fieldsAdded.attributes)} · Segments ${countList(fieldsAdded.segments)} · Context ${countList(fieldsAdded.context)}`)}
        ${profileEnrichmentMetric("Missing required", formatNumber(missing.length), missing.length ? missing.join(", ") : "No missing required attributes in response")}
        ${profileEnrichmentMetric("Schema drift", formatNumber(driftCount), profileDriftSummary(drift))}
        ${profileEnrichmentMetric("Cache freshness", profileCache.hit ? "Hit" : "Miss", freshnessText)}
      </div>
    </div>
  `;
}

function profileEnrichmentMetric(label, value, detail) {
  return `
    <div class="profile-enrichment-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail || "-")}</small>
    </div>
  `;
}

function countList(items = []) {
  return formatNumber(Array.isArray(items) ? items.length : 0);
}

function profileDriftSummary(drift = {}) {
  const chunks = [];
  if (drift.profile_attributes_not_in_schema?.length) chunks.push(`${drift.profile_attributes_not_in_schema.length} profile attributes outside schema`);
  if (drift.schema_attributes_missing_from_profile?.length) chunks.push(`${drift.schema_attributes_missing_from_profile.length} schema attributes absent`);
  if (drift.profile_segments_not_in_schema?.length) chunks.push(`${drift.profile_segments_not_in_schema.length} profile segments outside schema`);
  if (drift.schema_segments_missing_from_profile?.length) chunks.push(`${drift.schema_segments_missing_from_profile.length} schema segments absent`);
  return chunks.length ? chunks.join(" · ") : "No schema/profile drift detected";
}

function profileEnrichmentStatusLabel(status = "") {
  const labels = {
    disabled: "Enrichment disabled for this request",
    local_payload: "Local payload used",
    not_configured: "Profile API not configured",
    hit: "Meiro profile cache hit",
    miss: "Fetched from Meiro Profile API",
    error: "Profile API lookup failed"
  };
  return labels[status] || "Profile enrichment not used";
}

function formatDecisionValue(value) {
  if (value == null) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderEvaluationTrace(body) {
  if (isSurfaceEvaluationResponse(body)) {
    const candidates = Array.isArray(body.candidates) ? body.candidates : [];
    const selectedTrace = Array.isArray(body.selected?.trace) ? body.selected.trace : [];
    if (selectedTrace.length) {
      evalTrace.innerHTML = `
        <div class="trace-card">
          <div class="trace-card-header">
            <strong>${escapeHtml(`Selected candidate path · ${body.selected?.decision_key || body.surface}`)}</strong>
            <span class="trace-badge">${escapeHtml(`${selectedTrace.length} checks`)}</span>
          </div>
          <div class="trace-path">
            ${selectedTrace.map(traceStepHtml).join("")}
          </div>
        </div>
      `;
      return;
    }
    if (!candidates.length) {
      evalTrace.innerHTML = "";
      return;
    }
    evalTrace.innerHTML = `
      <div class="trace-card">
        <div class="trace-card-header">
          <strong>Surface candidates</strong>
          <span class="trace-badge">${escapeHtml(`${candidates.length} evaluated`)}</span>
        </div>
        <div class="trace-path">
          ${candidates.map((candidate) => `
            <div class="trace-step">
              <strong>${escapeHtml(candidate.decision_key || "candidate")}</strong>
              <span>${escapeHtml(surfaceCandidateDetail(candidate))}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    return;
  }
  const trace = Array.isArray(body.trace) ? body.trace : [];
  if (!trace.length) {
    evalTrace.innerHTML = "";
    return;
  }
  const graphTrace = trace.filter((item) => item.type === "graph_node");
  const title = graphTrace.length ? "Graph Path" : "Branch Evaluation";
  const badge = graphTrace.length ? `${graphTrace.length} nodes` : `${trace.length} checks`;
  evalTrace.innerHTML = `
    <div class="trace-card">
      <div class="trace-card-header">
        <strong>${escapeHtml(title)}</strong>
        <span class="trace-badge">${escapeHtml(badge)}</span>
      </div>
      <div class="trace-path">
        ${trace.map(traceStepHtml).join("")}
      </div>
    </div>
  `;
}

function traceStepHtml(step) {
  if (step.type === "graph_node") {
    return `
      <div class="trace-step">
        <strong>${escapeHtml(step.node_id || "node")}</strong>
        <span>${escapeHtml(traceGraphStepMeta(step))}</span>
      </div>
    `;
  }
  if (step.type === "branch") {
    return `
      <div class="trace-step">
        <strong>${escapeHtml(step.id || "branch")}</strong>
        <span>${escapeHtml(step.matched ? `matched / ${step.result || "result"}` : "not matched")}</span>
      </div>
    `;
  }
  if (step.type === "fallback") {
    return `
      <div class="trace-step">
        <strong>fallback</strong>
        <span>${escapeHtml(step.result || "deferred")}</span>
      </div>
    `;
  }
  return `
    <div class="trace-step">
      <strong>${escapeHtml(step.type || "trace")}</strong>
      <span>${escapeHtml(step.message || "")}</span>
    </div>
  `;
}

function traceGraphStepMeta(step) {
  if (step.terminal) return `${step.node_type} / ${step.result || "terminal"}`;
  if (step.node_type === "condition") return `${step.passed ? "true" : "false"} -> ${step.next || "-"}`;
  if (step.node_type === "score") return `${step.score_label}: ${step.score_total} -> ${step.next || "-"}`;
  if (step.node_type === "lookup") return `${step.output_key || step.column || "lookup"} -> ${step.next || "-"}`;
  if (step.node_type === "frequency_cap") return `${step.event_count}/${step.max} ${step.capped ? "capped" : "allowed"} -> ${step.next || "-"}`;
  return `${step.node_type || "node"} -> ${step.next || "-"}`;
}

function evaluatePreset(name) {
  const nboBase = {
    decision_key: "next_best_offer",
    profile_key: `preset-${name}`,
    identifiers: [{ typeId: "email", value: "user@example.com" }],
    attributes: {
      lead_score: [{ value: 82 }],
      web_engagement_score: [{ value: 71 }],
      interacted_promotions: [{ value: [] }],
      customer_lifetime_value: [{ value: 12400 }],
      monetary_rfm: [{ value: 5 }],
      churn_risk_score: [{ value: 0.2 }],
      outstanding_balance_tier: [{ value: "low" }],
      late_payments_count_12m: [{ value: 0 }],
      survey_nps_latest: [{ value: 8 }],
      sustainability_score: [{ value: 91 }]
    },
    segments: {},
    context: { channel: "email", request_source: "dee_ui" }
  };
  const presets = {
    nbo_green: nboBase,
    nbo_credit: mergeAttributes(nboBase, {
      outstanding_balance_tier: [{ value: "high" }]
    }),
    nbo_retention: mergeAttributes(nboBase, {
      churn_risk_score: [{ value: 0.82 }],
      sustainability_score: [{ value: 20 }],
      customer_lifetime_value: [{ value: 1000 }],
      monetary_rfm: [{ value: 2 }]
    }),
    nbo_premium: mergeAttributes(nboBase, {
      sustainability_score: [{ value: 20 }]
    }),
    nbo_fallback: mergeAttributes(nboBase, {
      lead_score: [{ value: 10 }],
      web_engagement_score: [{ value: 10 }],
      customer_lifetime_value: [{ value: 100 }],
      monetary_rfm: [{ value: 1 }],
      churn_risk_score: [{ value: 0.1 }],
      sustainability_score: [{ value: 10 }],
      survey_nps_latest: [{ value: 4 }]
    }),
    loan: {
      decision_key: "loan_eligibility",
      profile_key: "preset-loan",
      identifiers: [{ typeId: "email", value: "user@example.com" }],
      attributes: {
        lifetime_revenue: [{ value: 8400 }],
        plan_tier: [{ value: "gold" }]
      },
      segments: { vip_customers: true },
      context: { channel: "web", request_source: "dee_ui" }
    }
  };
  return structuredClone(presets[name] || nboBase);
}

function selectedEvaluateRule() {
  const key = document.querySelector("#eval-rule-key").value;
  return cachedRuleSets.find((ruleSet) => ruleSet.decision_key === key) || { decision_key: key };
}

function evaluatePresetForRule(rule = {}) {
  const key = rule.decision_key || "next_best_offer";
  if (key === "loan_eligibility") return evaluatePreset("loan");
  if (key === "next_best_offer") {
    const selectedPreset = document.querySelector("#eval-preset")?.value || "nbo_green";
    return evaluatePreset(selectedPreset.startsWith("nbo_") ? selectedPreset : "nbo_green");
  }
  if (rule.type === "inapp_message") return inAppEvaluatePreset(rule);
  if (rule.type === "experiment") return experimentEvaluatePreset(rule);
  return genericEvaluatePreset(rule);
}

function genericEvaluatePreset(rule) {
  const key = rule.decision_key || "selected_rule";
  return {
    decision_key: key,
    profile_key: `preset-${key}`,
    identifiers: [{ typeId: "email", value: "user@example.com" }],
    attributes: sampleAttributesFromSchema(rule.input_schema),
    segments: {},
    context: {
      channel: rule.surface ? "web" : "email",
      request_source: "dee_ui",
      ...(rule.surface ? { surface: rule.surface } : {})
    }
  };
}

function sampleAttributesFromSchema(schema = {}) {
  const properties = schema.properties || schema.attributes || {};
  return Object.fromEntries(Object.keys(properties).map((key) => [key, [{ value: sampleValueForSchema(properties[key]) }]]));
}

function sampleValueForSchema(schema = {}) {
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (schema.type === "number" || schema.type === "integer") return 1;
  if (schema.type === "boolean") return true;
  if (schema.type === "array") return [];
  if (schema.type === "object") return {};
  return "sample";
}

function inAppEvaluatePreset(rule) {
  return {
    decision_key: rule.decision_key,
    profile_key: `preset-${rule.decision_key}`,
    surface: rule.surface || "homepage_hero",
    limit: 20,
    identifiers: [{ typeId: "email", value: "user@example.com" }],
    attributes: sampleAttributesFromSchema(rule.input_schema),
    segments: {},
    context: {
      channel: "web",
      request_source: "dee_ui",
      surface: rule.surface || "homepage_hero",
      placement: rule.surface || "homepage_hero"
    }
  };
}

function experimentEvaluatePreset(rule, options = {}) {
  return {
    decision_key: rule.decision_key,
    profile_key: `preset-${rule.decision_key}`,
    identifiers: [{ typeId: "email", value: "user@example.com" }],
    attributes: {
      lead_score: [{ value: 68 }],
      web_engagement_score: [{ value: 61 }],
      customer_lifetime_value: [{ value: 5400 }]
    },
    segments: {},
    context: {
      channel: "web",
      request_source: "dee_ui",
      surface: rule.surface || "default",
      ...(options.holdout ? { force_holdout: true } : {})
    }
  };
}

function mergeAttributes(base, attributes) {
  const request = structuredClone(base);
  request.profile_key = `preset-${Object.keys(attributes)[0] || "custom"}`;
  request.attributes = { ...request.attributes, ...attributes };
  return request;
}

async function loadSettings() {
  try {
    const body = await api("/v1/settings");
    const settings = body.settings || {};
    cachedSettings = { settings, runtime: body.runtime || {} };
    document.querySelector("#setting-environment-label").value = settings.environment_label || "";
    document.querySelector("#setting-audit-retention-days").value = settings.audit_retention_days || "";
    document.querySelector("#setting-client-event-retention-days").value = settings.client_event_retention_days || "";
    document.querySelector("#setting-approval-workflow-enabled").value = settings.approval_workflow_enabled === true ? "true" : "false";
    document.querySelector("#setting-bootstrap-tokens-enabled").value = settings.bootstrap_tokens_enabled === false ? "false" : "true";
    document.querySelector("#setting-meiro-url").value = settings.meiro_url || "";
    document.querySelector("#setting-meiro-source-slug").value = settings.meiro_source_slug || "";
    document.querySelector("#setting-meiro-api-url").value = settings.meiro_api_url || "";
    document.querySelector("#setting-meiro-api-token").value = "";
    document.querySelector("#setting-meiro-api-token").placeholder = settings.meiro_api_token_configured ? "Configured" : "";
    document.querySelector("#setting-meiro-profile-cache-ttl").value = settings.meiro_profile_cache_ttl_seconds ?? 300;
    document.querySelector("#setting-meiro-feedback-url").value = settings.meiro_feedback_url || "";
    document.querySelector("#setting-meiro-skill-url").value = settings.meiro_skill_url || "";
    document.querySelector("#setting-meiro-cli-url").value = settings.meiro_cli_url || settings.meiro_url || "";
    document.querySelector("#setting-meiro-cli-token").value = "";
    document.querySelector("#setting-meiro-cli-token").placeholder = settings.meiro_cli_token_configured ? "Configured" : "Separate mpcli token";
    document.querySelector("#setting-schema-sync-interval").value = settings.schema_sync_interval_minutes || 15;
    document.querySelector("#schema-sync-identifier-type").value = settings.schema_sync_identifier_type || "";
    document.querySelector("#schema-sync-identifier-value").value = settings.schema_sync_identifier_value || "";
    document.querySelector("#setting-web-page-variables").value = catalogToText(settings.web_page_variables || defaultWebPageVariables());
    document.querySelector("#setting-web-sdk-conditions").value = catalogToText(settings.web_sdk_conditions || defaultWebSdkConditions());
    document.querySelector("#setting-assistant-llm-enabled").value = settings.assistant_llm_enabled ? "true" : "false";
    document.querySelector("#setting-assistant-llm-provider").value = settings.assistant_llm_provider || "openai";
    document.querySelector("#setting-assistant-llm-base-url").value = settings.assistant_llm_base_url || "";
    document.querySelector("#setting-assistant-llm-model").value = settings.assistant_llm_model || "";
    document.querySelector("#setting-assistant-llm-api-key").value = "";
    document.querySelector("#setting-assistant-llm-api-key").placeholder = settings.assistant_llm_api_key_configured ? "Configured" : "";
    document.querySelector("#setting-assistant-llm-policy").value = settings.assistant_llm_policy || "balanced";
    document.querySelector("#setting-assistant-llm-timeout").value = settings.assistant_llm_timeout_ms || 15000;
    renderSchemaSyncStatus(settings, body.runtime?.schema_sync || {});
    renderSettingsSummary(settings, body.runtime || {});
    renderAssistantProviderStatus(settings, body.runtime || {});
    renderApprovalWorkflowControls();
    renderAssistantProviderConfigHistory(body.runtime?.assistant_provider_config_events || []);
    renderAssistantProviderPlanHistory(body.runtime?.assistant_provider_plan_events || []);
    renderWebTargetingCatalogPreview();
    renderWebTargetingOptions();
    await loadMeiroDeliveries();
    settingsOutput.textContent = JSON.stringify(body, null, 2);
    renderIntegration();
    await loadTokens();
  } catch (error) {
    settingsOutput.textContent = error.message;
    renderSettingsSummary(null, null, error);
  }
}

async function testMeiroConnection(target) {
  try {
    if (meiroTestOutput) meiroTestOutput.textContent = `Testing ${target} connection...`;
    const body = {
      target,
      meiro_url: document.querySelector("#setting-meiro-url").value.trim(),
      meiro_source_slug: document.querySelector("#setting-meiro-source-slug").value.trim(),
      meiro_api_url: document.querySelector("#setting-meiro-api-url").value.trim(),
      meiro_api_token: document.querySelector("#setting-meiro-api-token").value.trim(),
      meiro_profile_cache_ttl_seconds: Number(document.querySelector("#setting-meiro-profile-cache-ttl").value || 0),
      meiro_feedback_url: document.querySelector("#setting-meiro-feedback-url").value.trim(),
      meiro_skill_url: document.querySelector("#setting-meiro-skill-url").value.trim(),
      meiro_cli_url: document.querySelector("#setting-meiro-cli-url").value.trim(),
      meiro_cli_token: document.querySelector("#setting-meiro-cli-token").value.trim(),
      identifier_type: document.querySelector("#schema-sync-identifier-type").value.trim(),
      identifier_value: document.querySelector("#schema-sync-identifier-value").value.trim()
    };
    const response = await api("/v1/settings/test-connection", {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (meiroTestOutput) meiroTestOutput.textContent = JSON.stringify(response, null, 2);
    await loadMeiroDeliveries();
  } catch (error) {
    if (meiroTestOutput) meiroTestOutput.textContent = error.message;
  }
}

async function testAssistantProviderConnection() {
  try {
    if (assistantProviderTestOutput) assistantProviderTestOutput.textContent = "Testing assistant provider...";
    const response = await api("/v1/settings/test-connection", {
      method: "POST",
      body: JSON.stringify({
        target: "assistant_llm",
        assistant_llm_provider: document.querySelector("#setting-assistant-llm-provider").value,
        assistant_llm_base_url: document.querySelector("#setting-assistant-llm-base-url").value.trim(),
        assistant_llm_model: document.querySelector("#setting-assistant-llm-model").value.trim(),
        assistant_llm_api_key: document.querySelector("#setting-assistant-llm-api-key").value.trim(),
        assistant_llm_policy: document.querySelector("#setting-assistant-llm-policy").value,
        assistant_llm_timeout_ms: Number(document.querySelector("#setting-assistant-llm-timeout").value || 15000)
      })
    });
    if (assistantProviderTestOutput) assistantProviderTestOutput.textContent = JSON.stringify(response, null, 2);
    await loadSettings();
  } catch (error) {
    if (assistantProviderTestOutput) assistantProviderTestOutput.textContent = error.message;
    await loadSettings();
  }
}

async function saveSettings(event) {
  event.preventDefault();
  try {
    const payload = {
      environment_label: document.querySelector("#setting-environment-label").value.trim(),
      audit_retention_days: Number(document.querySelector("#setting-audit-retention-days").value || 90),
      client_event_retention_days: Number(document.querySelector("#setting-client-event-retention-days").value || 180),
      approval_workflow_enabled: document.querySelector("#setting-approval-workflow-enabled").value === "true",
      bootstrap_tokens_enabled: document.querySelector("#setting-bootstrap-tokens-enabled").value !== "false",
      meiro_url: document.querySelector("#setting-meiro-url").value.trim(),
      meiro_source_slug: document.querySelector("#setting-meiro-source-slug").value.trim(),
      meiro_api_url: document.querySelector("#setting-meiro-api-url").value.trim(),
      meiro_feedback_url: document.querySelector("#setting-meiro-feedback-url").value.trim(),
      meiro_skill_url: document.querySelector("#setting-meiro-skill-url").value.trim(),
      meiro_cli_url: document.querySelector("#setting-meiro-cli-url").value.trim(),
      meiro_profile_cache_ttl_seconds: Number(document.querySelector("#setting-meiro-profile-cache-ttl").value || 0),
      schema_sync_interval_minutes: Number(document.querySelector("#setting-schema-sync-interval").value || 15),
      schema_sync_identifier_type: document.querySelector("#schema-sync-identifier-type").value.trim(),
      schema_sync_identifier_value: document.querySelector("#schema-sync-identifier-value").value.trim(),
      web_page_variables: parseCatalogText(document.querySelector("#setting-web-page-variables").value),
      web_sdk_conditions: parseCatalogText(document.querySelector("#setting-web-sdk-conditions").value),
      assistant_llm_enabled: document.querySelector("#setting-assistant-llm-enabled").value === "true",
      assistant_llm_provider: document.querySelector("#setting-assistant-llm-provider").value,
      assistant_llm_base_url: document.querySelector("#setting-assistant-llm-base-url").value.trim(),
      assistant_llm_model: document.querySelector("#setting-assistant-llm-model").value.trim(),
      assistant_llm_policy: document.querySelector("#setting-assistant-llm-policy").value,
      assistant_llm_timeout_ms: Number(document.querySelector("#setting-assistant-llm-timeout").value || 15000)
    };
    const apiToken = document.querySelector("#setting-meiro-api-token").value.trim();
    if (apiToken) payload.meiro_api_token = apiToken;
    const cliToken = document.querySelector("#setting-meiro-cli-token").value.trim();
    if (cliToken) payload.meiro_cli_token = cliToken;
    const llmToken = document.querySelector("#setting-assistant-llm-api-key").value.trim();
    if (llmToken) payload.assistant_llm_api_key = llmToken;
    const body = await api("/v1/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    cachedSettings = { ...cachedSettings, settings: body.settings || {} };
    renderSchemaSyncStatus(body.settings || {}, body.runtime?.schema_sync || {});
    renderSettingsSummary(body.settings || {}, body.runtime || {});
    renderAssistantProviderStatus(body.settings || {}, body.runtime || {});
    renderApprovalWorkflowControls();
    renderAssistantProviderConfigHistory(body.runtime?.assistant_provider_config_events || []);
    renderAssistantProviderPlanHistory(body.runtime?.assistant_provider_plan_events || []);
    renderWebTargetingCatalogPreview();
    renderWebTargetingOptions();
    renderIntegration();
    settingsOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    settingsOutput.textContent = error.message;
  }
}

async function syncSchemaFromMeiro() {
  try {
    const body = await api("/v1/schema/sync", {
      method: "POST",
      body: JSON.stringify({
        meiro_api_url: document.querySelector("#setting-meiro-api-url").value.trim(),
        meiro_api_token: document.querySelector("#setting-meiro-api-token").value.trim(),
        identifier_type: document.querySelector("#schema-sync-identifier-type").value.trim(),
        identifier_value: document.querySelector("#schema-sync-identifier-value").value.trim()
      })
    });
    cachedSchema = [
      ...(body.imported?.attributes || []),
      ...(body.imported?.segments || []),
      ...(body.imported?.context || [])
    ];
    await loadSettings();
    renderMessageTokenSuggestions();
    renderBranchEditor();
    schemaOutput.textContent = JSON.stringify(body, null, 2);
    renderSchemaDiagnostics(body.diagnostics);
  } catch (error) {
    await loadSettings();
    schemaOutput.textContent = error.message;
  }
}

async function syncMeiroMetadata() {
  try {
    schemaOutput.textContent = "Syncing Meiro metadata...";
    const body = await api("/v1/meiro/metadata/sync", {
      method: "POST",
      body: JSON.stringify({
        meiro_skill_url: document.querySelector("#setting-meiro-skill-url").value.trim(),
        meiro_cli_url: document.querySelector("#setting-meiro-cli-url").value.trim(),
        meiro_cli_token: document.querySelector("#setting-meiro-cli-token").value.trim(),
        meiro_api_url: document.querySelector("#setting-meiro-api-url").value.trim(),
        meiro_api_token: document.querySelector("#setting-meiro-api-token").value.trim(),
        identifier_type: document.querySelector("#schema-sync-identifier-type").value.trim(),
        identifier_value: document.querySelector("#schema-sync-identifier-value").value.trim()
      })
    });
    cachedSchema = [
      ...(body.imported?.attributes || []),
      ...(body.imported?.segments || []),
      ...(body.imported?.context || [])
    ];
    await loadSettings();
    renderMessageTokenSuggestions();
    renderBranchEditor();
    schemaOutput.textContent = JSON.stringify(body, null, 2);
    renderSchemaDiagnostics(body.diagnostics?.profile_api?.diagnostics || body.diagnostics);
  } catch (error) {
    await loadSettings();
    schemaOutput.textContent = error.message;
  }
}

function renderSchemaSyncStatus(settings, runtime) {
  const target = document.querySelector("#schema-sync-status");
  if (!target) return;
  const status = settings.schema_last_sync_status || "never";
  const lastSync = settings.schema_last_synced_at ? formatTime(settings.schema_last_synced_at) : "never";
  const nextRun = runtime.configured && runtime.next_run_at ? formatTime(runtime.next_run_at) : "not scheduled";
  const count = Number(settings.schema_last_sync_count || 0);
  const error = settings.schema_last_sync_error ? ` Error: ${settings.schema_last_sync_error}` : "";
  target.textContent = `Status: ${status}. Last sync: ${lastSync}. Imported: ${count}. Next sync: ${nextRun}.${error}`;
}

function defaultWebPageVariables() {
  return [
    { key: "page_type", label: "Page type", description: "product, category, search, cart, checkout, homepage" },
    { key: "product_category", label: "Product category", description: "Current product or listing category" },
    { key: "logged_in", label: "Logged in", description: "true when the visitor is authenticated" }
  ];
}

function defaultWebSdkConditions() {
  return [
    { key: "cart_is_not_empty", label: "Cart is not empty", description: "true when the visitor has cart items" },
    { key: "has_search_results", label: "Has search results", description: "true after a successful site search" },
    { key: "recommendations_available", label: "Recommendations available", description: "true when the recommender has products to render" }
  ];
}

function parseCatalogText(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, label, ...detailParts] = line.split("|").map((part) => part.trim());
      return {
        key: slug(key || label || "item"),
        label: label || key || "Catalog item",
        description: detailParts.join(" | ")
      };
    })
    .filter((item) => item.key);
}

function catalogToText(items = []) {
  const catalog = Array.isArray(items) && items.length ? items : [];
  return catalog.map((item) => [item.key, item.label, item.description].filter((value) => value != null && String(value).trim()).join(" | ")).join("\n");
}

function webTargetingCatalog() {
  return {
    pageVariables: parseCatalogText(document.querySelector("#setting-web-page-variables")?.value || catalogToText(cachedSettings.settings?.web_page_variables || defaultWebPageVariables())),
    sdkConditions: parseCatalogText(document.querySelector("#setting-web-sdk-conditions")?.value || catalogToText(cachedSettings.settings?.web_sdk_conditions || defaultWebSdkConditions()))
  };
}

function renderWebTargetingCatalogPreview() {
  const target = document.querySelector("#web-targeting-catalog-preview");
  if (!target) return;
  const catalog = webTargetingCatalog();
  target.innerHTML = `
    <div>
      <strong>Page variables</strong>
      <span>${escapeHtml(catalog.pageVariables.length ? catalog.pageVariables.map((item) => item.key).join(", ") : "No page variables documented.")}</span>
    </div>
    <div>
      <strong>SDK conditions</strong>
      <span>${escapeHtml(catalog.sdkConditions.length ? catalog.sdkConditions.map((item) => item.key).join(", ") : "No SDK conditions documented.")}</span>
    </div>
  `;
}

function renderWebTargetingOptions() {
  const catalog = webTargetingCatalog();
  const pageVariableOptions = document.querySelector("#web-page-variable-options");
  if (pageVariableOptions) {
    pageVariableOptions.innerHTML = catalog.pageVariables
      .map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml([item.label, item.description].filter(Boolean).join(" - "))}</option>`)
      .join("");
  }
  const conditionOptions = document.querySelector("#web-sdk-condition-options");
  if (conditionOptions) {
    conditionOptions.innerHTML = catalog.sdkConditions
      .map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml([item.label, item.description].filter(Boolean).join(" - "))}</option>`)
      .join("");
  }
}

async function loadMeiroDeliveries() {
  try {
    const params = new URLSearchParams();
    const target = document.querySelector("#meiro-delivery-target")?.value || "";
    const ok = document.querySelector("#meiro-delivery-ok")?.value || "";
    const search = document.querySelector("#meiro-delivery-search")?.value.trim() || "";
    const limit = document.querySelector("#meiro-delivery-limit")?.value || "25";
    if (target) params.set("target", target);
    if (ok) params.set("ok", ok);
    if (search) params.set("search", search);
    if (limit) params.set("limit", limit);
    const body = await api(`/v1/meiro-deliveries?${params}`);
    cachedMeiroDeliveries = body.deliveries || [];
    renderMeiroDeliverySummary(body.summary || {});
    renderMeiroDeliveries(body.deliveries || []);
  } catch (error) {
    if (meiroDeliveryStatus) meiroDeliveryStatus.innerHTML = row([error.message, "", "", "", ""]);
    if (meiroDeliverySummary) meiroDeliverySummary.innerHTML = "";
    if (meiroDeliveryDetail) meiroDeliveryDetail.innerHTML = "";
  }
}

function renderMeiroDeliverySummary(summary = {}) {
  if (!meiroDeliverySummary) return;
  meiroDeliverySummary.innerHTML = [
    statusItem("Attempts", formatNumber(summary.total || 0)),
    statusItem("Success rate", formatPercent(summary.success_rate || 0)),
    statusItem("Failed", formatNumber(summary.failed || 0)),
    statusItem("Avg latency", `${formatNumber(summary.avg_duration_ms || 0)}ms`),
    statusItem("Last attempt", summary.last_attempted_at ? formatTime(summary.last_attempted_at) : "-")
  ].join("");
}

function renderMeiroDeliveries(deliveries = []) {
  if (!meiroDeliveryStatus) return;
  meiroDeliveryStatus.innerHTML = header(["Time", "Target", "Result", "Latency", "Endpoint", "Message"]);
  if (!deliveries.length) {
    meiroDeliveryStatus.innerHTML += row(["No delivery attempts match the current filters", "", "", "", "", ""]);
    if (meiroDeliveryDetail) meiroDeliveryDetail.innerHTML = "";
    return;
  }
  meiroDeliveryStatus.innerHTML += deliveries
    .map((item) => row([
      item.attempted_at ? formatTime(item.attempted_at) : "-",
      item.target || "-",
      `${item.ok ? "OK" : "Failed"} · ${item.status || 0}`,
      `${formatNumber(item.duration_ms || 0)}ms`,
      item.endpoint || "-",
      item.error || item.response_preview || "-"
    ], { deliveryId: item.id }))
    .join("");
  meiroDeliveryStatus.querySelectorAll("[data-delivery-id]").forEach((element) => {
    element.addEventListener("click", () => renderMeiroDeliveryDetail(element.dataset.deliveryId));
  });
  renderMeiroDeliveryDetail(deliveries[0].id);
}

function renderMeiroDeliveryDetail(id) {
  if (!meiroDeliveryDetail) return;
  const item = cachedMeiroDeliveries.find((delivery) => delivery.id === id);
  if (!item) {
    meiroDeliveryDetail.innerHTML = "";
    return;
  }
  meiroDeliveryDetail.innerHTML = `
    <div class="delivery-detail-head">
      <div>
        <strong>${escapeHtml(item.target || "Delivery attempt")}</strong>
        <span>${escapeHtml(item.endpoint || "-")}</span>
      </div>
      <span class="delivery-result-pill ${item.ok ? "ok" : "error"}">${escapeHtml(item.ok ? "OK" : "Failed")} · ${escapeHtml(item.status || 0)}</span>
    </div>
    <div class="delivery-detail-grid">
      ${statusItem("Attempted", item.attempted_at ? formatTime(item.attempted_at) : "-")}
      ${statusItem("Latency", `${formatNumber(item.duration_ms || 0)}ms`)}
      ${statusItem("Delivery ID", item.id || "-")}
      ${statusItem("Error", item.error || "-")}
    </div>
    <div class="delivery-detail-columns">
      <div>
        <strong>Request payload</strong>
        <pre>${escapeHtml(JSON.stringify(item.payload || {}, null, 2))}</pre>
      </div>
      <div>
        <strong>Response preview</strong>
        <pre>${escapeHtml(item.response_preview || item.error || "-")}</pre>
      </div>
    </div>
  `;
}

function renderSchemaDiagnostics(diagnostics = null) {
  if (!schemaImportDiagnostics) return;
  if (!diagnostics) {
    schemaImportDiagnostics.innerHTML = "";
    return;
  }
  const summary = diagnostics.summary || {};
  const kinds = [
    ["Attributes", diagnostics.attributes],
    ["Segments", diagnostics.segments],
    ["Context", diagnostics.context]
  ];
  schemaImportDiagnostics.innerHTML = `
    <div class="schema-diagnostic-summary">
      ${statusItem("Imported", formatNumber(summary.imported || 0))}
      ${statusItem("Skipped", formatNumber(summary.skipped || 0))}
      ${statusItem("Failed", formatNumber(summary.failed || 0))}
    </div>
    <div class="schema-diagnostic-details">
      ${kinds.map(([label, detail = {}]) => `
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span>${formatNumber(detail.imported || 0)} imported</span>
          ${(detail.skipped || []).map((item) => `<small>Skipped ${escapeHtml(item.name || `#${item.index}`)}: ${escapeHtml(item.reason)}</small>`).join("")}
          ${(detail.failed || []).map((item) => `<small>Failed ${escapeHtml(item.name || `#${item.index ?? "-"}`)}: ${escapeHtml(item.reason)}</small>`).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderSettingsSummary(settings, runtime, error = null) {
  if (!settingsHealthSummary) return;
  if (error) {
    settingsHealthSummary.innerHTML = `<div class="settings-health-item warn"><strong>Settings unavailable</strong><span>${escapeHtml(error.message)}</span></div>`;
    return;
  }
  const schemaRuntime = runtime?.schema_sync || {};
  const profileCache = runtime?.profile_cache || {};
  const collectorConfigured = Boolean(settings?.meiro_url && settings?.meiro_source_slug);
  const feedbackConfigured = Boolean(settings?.meiro_feedback_url);
  const apiConfigured = Boolean(settings?.meiro_api_url && settings?.meiro_api_token_configured);
  const metadataConfigured = Boolean((settings?.meiro_cli_url || settings?.meiro_url) && settings?.meiro_cli_token_configured);
  const assistantBaseConfigured = settings?.assistant_llm_provider === "openai" || Boolean(settings?.assistant_llm_base_url);
  const assistantConfigured = Boolean(settings?.assistant_llm_enabled && assistantBaseConfigured && settings?.assistant_llm_model && settings?.assistant_llm_api_key_configured);
  const assistantProvider = runtime?.assistant_provider || {};
  const assistantCalls = assistantProvider.calls || {};
  const assistantLast = assistantProvider.last_call || null;
  const storeAdapter = runtime?.store_adapter || {};
  const adapterInfo = storeAdapter.adapter_info || {};
  const deployment = storeAdapter.deployment || {};
  const postgresRuntime = storeAdapter.postgres || {};
  const productionReady = deployment.status === "production_ready";
  const schemaStatus = settings?.schema_last_sync_status || "never";
  const schemaHealthy = ["ok", "success"].includes(schemaStatus);
  const schemaDetail = settings?.schema_last_synced_at
    ? `${formatTime(settings.schema_last_synced_at)} · ${Number(settings.schema_last_sync_count || 0)} fields`
    : "No schema sync completed yet";
  const nextRun = schemaRuntime.configured && schemaRuntime.next_run_at ? formatTime(schemaRuntime.next_run_at) : "Not scheduled";
  const items = [
    {
      label: "Environment",
      value: settings?.environment_label || "local",
      detail: `${Number(settings?.audit_retention_days || 90)}d audit · ${Number(settings?.client_event_retention_days || 180)}d client events`,
      ok: true
    },
    {
      label: "Persistence",
      value: productionReady ? "Production ready" : deployment.status === "single_instance" ? "Single instance" : adapterInfo.label || storeAdapter.adapter || "SQLite",
      detail: deployment.summary || adapterInfo.production_notes || "Store adapter metadata unavailable",
      ok: productionReady
    },
    storeAdapterDetailItem(storeAdapter, adapterInfo, postgresRuntime),
    ...storeDeploymentHealthItems(deployment),
    {
      label: "Meiro Collector",
      value: collectorConfigured ? "Configured" : "Incomplete",
      detail: collectorConfigured ? [settings.meiro_url, "collect", settings.meiro_source_slug].join("/") : "Set Meiro URL and source slug",
      ok: collectorConfigured
    },
    {
      label: "Feedback Endpoint",
      value: feedbackConfigured ? "Configured" : "Incomplete",
      detail: feedbackConfigured ? settings.meiro_feedback_url : "Set explicit feedback endpoint",
      ok: feedbackConfigured
    },
    {
      label: "Profile API",
      value: apiConfigured ? "Configured" : "Incomplete",
      detail: apiConfigured ? `${settings.meiro_api_url} · ${Number(settings.meiro_profile_cache_ttl_seconds || 0)}s profile TTL` : "Set Profile API URL and token for schema import and client enrichment",
      ok: apiConfigured
    },
    {
      label: "Profile Cache",
      value: `${Math.round((profileCache.hit_rate || 0) * 100)}% hit rate`,
      detail: `${formatNumber(profileCache.entries || 0)} entries · ${formatNumber(profileCache.not_found || 0)} not found · ${formatNumber(profileCache.errors || 0)} lookup errors`,
      ok: Number(profileCache.errors || 0) === 0
    },
    {
      label: "Assistant LLM",
      value: settings?.assistant_llm_enabled ? assistantConfigured ? "Enabled" : "Incomplete" : "Disabled",
      detail: settings?.assistant_llm_enabled
        ? `${assistantProviderLabel(settings.assistant_llm_provider)} · ${settings.assistant_llm_model || "no model"} · ${formatNumber(assistantCalls.total || 0)} calls · last ${assistantLast?.status || "none"}`
        : "Deterministic planner only",
      ok: (!settings?.assistant_llm_enabled || assistantConfigured) && Number(assistantCalls.error_rate || 0) < 0.1
    },
    {
      label: "Meiro Metadata",
      value: metadataConfigured ? "Configured" : "CLI token missing",
      detail: metadataConfigured ? (settings.meiro_cli_url || settings.meiro_url) : "Add separate mpcli token for catalog and audience sync",
      ok: metadataConfigured
    },
    {
      label: "Schema Sync",
      value: schemaStatus,
      detail: `${schemaDetail}. Next: ${nextRun}`,
      ok: schemaHealthy
    },
    {
      label: "Bootstrap Tokens",
      value: settings?.bootstrap_tokens_enabled === false ? "Disabled" : "Enabled",
      detail: settings?.bootstrap_tokens_enabled === false ? "DB tokens are required" : "Static admin token remains accepted",
      ok: settings?.bootstrap_tokens_enabled === false
    },
    {
      label: "Approval Workflow",
      value: settings?.approval_workflow_enabled === true ? "Enabled" : "Disabled",
      detail: settings?.approval_workflow_enabled === true
        ? "Drafts must be submitted and approved before publish"
        : "Publish uses validation preview without approval gating",
      ok: true
    }
  ];
  settingsHealthSummary.innerHTML = items
    .map((item) => `
      <div class="settings-health-item ${item.ok ? "ok" : "warn"} ${item.className || ""}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <span>${escapeHtml(item.detail)}</span>
        ${(item.meta || []).map((meta) => `<small>${escapeHtml(meta)}</small>`).join("")}
      </div>
    `)
    .join("");
}

function storeAdapterDetailItem(storeAdapter = {}, adapterInfo = {}, postgresRuntime = {}) {
  const capabilities = adapterInfo.capabilities || {};
  const isPostgresSnapshot = storeAdapter.adapter === "postgres" || postgresRuntime.mode === "snapshot";
  const snapshot = postgresRuntime.snapshot || null;
  const savedSnapshot = postgresRuntime.saved_snapshot || null;
  const mode = isPostgresSnapshot ? "Postgres snapshot" : adapterInfo.label || storeAdapter.adapter || "SQLite";
  const flags = [
    capabilities.managed_database ? "managed DB" : "local file",
    capabilities.multi_instance ? "multi-replica" : "single writer",
    capabilities.native_row_store ? "row-level store" : capabilities.snapshot_persistence ? "snapshot store" : "embedded store"
  ];
  const meta = [
    `Mode: ${mode}`,
    `Capabilities: ${flags.join(", ")}`
  ];
  if (isPostgresSnapshot) {
    meta.push(`Table: ${postgresRuntime.table || "dee_store_snapshots"}`);
    meta.push(`Revision: ${formatNumber(postgresRuntime.revision || 0)}${postgresRuntime.saved_at ? ` saved ${formatTime(postgresRuntime.saved_at)}` : " not saved yet"}`);
    if (snapshot) meta.push(`Current snapshot: ${formatNumber(snapshot.row_count || 0)} rows, ${formatBytes(snapshot.size_bytes || 0)}`);
    if (savedSnapshot) meta.push(`Saved snapshot: ${formatNumber(savedSnapshot.row_count || 0)} rows, ${formatBytes(savedSnapshot.size_bytes || 0)}`);
  } else {
    meta.push(storeAdapter.path ? `Path: ${storeAdapter.path}` : "Path: configured data directory");
  }
  return {
    label: "Store Adapter",
    value: adapterInfo.label || storeAdapter.adapter || "SQLite",
    detail: adapterInfo.production_notes || "Store adapter metadata unavailable",
    ok: capabilities.persistent === true && (capabilities.managed_database === true || capabilities.recommended_max_replicas === 1),
    className: "wide",
    meta
  };
}

function storeDeploymentHealthItems(deployment = {}) {
  const checks = Array.isArray(deployment.checks) ? deployment.checks : [];
  return checks
    .filter((check) => check.key !== "database_connection")
    .map((check) => ({
      label: `Store: ${check.label || check.key}`,
      value: check.ok ? "Ready" : check.level === "error" ? "Blocked" : "Review",
      detail: check.detail || "",
      ok: check.ok
    }));
}

function renderAssistantProviderStatus(settings = {}, runtime = {}) {
  if (!assistantProviderStatus) return;
  const enabled = settings.assistant_llm_enabled === true;
  const baseConfigured = settings.assistant_llm_provider === "openai" || Boolean(settings.assistant_llm_base_url);
  const baseUrl = settings.assistant_llm_base_url || (settings.assistant_llm_provider === "openai" ? "https://api.openai.com/v1" : "");
  const configured = Boolean(enabled && baseConfigured && settings.assistant_llm_model && settings.assistant_llm_api_key_configured);
  const providerMetrics = runtime.assistant_provider || {};
  const calls = providerMetrics.calls || {};
  const tests = providerMetrics.tests || {};
  const usage = providerMetrics.usage || {};
  const lastCall = providerMetrics.last_call || null;
  const lastTest = providerMetrics.last_test || null;
  const callHealthy = Number(calls.error_rate || 0) < 0.1;
  const items = [
    {
      label: "Mode",
      value: enabled ? "LLM proposals enabled" : "Deterministic only",
      detail: enabled ? "Provider plans are still validated before use." : "No provider calls are made.",
      ok: !enabled || configured
    },
    {
      label: "Provider",
      value: assistantProviderLabel(settings.assistant_llm_provider),
      detail: baseUrl || "No base URL configured",
      ok: !enabled || baseConfigured
    },
    {
      label: "Model",
      value: settings.assistant_llm_model || "Not set",
      detail: settings.assistant_llm_api_key_configured ? "API key configured" : "API key not configured",
      ok: !enabled || Boolean(settings.assistant_llm_model && settings.assistant_llm_api_key_configured)
    },
    {
      label: "Policy",
      value: assistantProviderPolicyLabel(settings.assistant_llm_policy),
      detail: "Controls provider prompt strictness; server guardrails still enforce draft-only actions.",
      ok: true
    },
    {
      label: "Plan calls",
      value: formatNumber(calls.total || 0),
      detail: `${formatPercent(calls.error_rate || 0)} fallback/error rate · ${formatNumber(calls.p95_ms || 0)}ms p95`,
      ok: callHealthy
    },
    {
      label: "Last plan",
      value: lastCall ? `${lastCall.mode} · ${lastCall.status}` : "No calls yet",
      detail: lastCall ? `${lastCall.at ? formatTime(lastCall.at) : "-"} · ${formatNumber(lastCall.duration_ms || 0)}ms` : "Ask the assistant to create or advise on a draft.",
      ok: !lastCall || lastCall.ok !== false
    },
    {
      label: "Connection tests",
      value: `${formatNumber(tests.total || 0)} run`,
      detail: lastTest ? `${lastTest.status} · ${formatTime(lastTest.at)} · ${formatNumber(lastTest.duration_ms || 0)}ms` : "No provider test has been run in this process.",
      ok: !lastTest || lastTest.ok !== false
    },
    {
      label: "Token usage",
      value: formatNumber(usage.total_tokens || 0),
      detail: `${formatNumber(usage.prompt_tokens || 0)} prompt · ${formatNumber(usage.completion_tokens || 0)} completion tokens`,
      ok: true
    }
  ];
  assistantProviderStatus.innerHTML = items.map((item) => `
    <div class="settings-health-item ${item.ok ? "ok" : "warn"}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    </div>
  `).join("");
}

function renderAssistantProviderConfigHistory(events = []) {
  if (!assistantProviderConfigHistory) return;
  assistantProviderConfigHistory.innerHTML = events.length
    ? `<div class="governance-timeline">${events.map((event) => `
      <div class="timeline-item">
        <span>${escapeHtml(event.changed_at ? formatTime(event.changed_at) : "-")}</span>
        <strong>${escapeHtml(event.changed_by || "system")}</strong>
        <small>${assistantProviderChangeSummary(event.changes || {})}</small>
      </div>
    `).join("")}</div>`
    : `<div class="timeline-empty">No assistant provider configuration changes recorded yet.</div>`;
}

function renderAssistantProviderPlanHistory(events = []) {
  if (!assistantProviderPlanHistory) return;
  assistantProviderPlanHistory.innerHTML = events.length
    ? `<div class="governance-timeline">${events.map((event) => `
      <div class="timeline-item assistant-plan-audit-item">
        <span>${escapeHtml(event.planned_at ? formatTime(event.planned_at) : "-")} · ${escapeHtml(event.planned_by || "system")}</span>
        <strong>${escapeHtml(event.mode || "deterministic")} · ${escapeHtml(event.status || "unknown")} · ${escapeHtml(event.governance_status || "unknown")}</strong>
        <small>${escapeHtml(assistantProviderPlanSummary(event))}</small>
      </div>
    `).join("")}</div>`
    : `<div class="timeline-empty">No assistant plan audit events recorded yet.</div>`;
}

function assistantProviderPlanSummary(event = {}) {
  return [
    event.provider || "deterministic",
    event.model || "no model",
    assistantProviderPolicyLabel(event.policy),
    event.contract_version || "assistant-plan-v2",
    `${formatNumber(event.duration_ms || 0)}ms`,
    `${formatNumber(event.action_count || 0)} actions`,
    `${formatNumber(event.warning_count || 0)} warnings`,
    `prompt ${shortHash(event.prompt_hash)} (${formatNumber(event.prompt_length || 0)} chars)`
  ].join(" · ");
}

function assistantProviderChangeSummary(changes = {}) {
  const labels = {
    assistant_llm_enabled: "Mode",
    assistant_llm_provider: "Provider",
    assistant_llm_base_url: "Base URL",
    assistant_llm_model: "Model",
    assistant_llm_api_key: "API key",
    assistant_llm_policy: "Policy",
    assistant_llm_timeout_ms: "Timeout"
  };
  const items = Object.entries(changes).map(([key, change]) => {
    const from = change?.from || "(empty)";
    const to = change?.to || "(empty)";
    return `${labels[key] || key}: ${from} -> ${to}`;
  });
  return escapeHtml(items.join(" · ") || "No visible changes");
}

function shortHash(value) {
  return value ? `${String(value).slice(0, 10)}...` : "none";
}

function assistantProviderLabel(provider) {
  if (provider === "openai") return "OpenAI / ChatGPT API";
  if (provider === "openai_compatible") return "OpenAI-compatible endpoint";
  return provider || "OpenAI / ChatGPT API";
}

function assistantProviderPolicyLabel(policy) {
  if (policy === "conservative") return "Conservative";
  if (policy === "creative") return "Creative";
  return "Balanced";
}

async function importSchema() {
  try {
    const body = await api("/v1/schema/import", {
      method: "POST",
      body: document.querySelector("#schema-import").value || "{}"
    });
    cachedSchema = [
      ...(body.imported?.attributes || []),
      ...(body.imported?.segments || []),
      ...(body.imported?.context || [])
    ];
    renderMessageTokenSuggestions();
    renderBranchEditor();
    schemaOutput.textContent = JSON.stringify(body, null, 2);
    renderSchemaDiagnostics(body.diagnostics);
  } catch (error) {
    schemaOutput.textContent = error.message;
  }
}

async function loadSchema({ silent = false } = {}) {
  try {
    const body = await api("/v1/schema");
    cachedSchema = body.schema || [];
    renderMessageTokenSuggestions();
    renderBranchEditor();
    if (!silent) schemaOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    if (!silent) schemaOutput.textContent = error.message;
  }
}

async function loadConditionBlocks({ silent = false } = {}) {
  try {
    const body = await api("/v1/condition-blocks");
    cachedConditionBlocks = body.condition_blocks || [];
    conditionBlocksLoaded = true;
    renderConditionBlockManager();
    renderBranchEditor();
    if (!selectedConditionBlockId && cachedConditionBlocks[0]) editConditionBlock(cachedConditionBlocks[0].id);
  } catch (error) {
    cachedConditionBlocks = [];
    conditionBlocksLoaded = false;
    renderConditionBlockManager();
    if (!silent && conditionBlockOutput) conditionBlockOutput.textContent = error.message;
  }
}

function renderConditionBlockManager() {
  if (!conditionBlockList) return;
  const blocks = availableConditionBlocks();
  conditionBlockList.innerHTML = blocks.length
    ? blocks.map((block) => `
      <button type="button" class="condition-block-card ${block.id === selectedConditionBlockId ? "active" : ""}" data-condition-block-id="${escapeHtml(block.id)}">
        <strong>${escapeHtml(block.name || block.id)}</strong>
        <span>${escapeHtml(`${block.conditions?.length || 0} conditions · ${block.description || block.id}`)}</span>
      </button>
    `).join("")
    : `<div class="status-line">No reusable blocks yet.</div>`;
  conditionBlockList.querySelectorAll("[data-condition-block-id]").forEach((button) => {
    button.addEventListener("click", () => editConditionBlock(button.dataset.conditionBlockId));
  });
}

function editConditionBlock(id) {
  const block = availableConditionBlocks().find((item) => item.id === id);
  if (!block) return;
  selectedConditionBlockId = block.id;
  document.querySelector("#condition-block-id").value = block.id || "";
  document.querySelector("#condition-block-name").value = block.name || "";
  document.querySelector("#condition-block-description").value = block.description || "";
  document.querySelector("#condition-block-conditions").value = JSON.stringify(block.conditions || [], null, 2);
  renderConditionBlockManager();
  if (conditionBlockOutput) conditionBlockOutput.textContent = "";
}

function newConditionBlock() {
  selectedConditionBlockId = null;
  document.querySelector("#condition-block-id").value = "";
  document.querySelector("#condition-block-name").value = "";
  document.querySelector("#condition-block-description").value = "";
  document.querySelector("#condition-block-conditions").value = JSON.stringify([
    { source: "attribute", key: "", operator: "equals", value: "" }
  ], null, 2);
  renderConditionBlockManager();
  if (conditionBlockOutput) conditionBlockOutput.textContent = "Create a reusable block, then save it.";
}

async function saveConditionBlock() {
  try {
    const id = slug(document.querySelector("#condition-block-id").value || document.querySelector("#condition-block-name").value);
    if (!id) throw new Error("Block ID or name is required");
    const conditions = parseJsonStrict(document.querySelector("#condition-block-conditions").value || "[]", "Conditions JSON");
    const payload = {
      id,
      name: document.querySelector("#condition-block-name").value.trim() || id,
      description: document.querySelector("#condition-block-description").value.trim(),
      conditions
    };
    const body = await api(`/v1/condition-blocks/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    selectedConditionBlockId = body.condition_block?.id || id;
    await loadConditionBlocks({ silent: true });
    if (conditionBlockOutput) conditionBlockOutput.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    if (conditionBlockOutput) conditionBlockOutput.textContent = error.message;
  }
}

async function deleteConditionBlock() {
  try {
    const id = selectedConditionBlockId || document.querySelector("#condition-block-id").value.trim();
    if (!id) throw new Error("Select a condition block first");
    await api(`/v1/condition-blocks/${encodeURIComponent(id)}`, { method: "DELETE" });
    selectedConditionBlockId = null;
    await loadConditionBlocks({ silent: true });
    newConditionBlock();
    if (conditionBlockOutput) conditionBlockOutput.textContent = "Condition block deleted.";
  } catch (error) {
    if (conditionBlockOutput) conditionBlockOutput.textContent = error.message;
  }
}

async function loadIntegration() {
  try {
    const body = await api("/v1/settings");
    cachedSettings = { settings: body.settings || {}, runtime: body.runtime || {} };
    renderSettingsSummary(body.settings || {}, body.runtime || {});
    renderIntegration();
  } catch (error) {
    if (integrationResponse) integrationResponse.textContent = error.message;
  }
}

function renderIntegration() {
  if (!integrationTemplate || !integrationResponse) return;
  const settings = cachedSettings.settings || {};
  const runtime = cachedSettings.runtime || {};
  const endpoint = `${runtime.docker_url || "http://localhost:8090"}/v1/evaluate`;
  const collectorEndpoint = [settings.meiro_url, "collect", settings.meiro_source_slug].filter(Boolean).join("/");
  const feedbackEndpoint = settings.meiro_feedback_url || collectorEndpoint;
  document.querySelector("#integration-endpoint").value = endpoint;
  document.querySelector("#integration-meiro-url").value = feedbackEndpoint || "";
  integrationTemplate.value = [
    "POST " + endpoint,
    "Authorization: Bearer <DEE_EVALUATE_TOKEN>",
    "Content-Type: application/json",
    "",
    JSON.stringify(evaluatePreset("nbo_green"), null, 2)
  ].join("\n");
  integrationResponse.textContent = JSON.stringify({
    decision_key: "next_best_offer",
    profile_key: "meiro-profile-key",
    rule_version: 1,
    result: "eligible",
    outputs: {
      offer_id: "solar_green_energy",
      offer_tier: "premium",
      promotion_category: "green_energy",
      suppression_reason: null,
      priority: 80
    },
    matched_rules: ["green_energy_offer"],
    errors: []
  }, null, 2) + `\n\nForward this result to Meiro:\nPOST ${feedbackEndpoint || "<MEIRO_FEEDBACK_ENDPOINT>"}`;
}

async function loadTokens() {
  const target = document.querySelector("#token-list");
  target.innerHTML = header(["Name", "Scopes", "Allowed decisions", "Client constraints", "Last used", "Status"]);
  try {
    const body = await api("/v1/tokens");
    target.innerHTML += body.tokens
      .map((token) =>
        row(
          [
            token.name,
            token.scopes.join(", "),
            token.decision_keys?.length ? token.decision_keys.join(", ") : "All",
            tokenConstraintSummary(token),
            token.last_used_at || "-",
            token.revoked_at ? "revoked" : "active"
          ],
          { tokenId: token.id }
        )
      )
      .join("");
    document.querySelectorAll("[data-token-id]").forEach((element) => {
      element.addEventListener("click", () => revokeToken(element.dataset.tokenId));
    });
  } catch (error) {
    target.innerHTML += row([error.message, "", "", "", ""]);
  }
}

async function createToken(event) {
  event.preventDefault();
  try {
    const body = await api("/v1/tokens", {
      method: "POST",
      body: JSON.stringify({
        name: document.querySelector("#token-name").value.trim() || "API token",
        scopes: document.querySelector("#token-scopes").value.split(","),
        decision_keys: document
          .querySelector("#token-decision-keys")
          .value.split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        metadata: {
          allowed_origins: document
            .querySelector("#token-allowed-origins")
            .value.split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          environment: document.querySelector("#token-environment").value.trim(),
          app_id: document.querySelector("#token-app-id").value.trim()
        }
      })
    });
    tokenOutput.textContent = `Copy this token now. It will not be shown again.\n\n${JSON.stringify(body, null, 2)}`;
    await loadTokens();
  } catch (error) {
    tokenOutput.textContent = error.message;
  }
}

function tokenConstraintSummary(token = {}) {
  const metadata = token.metadata || {};
  const parts = [
    metadata.allowed_origins?.length ? `Origins: ${metadata.allowed_origins.join(", ")}` : "",
    metadata.environment ? `Env: ${metadata.environment}` : "",
    metadata.app_id ? `App: ${metadata.app_id}` : ""
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "None";
}

async function revokeToken(id) {
  if (!id) return;
  try {
    const body = await api(`/v1/tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
    tokenOutput.textContent = JSON.stringify(body, null, 2);
    await loadTokens();
  } catch (error) {
    tokenOutput.textContent = error.message;
  }
}
