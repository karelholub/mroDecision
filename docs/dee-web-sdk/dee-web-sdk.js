(function(global) {
  "use strict";

  const defaults = {
    baseUrl: "",
    token: "",
    placementSelector: "[data-dee-placement][data-dee-decision-key]",
    profileKey: "",
    identifier: null,
    profileEnrichment: "off",
    requestSource: "dee_web_sdk",
    autoEvaluate: true,
    autoExposure: true,
    debug: false,
    maxItems: 10,
    fallback: "keep",
    consentProvider: null,
    pageVariables: {},
    conditions: {},
    dataLayerName: "dataLayer",
    renderers: {}
  };

  function createClient(options) {
    const config = { ...defaults, ...(options || {}) };
    const state = {
      decisions: new WeakMap()
    };

    function init(root) {
      const scope = root || document;
      const placements = Array.from(scope.querySelectorAll(config.placementSelector));
      placements.forEach((element) => wirePlacement(element));
      if (config.autoEvaluate) {
        placements.forEach((element) => schedulePlacement(element));
      }
      return placements;
    }

    function wirePlacement(element) {
      if (!element || element.dataset.deeWired === "true") return;
      element.dataset.deeWired = "true";
      element.addEventListener("click", (event) => {
        const action = event.target.closest("[data-dee-conversion]");
        if (action && element.contains(action)) {
          const decision = state.decisions.get(element);
          const name = action.dataset.deeConversion || "interaction";
          if (decision) {
            trackConversion(name, element, {
              action: name,
              value: action.dataset.deeValue || action.dataset.deeSurveyValue || action.value || action.textContent?.trim() || "",
              label: action.dataset.deeLabel || action.getAttribute("aria-label") || action.textContent?.trim() || ""
            }).catch(() => {});
          }
          return;
        }
        const link = event.target.closest("a");
        if (!link || !element.contains(link)) return;
        const decision = state.decisions.get(element);
        if (decision) trackConversion("click", element, { link_url: link.href }).catch(() => {});
      });
    }

    function schedulePlacement(element) {
      const trigger = triggerSettings(element);
      if (trigger.type === "manual") return;
      if (trigger.type === "dom_ready") {
        onDomReady(() => evaluatePlacement(element).catch((error) => log("Placement evaluation failed", error)));
        return;
      }
      if (trigger.type === "custom_event" && trigger.event) {
        global.addEventListener(trigger.event, (event) => {
          if (triggerMatches(trigger, event.detail || {})) {
            evaluatePlacement(element, { context: { trigger_event: trigger.event, trigger_payload: event.detail || {} } }).catch((error) => log("Placement evaluation failed", error));
          }
        });
        return;
      }
      if (trigger.type === "data_layer_event" && trigger.event) {
        wireDataLayerTrigger(element, trigger, evaluatePlacement, config);
        return;
      }
      evaluatePlacement(element).catch((error) => log("Placement evaluation failed", error));
    }

    async function evaluatePlacement(element, overrides) {
      const precheck = placementPrecheck(element, config, overrides);
      if (!precheck.ok) {
        dispatchSkipped(element, precheck.reason, precheck.detail);
        return null;
      }
      const request = buildEvaluateRequest(element, overrides);
      const decision = await post("/v1/client/evaluate", request);
      const postcheck = decisionPrecheck(element, decision, config);
      if (!postcheck.ok) {
        state.decisions.set(element, decision);
        dispatchSkipped(element, postcheck.reason, { decision, ...(postcheck.detail || {}) });
        return decision;
      }
      const renderResult = await renderDecision(element, decision);
      const rendered = renderResult.rendered;
      state.decisions.set(element, decision);
      element.dispatchEvent(new CustomEvent("dee:decision", { detail: { decision, rendered, diagnostics: renderResult.diagnostics || [] } }));
      if (rendered && config.autoExposure && decision.experiment?.variant_key) {
        await sendEvent(element, "exposure", decision).catch((error) => log("Exposure failed", error));
      }
      if (rendered) recordDisplay(element, decision);
      return decision;
    }

    async function sendEvent(element, type, decision, extra) {
      const placement = placementName(element);
      const variantKey = decisionVariantKey(decision);
      const messageVariantKey = messageVariant(decision);
      const payload = {
        event_id: eventId(type, decision, placement),
        decision_key: decision?.decision_key || element.dataset.deeDecisionKey || "",
        profile_key: decision?.profile_key || profileKey(),
        rule_version: decision?.rule_version || null,
        variant_key: variantKey || null,
        message_id: messageId(decision),
        surface: placement,
        object_type: element.dataset.deeObjectType || "placement",
        object_id: element.dataset.deeObjectId || placement,
        context: {
          page_url: location.href,
          placement,
          device_type: deviceType(),
          viewport_width: global.innerWidth || 0,
          viewport_height: global.innerHeight || 0,
          request_source: config.requestSource,
          ...(messageVariantKey ? { message_variant: messageVariantKey } : {}),
          ...(extra?.context || {})
        },
        ...(extra?.event || messageVariantKey ? { event: { ...(messageVariantKey ? { message_variant: messageVariantKey } : {}), ...(extra?.event || {}) } } : {})
      };
      const response = await post(`/v1/client/${type}`, payload, { keepalive: true });
      element.dispatchEvent(new CustomEvent("dee:event", { detail: { type, payload, response } }));
      return response;
    }

    async function trackConversion(name, placementOrDecision, event) {
      const element = placementOrDecision?.nodeType === 1
        ? placementOrDecision
        : findElementForDecision(placementOrDecision);
      const decision = placementOrDecision?.nodeType === 1 ? state.decisions.get(element) : placementOrDecision;
      if (!element || !decision) return null;
      return sendEvent(element, "conversion", decision, {
        event: {
          name: name || "conversion",
          ...(event || {})
        },
        context: {
          conversion_name: name || "conversion"
        }
      });
    }

    function buildEvaluateRequest(element, overrides) {
      const placement = placementName(element);
      const forced = forcedVariant(element);
      const identifier = config.identifier;
      const contextOverrides = overrides?.context || {};
      const { context: _context, ...requestOverrides } = overrides || {};
      return {
        decision_key: element.dataset.deeDecisionKey || "",
        profile_key: profileKey(),
        identifiers: identifier ? [identifier] : [],
        attributes: {},
        segments: {},
        context: {
          channel: element.dataset.deeChannel || "web",
          page_url: location.href,
          path: location.pathname,
          query: location.search,
          referrer: document.referrer || "",
          placement,
          surface: element.dataset.deeSurface || placement,
          device_type: deviceType(),
          viewport_width: global.innerWidth || 0,
          viewport_height: global.innerHeight || 0,
          page_vars: collectPageVariables(config),
          consent: collectConsent(config),
          sdk_conditions: evaluateSdkConditions(config),
          request_source: config.requestSource,
          profile_enrichment: element.dataset.deeProfileEnrichment || config.profileEnrichment,
          ...(forced ? { force_variant: forced } : {}),
          ...contextOverrides
        },
        ...requestOverrides
      };
    }

    async function renderDecision(element, decision) {
      if (decision.result !== "eligible") return { rendered: false, diagnostics: [] };
      const template = decisionTemplate(element, decision);
      const renderer = config.renderers[template] || defaultRenderers[template] || (hasMessageOutput(decision) ? defaultRenderers.message : defaultRenderers.cards);
      const result = await renderer(element, decision, config);
      if (result && typeof result === "object" && "rendered" in result) {
        return {
          rendered: result.rendered !== false,
          diagnostics: Array.isArray(result.diagnostics) ? result.diagnostics : []
        };
      }
      return { rendered: result !== false, diagnostics: [] };
    }

    async function post(path, payload, options) {
      if (!config.baseUrl) throw new Error("DEE baseUrl is required");
      if (!config.token) throw new Error("DEE token is required");
      const response = await fetch(`${trimSlash(config.baseUrl)}${path}`, {
        method: "POST",
        keepalive: options?.keepalive === true,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.token}`
        },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || `DEE returned ${response.status}`);
      return body;
    }

    function profileKey() {
      if (typeof config.profileKey === "function") return config.profileKey();
      const storage = safeStorage("local");
      return config.profileKey || getCookie("meiro_user_id") || storage?.getItem("dee_profile_key") || anonymousId();
    }

    function eventId(type, decision, placement) {
      return [
        "dee",
        type,
        decision?.decision_key || "decision",
        decision?.rule_version || "v0",
        decision?.profile_key || profileKey(),
        decisionVariantKey(decision) || "none",
        placement,
        Date.now()
      ].join(":");
    }

    function messageId(decision) {
      return decision?.outputs?.message_id || decision?.outputs?.message?.id || decision?.outputs?.messageId || "";
    }

    function messageVariant(decision) {
      return decision?.outputs?.message_variant || decision?.outputs?.messageVariant || decision?.outputs?.message?.variant || "";
    }

    function decisionVariantKey(decision) {
      return decision?.experiment?.variant_key || decision?.outputs?.variant_key || decision?.outputs?.variant || messageVariant(decision) || "";
    }

    function hasMessageOutput(decision) {
      const outputs = decision?.outputs || {};
      return Boolean(outputs.message || outputs.message_content || outputs.messageContent || outputs.message_id || outputs.messageId);
    }

    function decisionTemplate(element, decision) {
      const outputs = decision?.outputs || {};
      const template = outputs.template || outputs.message?.content?.template_type || outputs.message_content?.template_type || outputs.messageContent?.template_type || element.dataset.deeTemplate || "";
      if (hasMessageOutput(decision) && isMessageTemplate(template)) return "message";
      return template || (hasMessageOutput(decision) ? "message" : "cards");
    }

    return {
      init,
      evaluatePlacement,
      sendEvent,
      trackConversion,
      buildEvaluateRequest
    };
  }

  const defaultRenderers = {
    dom_modifications: renderDomModifications,
    dom_modification: renderDomModifications,
    html_fragment: renderHtmlFragment,
    web_layer: renderHtmlFragment,
    weblayer: renderHtmlFragment,
    inpage: renderHtmlFragment,
    message: renderMessage,
    inapp_message: renderMessage,

    async cards(element, decision, config) {
      const cards = Array.isArray(decision.outputs?.cards) ? decision.outputs.cards.slice(0, config.maxItems) : [];
      const track = element.querySelector("[data-dee-track]") || element.querySelector(".meiro-banner-track") || element;
      const structurallyValid = cards.filter((card) => card && card.url && imageUrl(card));
      const valid = (await Promise.all(structurallyValid.map(async (card) => {
        try {
          await preloadImage(safeUrl(imageUrl(card)));
          return card;
        } catch {
          logWithConfig(config, "DEE image failed to preload", imageUrl(card));
          return null;
        }
      }))).filter(Boolean);
      if (!valid.length) {
        logWithConfig(config, "No renderable cards returned; keeping static fallback");
        return false;
      }
      const fragment = document.createDocumentFragment();
      valid.forEach((card) => {
        const item = document.createElement("a");
        item.className = element.dataset.deeItemClass || "meiro-banner-item";
        item.href = safeUrl(card.url);
        item.target = card.target || "_blank";
        item.rel = "noopener noreferrer";

        const img = document.createElement("img");
        img.src = safeUrl(imageUrl(card));
        img.alt = card.alt || card.title || "Offer";
        img.referrerPolicy = "no-referrer";
        img.loading = "eager";
        img.onerror = () => logWithConfig(config, "DEE image failed", img.src);

        const text = document.createElement("p");
        text.textContent = card.title || card.text || "View offer";

        item.appendChild(img);
        item.appendChild(text);
        fragment.appendChild(item);
      });
      track.replaceChildren(fragment);
      return true;
    }
  };

  async function renderHtmlFragment(element, decision, config) {
    const html = decision.outputs?.html || decision.outputs?.fragment || decision.outputs?.markup || "";
    if (!html || typeof html !== "string") {
      logWithConfig(config, "HTML fragment renderer received no html output");
      return false;
    }
    installFragmentStyle(element, decision, config);
    const target = element.querySelector("[data-dee-fragment-target]") || element;
    const fragment = sanitizedHtmlFragment(html, config);
    if (!fragment.childNodes.length) {
      logWithConfig(config, "HTML fragment sanitized to empty output");
      return false;
    }
    target.replaceChildren(fragment);
    wireHtmlFragmentBehavior(target);
    return true;
  }

  async function renderMessage(element, decision, config) {
    const message = normalizedDecisionMessage(decision);
    const content = message.content || {};
    if (!messageContentRenderable(content)) {
      logWithConfig(config, "Message renderer received no renderable content");
      return false;
    }
    const template = messageTemplateType(content.template_type || content.type || element.dataset.deeMessageTemplate || "banner");
    installFragmentStyle(element, {
      outputs: {
        css: messageCss(template)
      }
    }, config);
    const wrapper = document.createElement("article");
    wrapper.className = `dee-message dee-message-${modeSafe(template)}`;
    wrapper.dataset.deeMessageId = message.id || decision?.outputs?.message_id || "";
    if (message.variant) wrapper.dataset.deeMessageVariant = message.variant;
    wrapper.innerHTML = messageHtml(content, template);
    if (template === "html_fragment") {
      const html = content.html || content.fragment || content.markup || "";
      const slot = wrapper.querySelector("[data-dee-message-html]");
      if (slot && html) {
        slot.replaceChildren(sanitizedHtmlFragment(String(html), config));
        wireHtmlFragmentBehavior(slot);
      }
    }
    element.replaceChildren(wrapper);
    return true;
  }

  function normalizedDecisionMessage(decision) {
    const outputs = decision?.outputs || {};
    const message = outputs.message && typeof outputs.message === "object" ? outputs.message : {};
    const directContent = outputs.message_content || outputs.messageContent || {};
    const content = message.content && typeof message.content === "object"
      ? { ...message.content, ...(directContent && typeof directContent === "object" ? directContent : {}) }
      : (directContent && typeof directContent === "object" ? directContent : {});
    return {
      ...message,
      id: message.id || outputs.message_id || outputs.messageId || "",
      variant: message.variant || outputs.message_variant || outputs.messageVariant || decision?.experiment?.variant_key || "",
      content
    };
  }

  function messageContentRenderable(content) {
    if (!content || typeof content !== "object") return false;
    if (content.title || content.body || content.html || content.fragment || content.markup || content.image_url) return true;
    if (Array.isArray(content.questions) && content.questions.length) return true;
    if (content.question) return true;
    if (Array.isArray(content.items) && content.items.length) return true;
    if (Array.isArray(content.products) && content.products.length) return true;
    if (Array.isArray(content.recommendations) && content.recommendations.length) return true;
    return false;
  }

  function messageTemplateType(value) {
    const normalized = String(value || "").trim();
    return ["banner", "alert", "modal", "inline", "toast", "card", "carousel", "survey", "recommendation", "html_fragment"].includes(normalized)
      ? normalized
      : "banner";
  }

  function isMessageTemplate(value) {
    return ["message", "inapp_message", "banner", "alert", "modal", "inline", "toast", "card", "carousel", "survey", "recommendation", "html_fragment"].includes(String(value || "").trim());
  }

  function messageHtml(content = {}, template = "banner") {
    const ctas = Array.isArray(content.ctas) ? content.ctas : [{ label: content.cta_label, url: content.cta_url, style: "primary" }].filter((cta) => cta.label || cta.url);
    return [
      content.image_url ? `<img class="dee-message-image" src="${escapeHtml(safeUrl(content.image_url))}" alt="${escapeHtml(content.image_alt || content.title || "Message")}" loading="lazy" />` : "",
      `<div class="dee-message-body">`,
      content.title ? `<strong>${escapeHtml(content.title)}</strong>` : "",
      content.body ? `<p>${escapeHtml(content.body)}</p>` : "",
      messageTemplateExtraHtml(content, template),
      ctas.length ? `<div class="dee-message-actions">${ctas.map((cta) => `<a class="dee-message-cta ${cta.style === "secondary" ? "secondary" : "primary"}" href="${escapeHtml(safeUrl(cta.url || "#"))}" data-dee-conversion="${escapeHtml(cta.tracking_name || cta.label || "message_click")}">${escapeHtml(cta.label || cta.url || "Open")}</a>`).join("")}</div>` : "",
      content.footer ? `<small>${escapeHtml(content.footer)}</small>` : "",
      `</div>`
    ].join("");
  }

  function messageTemplateExtraHtml(content = {}, template = "banner") {
    const items = Array.isArray(content.items) ? content.items : Array.isArray(content.products) ? content.products : Array.isArray(content.recommendations) ? content.recommendations : [];
    if (template === "carousel" || template === "recommendation") {
      return `<div class="dee-message-items" data-kind="${escapeHtml(template)}">${items.slice(0, 12).map((item) => `
        <a class="dee-message-item" href="${escapeHtml(safeUrl(item.url || item.href || "#"))}" data-dee-conversion="${escapeHtml(item.tracking_name || item.id || item.title || "message_item")}">
          ${item.image_url || item.image ? `<img src="${escapeHtml(safeUrl(item.image_url || item.image))}" alt="${escapeHtml(item.title || item.name || "Recommendation")}" loading="lazy" />` : ""}
          <span><b>${escapeHtml(item.title || item.name || item.id || "Item")}</b>${item.body || item.description || item.price ? `<em>${escapeHtml(item.body || item.description || item.price)}</em>` : ""}</span>
        </a>
      `).join("")}</div>`;
    }
    if (template === "survey") {
      const survey = content.survey && typeof content.survey === "object" ? content.survey : {};
      const questions = Array.isArray(content.questions) && content.questions.length
        ? content.questions
        : Array.isArray(survey.questions) && survey.questions.length
          ? survey.questions
          : [{ label: content.question || survey.question || "", options: content.options || survey.options || [] }].filter((question) => question.label);
      return `<div class="dee-message-survey">${questions.slice(0, 6).map((question, index) => `
        <fieldset>
          <legend>${escapeHtml(question.label || question.title || `Question ${index + 1}`)}</legend>
          <div>${(Array.isArray(question.options) ? question.options : []).slice(0, 8).map((option) => surveyOptionButton(option, question)).join("") || `<textarea aria-label="${escapeHtml(question.label || "Survey response")}"></textarea>`}</div>
        </fieldset>
      `).join("")}</div>`;
    }
    if (template === "html_fragment") {
      return `<div class="dee-message-fragment" data-dee-message-html></div>`;
    }
    return "";
  }

  function surveyOptionButton(option, question = {}) {
    const optionObject = option && typeof option === "object" ? option : {};
    const label = optionObject.label || optionObject.title || optionObject.value || option;
    const value = optionObject.value || optionObject.id || label;
    const trackingName = optionObject.tracking_name || question.tracking_name || question.id || "survey_response";
    return `<button type="button" data-dee-conversion="${escapeHtml(trackingName)}" data-dee-survey-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
  }

  function messageCss(template) {
    return `
      .dee-message{box-sizing:border-box;width:100%;border:1px solid #d8dee8;border-radius:10px;background:#fff;color:#182230;box-shadow:0 10px 30px rgba(16,24,40,.08);overflow:hidden;font-family:inherit}
      .dee-message-body{display:grid;gap:8px;padding:14px}
      .dee-message-body strong{font-size:18px;line-height:1.2}
      .dee-message-body p{margin:0;color:#475467;line-height:1.45}
      .dee-message-body small{color:#667085;line-height:1.35}
      .dee-message-image{display:block;width:100%;max-height:220px;object-fit:cover}
      .dee-message-actions{display:flex;flex-wrap:wrap;gap:8px}
      .dee-message-cta{border-radius:8px;padding:8px 12px;text-decoration:none;font-weight:700}
      .dee-message-cta.primary{background:#0f766e;color:#fff}
      .dee-message-cta.secondary{border:1px solid #d0d5dd;color:#344054;background:#fff}
      .dee-message-items{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
      .dee-message-item{display:grid;gap:6px;min-width:0;border:1px solid #eaecf0;border-radius:8px;padding:8px;color:inherit;text-decoration:none;background:#f8fafc}
      .dee-message-item img{width:100%;height:90px;object-fit:cover;border-radius:6px}
      .dee-message-item span{display:grid;gap:2px;min-width:0}
      .dee-message-item b{font-size:13px;overflow-wrap:anywhere}
      .dee-message-item em{color:#667085;font-size:12px;font-style:normal;line-height:1.35}
      .dee-message-survey{display:grid;gap:10px}
      .dee-message-survey fieldset{display:grid;gap:8px;margin:0;border:1px solid #eaecf0;border-radius:8px;padding:10px}
      .dee-message-survey legend{font-weight:700}
      .dee-message-survey fieldset div{display:flex;flex-wrap:wrap;gap:6px}
      .dee-message-survey button{border:1px solid #d0d5dd;border-radius:999px;background:#fff;padding:7px 10px;cursor:pointer}
      .dee-message-survey textarea{width:100%;min-height:72px;border:1px solid #d0d5dd;border-radius:8px;padding:8px;font:inherit}
      .dee-message-fragment{min-width:0}
      .dee-message-toast{max-width:360px;margin-left:auto}
      .dee-message-modal{max-width:520px;margin:24px auto}
      .dee-message-alert{border-left:4px solid #0f766e}
      .dee-message.dee-message-survey{border-left:4px solid #2563eb}
      .dee-message.dee-message-html_fragment{border-style:dashed}
      ${template === "inline" ? ".dee-message{box-shadow:none}" : ""}
    `;
  }

  async function renderDomModifications(element, decision, config) {
    installFragmentStyle(element, decision, config);
    const modifications = domModificationsFromDecision(decision);
    const diagnostics = [];
    let applied = 0;
    if (!modifications.length) {
      logWithConfig(config, "DOM modification renderer received no modifications");
      return { rendered: false, diagnostics: [{ status: "skipped", reason: "empty_modifications" }] };
    }
    modifications.forEach((modification, index) => {
      const result = applyDomModification(element, modification, index, config);
      diagnostics.push(result);
      if (result.status === "applied") applied += result.count || 1;
    });
    element.dispatchEvent(new CustomEvent("dee:modifications", {
      detail: { decision, applied, diagnostics }
    }));
    return { rendered: applied > 0, diagnostics };
  }

  function domModificationsFromDecision(decision) {
    const outputs = decision?.outputs || {};
    return [
      outputs.modifications,
      outputs.dom_modifications,
      outputs.domModifications,
      outputs.web_modifications,
      outputs.webModifications
    ].find(Array.isArray) || [];
  }

  function applyDomModification(element, modification, index, config) {
    const id = modification?.id || `mod_${index + 1}`;
    const type = modification?.type || "";
    if (!targetScopeMatches(modification?.scope)) {
      return { id, type, status: "skipped", reason: "scope" };
    }
    try {
      if (type === "move") return moveDomNode(element, modification, id);
      const targets = selectModificationTargets(element, modification);
      if (!targets.length) return { id, type, status: "skipped", reason: "selector_no_match", selector: modification?.selector || "" };
      const limit = Math.max(1, Math.min(Number(modification?.max_matches || modification?.maxMatches || 20), 100));
      const selectedTargets = targets.slice(0, limit);
      selectedTargets.forEach((target) => applyDomModificationToTarget(target, modification, config));
      return {
        id,
        type,
        status: "applied",
        selector: modification?.selector || "",
        count: selectedTargets.length,
        truncated: targets.length > selectedTargets.length
      };
    } catch (error) {
      logWithConfig(config, "DOM modification failed", { modification, error });
      return { id, type, status: "skipped", reason: "exception", message: error?.message || String(error) };
    }
  }

  function applyDomModificationToTarget(target, modification, config) {
    const type = modification.type || "";
    if (type === "change_text") {
      target.textContent = stringValue(modification.value ?? modification.text ?? modification.content);
      return;
    }
    if (type === "change_attribute") {
      const name = String(modification.attribute || modification.name || "").trim();
      if (!isSafeAttributeName(name)) throw new Error(`Unsafe attribute ${name || "(empty)"}`);
      const value = modification.value == null ? "" : String(modification.value);
      if (value === "" && modification.remove === true) {
        target.removeAttribute(name);
      } else {
        target.setAttribute(name, attributeValue(name, value));
      }
      return;
    }
    if (type === "change_style") {
      const styles = modification.styles && typeof modification.styles === "object"
        ? modification.styles
        : { [modification.property || ""]: modification.value };
      Object.entries(styles).forEach(([property, value]) => {
        if (!isAllowedStyleProperty(property)) throw new Error(`Unsupported style property ${property}`);
        if (!isSafeStyleValue(value)) throw new Error(`Unsafe style value for ${property}`);
        target.style[property] = String(value ?? "");
      });
      return;
    }
    if (type === "insert_html") {
      const html = modification.html || modification.fragment || modification.markup || "";
      const fragment = sanitizedHtmlFragment(String(html), config);
      if (!fragment.childNodes.length) throw new Error("HTML sanitized to empty output");
      insertFragment(target, fragment, modification.position || "replace");
      wireHtmlFragmentBehavior(target);
      return;
    }
    if (type === "remove") {
      const mode = modification.mode || modification.behavior || "collapse";
      if (mode === "preserve_space") {
        target.style.visibility = "hidden";
      } else if (mode === "hide") {
        target.hidden = true;
      } else {
        target.remove();
      }
      return;
    }
    throw new Error(`Unsupported modification type ${type || "(empty)"}`);
  }

  function moveDomNode(element, modification, id) {
    const source = selectModificationTargets(element, { selector: modification.selector || modification.source_selector || modification.sourceSelector })[0];
    const target = selectModificationTargets(element, { selector: modification.target_selector || modification.targetSelector || modification.target })[0];
    if (!source) return { id, type: "move", status: "skipped", reason: "source_no_match", selector: modification.selector || modification.source_selector || "" };
    if (!target) return { id, type: "move", status: "skipped", reason: "target_no_match", selector: modification.target_selector || modification.targetSelector || "" };
    insertNode(target, source, modification.position || "after");
    return { id, type: "move", status: "applied", count: 1 };
  }

  function selectModificationTargets(element, modification) {
    const selector = modification?.selector;
    if (!selector || selector === "self" || selector === ":self") return [element];
    const rootSelector = modification?.root_selector || modification?.rootSelector || "";
    const root = rootSelector ? document.querySelector(rootSelector) : document;
    if (!root) return [];
    return Array.from(root.querySelectorAll(selector));
  }

  function targetScopeMatches(scope) {
    if (!scope) return true;
    if (Array.isArray(scope.url_rules) && !urlRulesMatch(scope.url_rules, location.href)) return false;
    if (Array.isArray(scope.devices) && scope.devices.length && !scope.devices.includes("any") && !scope.devices.includes(deviceType())) return false;
    return true;
  }

  function insertFragment(target, fragment, position) {
    if (position === "before") {
      target.parentNode?.insertBefore(fragment, target);
    } else if (position === "after") {
      target.parentNode?.insertBefore(fragment, target.nextSibling);
    } else if (position === "first_child" || position === "prepend") {
      target.insertBefore(fragment, target.firstChild);
    } else if (position === "last_child" || position === "append") {
      target.appendChild(fragment);
    } else {
      target.replaceChildren(fragment);
    }
  }

  function insertNode(target, node, position) {
    if (position === "before") {
      target.parentNode?.insertBefore(node, target);
    } else if (position === "first_child" || position === "prepend") {
      target.insertBefore(node, target.firstChild);
    } else if (position === "last_child" || position === "append") {
      target.appendChild(node);
    } else {
      target.parentNode?.insertBefore(node, target.nextSibling);
    }
  }

  function stringValue(value) {
    return value == null ? "" : String(value);
  }

  function attributeValue(name, value) {
    return ["href", "src", "action", "xlink:href", "formaction"].includes(String(name).toLowerCase())
      ? safeUrl(value)
      : value;
  }

  function isSafeAttributeName(name) {
    const normalized = String(name || "").toLowerCase();
    if (!/^[a-z_:][a-z0-9_:.-]*$/i.test(normalized)) return false;
    if (normalized.startsWith("on")) return false;
    return !["srcdoc", "style"].includes(normalized);
  }

  function isAllowedStyleProperty(property) {
    return new Set([
      "background", "backgroundColor", "border", "borderColor", "borderRadius", "boxShadow",
      "color", "display", "fontSize", "fontWeight", "gap", "gridTemplateColumns", "height",
      "justifyContent", "lineHeight", "margin", "marginBottom", "marginLeft", "marginRight",
      "marginTop", "maxHeight", "maxWidth", "minHeight", "minWidth", "opacity", "padding",
      "paddingBottom", "paddingLeft", "paddingRight", "paddingTop", "textAlign", "textDecoration",
      "transform", "width"
    ]).has(property);
  }

  function isSafeStyleValue(value) {
    return !/\bjavascript\s*:|expression\s*\(|url\s*\(\s*['"]?\s*javascript:/i.test(String(value ?? ""));
  }

  function installFragmentStyle(element, decision, config) {
    const css = decision.outputs?.css;
    if (!css || typeof css !== "string") return;
    if (/\bjavascript\s*:|@import\b/i.test(css)) {
      logWithConfig(config, "Blocked unsafe HTML fragment CSS");
      return;
    }
    const id = `dee-style-${modeSafe(decision.decision_key || element.dataset.deeDecisionKey || "fragment")}-${modeSafe(decision.rule_version || "v0")}-${modeSafe(decision.experiment?.variant_key || "none")}`;
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  function sanitizedHtmlFragment(html, config) {
    const template = document.createElement("template");
    template.innerHTML = html;
    const blockedTags = new Set(["script", "iframe", "object", "embed", "link", "meta", "base", "form"]);
    template.content.querySelectorAll("*").forEach((node) => {
      if (blockedTags.has(node.localName)) {
        node.remove();
        return;
      }
      [...node.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value || "";
        if (name.startsWith("on")) {
          node.removeAttribute(attr.name);
          return;
        }
        if (["href", "src", "action", "xlink:href", "formaction"].includes(name) && /^\s*javascript:/i.test(value)) {
          node.removeAttribute(attr.name);
          return;
        }
        if (name === "style" && /\bjavascript\s*:|expression\s*\(|url\s*\(\s*['"]?\s*javascript:/i.test(value)) {
          node.removeAttribute(attr.name);
        }
      });
    });
    logWithConfig(config, "Rendered sanitized HTML fragment");
    return template.content;
  }

  function wireHtmlFragmentBehavior(root) {
    root.querySelectorAll("[data-dee-select]").forEach((select) => {
      if (select.dataset.deeSelectWired === "true") return;
      select.dataset.deeSelectWired = "true";
      const trigger = select.querySelector("[data-dee-select-trigger]");
      const dropdown = select.querySelector("[data-dee-select-dropdown]");
      const search = select.querySelector("[data-dee-select-search]");
      const valueTarget = select.querySelector("[data-dee-select-value]");
      const success = select.querySelector("[data-dee-success]");
      const close = () => {
        select.dataset.open = "false";
        if (dropdown) dropdown.hidden = true;
      };
      trigger?.addEventListener("click", () => {
        const open = select.dataset.open !== "true";
        select.dataset.open = open ? "true" : "false";
        if (dropdown) dropdown.hidden = !open;
      });
      search?.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        select.querySelectorAll("[data-dee-select-option]").forEach((option) => {
          option.hidden = query ? !option.textContent.toLowerCase().includes(query) : false;
        });
      });
      select.querySelectorAll("[data-dee-select-option]").forEach((option) => {
        option.addEventListener("click", () => {
          const value = option.dataset.deeValue || option.textContent.trim();
          if (valueTarget) valueTarget.textContent = value;
          select.dataset.value = value;
          if (success) success.hidden = false;
          select.dispatchEvent(new CustomEvent("dee:fragment-select", { bubbles: true, detail: { value, option } }));
          close();
        });
      });
      close();
    });
  }

  function placementName(element) {
    return element.dataset.deePlacement || element.dataset.deeSurface || "";
  }

  function forcedVariant(element) {
    const params = new URLSearchParams(location.search);
    return params.get("dee_force_variant") || element.dataset.deeForceVariant || "";
  }

  function triggerSettings(element) {
    return normalizeTrigger(parseJsonAttribute(element.dataset.deeTrigger) || {
      type: element.dataset.deeTriggerType || "page_load",
      event: element.dataset.deeTriggerEvent || ""
    });
  }

  function normalizeTrigger(trigger) {
    const type = trigger?.type || "page_load";
    return {
      type: ["page_load", "dom_ready", "data_layer_event", "custom_event", "manual"].includes(type) ? type : "page_load",
      event: trigger?.event || "",
      filters: Array.isArray(trigger?.filters) ? trigger.filters : []
    };
  }

  function onDomReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function wireDataLayerTrigger(element, trigger, evaluatePlacement, config) {
    const name = element.dataset.deeDataLayer || config.dataLayerName || "dataLayer";
    const layer = global[name] = Array.isArray(global[name]) ? global[name] : [];
    const handler = (item) => {
      if (item?.event === trigger.event && triggerMatches(trigger, item)) {
        element.dispatchEvent(new CustomEvent("dee:trigger", { detail: item }));
        evaluatePlacement(element, { context: { trigger_event: trigger.event, trigger_payload: item } }).catch((error) => log("Placement evaluation failed", error));
      }
    };
    layer.__deeHandlers = Array.isArray(layer.__deeHandlers) ? layer.__deeHandlers : [];
    layer.__deeHandlers.push(handler);
    if (layer.__deeWrapped !== true) {
      const originalPush = layer.push.bind(layer);
      layer.push = function(...items) {
        const result = originalPush(...items);
        (layer.__deeHandlers || []).forEach((registered) => items.forEach(registered));
        return result;
      };
      layer.__deeWrapped = true;
    }
    layer.slice().forEach(handler);
  }

  function triggerMatches(trigger, payload) {
    return (trigger.filters || []).every((filter) => {
      const actual = getPath(payload, filter.key);
      return compareValue(actual, filter.operator || "equals", filter.value);
    });
  }

  function imageUrl(card) {
    return card.image_url || card.imageUrl || card.image || card.src || "";
  }

  function preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
  }

  function safeUrl(value) {
    try {
      return new URL(value, location.origin).href;
    } catch {
      return "#";
    }
  }

  function trimSlash(value) {
    return String(value || "").replace(/\/$/, "");
  }

  function getCookie(name) {
    const row = document.cookie.split("; ").find((item) => item.startsWith(`${name}=`));
    return row ? decodeURIComponent(row.split("=")[1]) : "";
  }

  function anonymousId() {
    const key = "dee_anonymous_id";
    const storage = safeStorage("local");
    let id = storage?.getItem(key);
    if (!id) {
      id = global.crypto?.randomUUID ? global.crypto.randomUUID() : `${Date.now()}${String(Math.random()).slice(2)}`;
      storage?.setItem(key, id);
    }
    return `anonymous-${id}`;
  }

  function safeStorage(kind) {
    try {
      const storage = kind === "session" ? global.sessionStorage : global.localStorage;
      if (!storage) return null;
      const key = "__dee_storage_probe__";
      storage.setItem(key, "1");
      storage.removeItem(key);
      return storage;
    } catch {
      return null;
    }
  }

  function placementPrecheck(element, config, overrides) {
    const localTargeting = {
      url_rules: parseJsonAttribute(element.dataset.deeUrlRules),
      devices: csvAttribute(element.dataset.deeDevices),
      sdk_conditions: csvAttribute(element.dataset.deeConditions)
    };
    return targetingPrecheck(localTargeting, config, { context: overrides?.context || {} });
  }

  function decisionPrecheck(element, decision, config) {
    const delivery = decisionDeliverySettings(decision);
    const targeting = delivery.targeting || {};
    const targetingResult = targetingPrecheck(targeting, config, { decision });
    if (!targetingResult.ok) return targetingResult;
    const consentResult = consentPrecheck(delivery.consent, config);
    if (!consentResult.ok) return consentResult;
    const displayResult = displayPrecheck(element, decision);
    if (!displayResult.ok) return displayResult;
    return { ok: true };
  }

  function targetingPrecheck(targeting, config) {
    if (!targeting) return { ok: true };
    const devices = Array.isArray(targeting.devices) ? targeting.devices : String(targeting.devices || targeting.device || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (devices.length && !devices.includes("any") && !devices.includes(deviceType())) {
      return { ok: false, reason: "device_targeting", detail: { device_type: deviceType(), allowed: devices } };
    }
    if (Array.isArray(targeting.url_rules) && !urlRulesMatch(targeting.url_rules, location.href)) {
      return { ok: false, reason: "url_targeting", detail: { page_url: location.href } };
    }
    if (Array.isArray(targeting.sdk_conditions)) {
      const conditions = evaluateSdkConditions(config);
      const failed = targeting.sdk_conditions.filter((key) => conditions[key] !== true);
      if (failed.length) return { ok: false, reason: "sdk_condition", detail: { failed } };
    }
    return { ok: true };
  }

  function consentPrecheck(consent, config) {
    if (!consent?.required) return { ok: true };
    const values = collectConsent(config);
    return values?.[consent.category] === true
      ? { ok: true }
      : { ok: false, reason: "consent", detail: { category: consent.category || "" } };
  }

  function displayPrecheck(element, decision) {
    const delivery = decisionDeliverySettings(decision);
    const mode = delivery.display?.mode || decision?.outputs?.display_mode || "always";
    if (mode === "always") return { ok: true };
    const storage = safeStorage(mode === "once_per_session" ? "session" : "local");
    if (!storage) return { ok: true };
    const key = displayKey(element, decision, delivery.display || {});
    const existing = Number(storage.getItem(key) || 0);
    return existing && !displayWindowExpired(mode, existing)
      ? { ok: false, reason: "display_policy", detail: { mode } }
      : { ok: true };
  }

  function recordDisplay(element, decision) {
    const delivery = decisionDeliverySettings(decision);
    const mode = delivery.display?.mode || decision?.outputs?.display_mode || "always";
    if (mode === "always") return;
    const storage = safeStorage(mode === "once_per_session" ? "session" : "local");
    if (!storage) return;
    storage.setItem(displayKey(element, decision, delivery.display || {}), String(Date.now()));
  }

  function decisionDeliverySettings(decision) {
    return decision?.outputs?.delivery?.message || decision?.outputs?.message?.delivery || decision?.delivery || {};
  }

  function displayWindowExpired(mode, timestamp) {
    if (!timestamp) return true;
    const age = Date.now() - timestamp;
    if (mode === "once_per_day") return age >= 24 * 60 * 60 * 1000;
    if (mode === "once_per_week") return age >= 7 * 24 * 60 * 60 * 1000;
    return false;
  }

  function displayKey(element, decision, display) {
    const version = display.reset_on_version_change === false ? "all_versions" : decision?.rule_version || "v0";
    return [
      "dee_display",
      modeSafe(display.mode || "always"),
      decision?.profile_key || "",
      decision?.decision_key || element.dataset.deeDecisionKey || "",
      placementName(element),
      decision?.experiment?.variant_key || "none",
      version
    ].join(":");
  }

  function collectConsent(config) {
    if (typeof config.consentProvider === "function") return safeCall(config.consentProvider) || {};
    if (typeof global.__DEE_CONSENT__ === "object") return global.__DEE_CONSENT__;
    return {};
  }

  function collectPageVariables(config) {
    const variables = {};
    Object.entries(config.pageVariables || {}).forEach(([key, source]) => {
      variables[key] = typeof source === "function" ? safeCall(source) : getPath(global, source);
    });
    return variables;
  }

  function evaluateSdkConditions(config) {
    const result = {};
    Object.entries(config.conditions || {}).forEach(([key, predicate]) => {
      result[key] = Boolean(safeCall(predicate));
    });
    return result;
  }

  function urlRulesMatch(rules, url) {
    const includes = rules.filter((rule) => rule.mode !== "exclude");
    const excludes = rules.filter((rule) => rule.mode === "exclude");
    if (includes.length && !includes.some((rule) => urlRuleMatches(rule, url))) return false;
    if (excludes.some((rule) => urlRuleMatches(rule, url))) return false;
    return true;
  }

  function urlRuleMatches(rule, url) {
    const value = String(rule.value || "");
    if (rule.operator === "exact") return url === value;
    if (rule.operator === "starts_with") return url.startsWith(value);
    if (rule.operator === "regex") {
      try {
        return new RegExp(value).test(url);
      } catch {
        return false;
      }
    }
    return url.includes(value);
  }

  function deviceType() {
    const width = global.innerWidth || document.documentElement.clientWidth || 0;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  }

  function dispatchSkipped(element, reason, detail) {
    element.dispatchEvent(new CustomEvent("dee:skipped", { detail: { reason, ...(detail || {}) } }));
  }

  function findElementForDecision(decision) {
    if (!decision?.decision_key) return null;
    return document.querySelector(`[data-dee-decision-key="${cssEscape(decision.decision_key)}"]`);
  }

  function parseJsonAttribute(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function csvAttribute(value) {
    return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  }

  function getPath(source, path) {
    if (!path) return undefined;
    return String(path).split(".").reduce((current, key) => current == null ? undefined : current[key], source);
  }

  function compareValue(actual, operator, expected) {
    if (operator === "not_equals") return actual !== expected;
    if (operator === "contains") return Array.isArray(actual) ? actual.includes(expected) : String(actual || "").includes(String(expected));
    if (operator === "greater_than") return Number(actual) > Number(expected);
    if (operator === "less_than") return Number(actual) < Number(expected);
    return actual === expected;
  }

  function safeCall(callback) {
    try {
      return callback();
    } catch {
      return undefined;
    }
  }

  function modeSafe(value) {
    return String(value || "").replace(/[^a-z0-9_-]/gi, "_");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cssEscape(value) {
    return global.CSS?.escape ? global.CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
  }

  function log(message, detail) {
    console.warn("DEE Web SDK:", message, detail || "");
  }

  function logWithConfig(config, message, detail) {
    if (config.debug) log(message, detail);
  }

  global.DEEWebSDK = { createClient };
})(window);
