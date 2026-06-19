import assert from "node:assert/strict";
import test from "node:test";
import { dependencyFailurePolicyDecision, validateDependencyFailurePolicy } from "../src/failurePolicy.js";

test("dependency failure policy defaults to normal evaluation", () => {
  assert.equal(
    dependencyFailurePolicyDecision(
      { cache_policy: {} },
      { status: "circuit_open" }
    ),
    null
  );
});

test("dependency failure policy returns fail-open decision", () => {
  const decision = dependencyFailurePolicyDecision(
    {
      cache_policy: {
        dependency_failure_mode: "fail_open",
        fail_open_outputs: { message_id: "fallback_banner" }
      }
    },
    { status: "error" }
  );

  assert.equal(decision.mode, "fail_open");
  assert.equal(decision.result, "eligible");
  assert.deepEqual(decision.outputs, { message_id: "fallback_banner" });
});

test("dependency failure policy returns fail-closed decision", () => {
  const decision = dependencyFailurePolicyDecision(
    {
      cache_policy: {
        dependency_failure_mode: "fail_closed",
        dependency_failure_result: "deferred",
        dependency_failure_outputs: { suppression_reason: "dependency_unavailable" }
      }
    },
    { status: "circuit_open" }
  );

  assert.equal(decision.mode, "fail_closed");
  assert.equal(decision.result, "deferred");
  assert.deepEqual(decision.outputs, { suppression_reason: "dependency_unavailable" });
});

test("dependency failure policy validates allowed fields", () => {
  assert.throws(
    () => validateDependencyFailurePolicy({ dependency_failure_mode: "maybe" }, (message) => { throw new Error(message); }),
    /dependency_failure_mode/
  );
  assert.throws(
    () => validateDependencyFailurePolicy({ fail_open_outputs: [] }, (message) => { throw new Error(message); }),
    /fail_open_outputs/
  );
});
