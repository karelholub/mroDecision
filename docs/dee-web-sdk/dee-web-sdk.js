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
        placements.forEach((element) => evaluatePlacement(element).catch((error) => log("Placement evaluation failed", error)));
      }
      return placements;
    }

    function wirePlacement(element) {
      if (!element || element.dataset.deeWired === "true") return;
      element.dataset.deeWired = "true";
      element.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link || !element.contains(link)) return;
        const decision = state.decisions.get(element);
        if (decision) sendEvent(element, "conversion", decision).catch(() => {});
      });
    }

    async function evaluatePlacement(element, overrides) {
      const request = buildEvaluateRequest(element, overrides);
      const decision = await post("/v1/client/evaluate", request);
      const rendered = await renderDecision(element, decision);
      state.decisions.set(element, decision);
      element.dispatchEvent(new CustomEvent("dee:decision", { detail: { decision, rendered } }));
      if (rendered && config.autoExposure && decision.experiment?.variant_key) {
        await sendEvent(element, "exposure", decision).catch((error) => log("Exposure failed", error));
      }
      return decision;
    }

    async function sendEvent(element, type, decision, extra) {
      const placement = placementName(element);
      const variantKey = decision?.experiment?.variant_key || "";
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
          request_source: config.requestSource,
          ...(extra?.context || {})
        },
        ...(extra?.event ? { event: extra.event } : {})
      };
      const response = await post(`/v1/client/${type}`, payload, { keepalive: true });
      element.dispatchEvent(new CustomEvent("dee:event", { detail: { type, payload, response } }));
      return response;
    }

    function buildEvaluateRequest(element, overrides) {
      const placement = placementName(element);
      const forced = forcedVariant(element);
      const identifier = config.identifier;
      return {
        decision_key: element.dataset.deeDecisionKey || "",
        profile_key: profileKey(),
        identifiers: identifier ? [identifier] : [],
        attributes: {},
        segments: {},
        context: {
          channel: element.dataset.deeChannel || "web",
          page_url: location.href,
          placement,
          surface: element.dataset.deeSurface || placement,
          request_source: config.requestSource,
          profile_enrichment: element.dataset.deeProfileEnrichment || config.profileEnrichment,
          ...(forced ? { force_variant: forced } : {}),
          ...(overrides?.context || {})
        },
        ...(overrides || {})
      };
    }

    async function renderDecision(element, decision) {
      if (decision.result !== "eligible") return false;
      const template = decision.outputs?.template || element.dataset.deeTemplate || "cards";
      const renderer = config.renderers[template] || defaultRenderers[template] || defaultRenderers.cards;
      const rendered = await renderer(element, decision, config);
      return rendered !== false;
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
      return config.profileKey || getCookie("meiro_user_id") || localStorage.getItem("dee_profile_key") || anonymousId();
    }

    function eventId(type, decision, placement) {
      return [
        "dee",
        type,
        decision?.decision_key || "decision",
        decision?.rule_version || "v0",
        decision?.profile_key || profileKey(),
        decision?.experiment?.variant_key || "none",
        placement,
        Date.now()
      ].join(":");
    }

    function messageId(decision) {
      return decision?.outputs?.message_id || decision?.outputs?.message?.id || "";
    }

    return {
      init,
      evaluatePlacement,
      sendEvent,
      buildEvaluateRequest
    };
  }

  const defaultRenderers = {
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

  function placementName(element) {
    return element.dataset.deePlacement || element.dataset.deeSurface || "";
  }

  function forcedVariant(element) {
    const params = new URLSearchParams(location.search);
    return params.get("dee_force_variant") || element.dataset.deeForceVariant || "";
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
    let id = localStorage.getItem(key);
    if (!id) {
      id = global.crypto?.randomUUID ? global.crypto.randomUUID() : `${Date.now()}${String(Math.random()).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return `anonymous-${id}`;
  }

  function log(message, detail) {
    console.warn("DEE Web SDK:", message, detail || "");
  }

  function logWithConfig(config, message, detail) {
    if (config.debug) log(message, detail);
  }

  global.DEEWebSDK = { createClient };
})(window);
