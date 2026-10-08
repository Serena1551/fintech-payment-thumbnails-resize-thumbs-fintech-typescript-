import assert from "node:assert/strict";
import {InfraiClient} from "./infrai_client.ts";
import {chooseResize} from "./thumbnail_service.ts";

assert.deepEqual(chooseResize({paymentId: "low", amountCents: 2499, currency: "USD", imageBase64: "x", filename: "x.png"}), {width: 320, height: 320, enlarge: true});
assert.deepEqual(chooseResize({paymentId: "high", amountCents: 100000, currency: "USD", imageBase64: "x", filename: "x.png"}), {width: 640, height: 640, enlarge: false});

const originalFetch = globalThis.fetch;
let attempts = 0;
globalThis.fetch = async () => {
  attempts++;
  if (attempts === 1) {
    return new Response(JSON.stringify({ok: false, error: {code: "RATE_LIMITED", message: "retry later"}}), {status: 429, headers: {"Content-Type": "application/json"}});
  }
  return new Response(JSON.stringify({ok: true, data: {value: "retried"}}), {status: 200, headers: {"Content-Type": "application/json"}});
};

try {
  const result = await new InfraiClient("test-key", "https://example.test").request<{value: string}>("/test", "POST");
  assert.deepEqual(result, {value: "retried"});
  assert.equal(attempts, 2);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("thumbnail risk policy: ok");
