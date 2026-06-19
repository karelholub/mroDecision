import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeMessageDeliveryIntoClientDelivery,
  messageRenderingContract,
  surfaceCandidateSummary
} from "../src/messageRendering.js";

test("message rendering contract normalizes message content for native or web SDKs", () => {
  const rendering = messageRenderingContract(
    {
      id: "msg-1",
      surface: "mobile_home",
      metadata: {
        application_id: "shopping-app",
        application: "ios-storefront",
        placement: "home.hero",
        target_devices: "mobile",
        theme: { tone: "dark" }
      },
      default_content: {
        template_type: "modal",
        title: "Save today",
        body: "Exclusive mobile-only offer",
        ctas: [
          { label: "Shop now", url: "myapp://offers/save", style: "primary" },
          { label: "Later", action: "dismiss", dismiss: true }
        ],
        image_url: "https://cdn.example.test/offer.png"
      }
    },
    {},
    {
      context: {
        channel: "inapp",
        platform: "ios"
      }
    },
    {
      available: true,
      delivery: {
        targeting: { devices: "mobile" }
      }
    }
  );

  assert.equal(rendering.template_type, "modal");
  assert.equal(rendering.content_type, "message");
  assert.equal(rendering.application.id, "shopping-app");
  assert.equal(rendering.application.key, "ios-storefront");
  assert.equal(rendering.placement, "home.hero");
  assert.equal(rendering.interruptive, true);
  assert.equal(rendering.media.image_url, "https://cdn.example.test/offer.png");
  assert.equal(rendering.actions[0].label, "Shop now");
  assert.equal(rendering.actions[1].dismiss, true);
  assert.equal(rendering.platform_hints.platform, "ios");
  assert.equal(rendering.platform_hints.target_devices, "mobile");
});

test("message rendering contract summarizes survey questions for mobile renderers", () => {
  const rendering = messageRenderingContract(
    {
      surface: "app_inbox",
      default_content: {
        template_type: "survey",
        survey: {
          questions: [
            { id: "q1", type: "choice", required: true },
            { id: "q2", type: "text", required: false }
          ]
        }
      },
      metadata: {}
    },
    {},
    { context: {} },
    null
  );

  assert.deepEqual(rendering.survey, {
    question_count: 2,
    required_count: 1,
    question_types: ["choice", "text"]
  });
});

test("message delivery merge surfaces message policy on the top-level client delivery envelope", () => {
  const delivery = mergeMessageDeliveryIntoClientDelivery(
    {
      display: { mode: "always" },
      trigger: { type: "page_load" }
    },
    {
      message: {
        id: "msg-1",
        delivery: {
          display: { mode: "once_per_session" },
          frequency: { cooldown_seconds: 300 },
          dismiss: { behavior: "cooldown" }
        },
        availability: {
          available: true,
          ttl_seconds: 300
        },
        rendering: {
          template_type: "banner",
          placement: "hero"
        }
      }
    }
  );

  assert.equal(delivery.display.mode, "always");
  assert.equal(delivery.message.display.mode, "once_per_session");
  assert.equal(delivery.message.frequency.cooldown_seconds, 300);
  assert.equal(delivery.message.availability.available, true);
  assert.equal(delivery.message.rendering.template_type, "banner");
});

test("surface candidate summary includes message availability and rendering detail", () => {
  const candidate = surfaceCandidateSummary(
    {
      decision_key: "homepage_message",
      result: "suppressed",
      outputs: {
        message: {
          id: "msg-2",
          name: "Cart reminder",
          surface: "homepage",
          availability: {
            available: false,
            reason: "message_frequency_cap"
          },
          rendering: {
            template_type: "toast",
            placement: "cart.drawer"
          }
        }
      },
      delivery: {
        message: {
          display: { mode: "once" }
        }
      },
      matched_rules: ["branch_1"],
      cache: { hit: false },
      profile_cache: { status: "local_payload", hit: false },
      errors: ["Message msg-2 is cooling down for this profile"]
    },
    80
  );

  assert.equal(candidate.priority, 80);
  assert.equal(candidate.message.id, "msg-2");
  assert.equal(candidate.message.availability.reason, "message_frequency_cap");
  assert.equal(candidate.message.rendering.template_type, "toast");
  assert.equal(candidate.delivery.display.mode, "once");
  assert.deepEqual(candidate.errors, ["Message msg-2 is cooling down for this profile"]);
});
