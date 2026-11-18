const { test } = require("node:test"),
  assert = require("node:assert/strict");
const {
  runtimeConfig,
  singleFlight,
} = require("../server/src/config/vercelRuntime");
const base = {
  NODE_ENV: "production",
  SESSION_SECRET: "isolated-unit-secret-not-a-real-credential",
  MYNOTICE_MONGODB_URI: "mongodb://127.0.0.1:27017/existing_app",
  APP_ORIGIN: "https://example.vercel.app",
};
test("Vercel preview isolates database, cookie, AI, payment and outbound mail without changing input", () => {
  const input = {
    ...base,
    VERCEL_ENV: "preview",
    PAYU_IS_LIVE: "true",
    AI_FEATURES_ENABLED: "true",
    STAGING_ALLOW_EXTERNAL_DELIVERY: "true",
  };
  const result = runtimeConfig(input);
  assert.equal(
    new URL(result.MONGODB_URI).pathname,
    "/noticeai_vercel_staging",
  );
  assert.equal(result.APP_ENV, "staging");
  assert.equal(result.SESSION_COOKIE_NAME, "resolvex.vercel.preview.sid");
  assert.equal(result.PAYU_IS_LIVE, "false");
  assert.equal(result.AI_FEATURES_ENABLED, "false");
  assert.equal(result.STAGING_ALLOW_EXTERNAL_DELIVERY, "false");
  assert.equal(result.UPLOAD_STORAGE, "gridfs");
  assert.equal(input.PAYU_IS_LIVE, "true");
});
test("Vercel production preserves explicit existing database and does not silently fall back to test", () => {
  assert.equal(
    runtimeConfig({ ...base, VERCEL_ENV: "production" }).MONGODB_URI,
    base.MYNOTICE_MONGODB_URI,
  );
  assert.throws(
    () =>
      runtimeConfig({
        ...base,
        MYNOTICE_MONGODB_URI: "mongodb://127.0.0.1:27017/",
      }),
    /name the existing/,
  );
  assert.equal(
    new URL(
      runtimeConfig({
        ...base,
        MYNOTICE_MONGODB_URI: "mongodb://127.0.0.1:27017/",
        MONGODB_DATABASE_NAME: "noticeai",
      }).MONGODB_URI,
    ).pathname,
    "/noticeai",
  );
  assert.throws(
    () => runtimeConfig({ ...base, SESSION_SECRET: "" }),
    /secret/i,
  );
  assert.throws(
    () => runtimeConfig({ ...base, APP_ORIGIN: "http://localhost:6080" }),
    /HTTPS/,
  );
});
test("concurrent Vercel cold starts share initialization and retry after failure", async () => {
  let calls = 0;
  const get = singleFlight(async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (calls === 1) throw Error("temporary");
    return { ready: true };
  });
  const failed = await Promise.allSettled([get(), get(), get()]);
  assert.equal(calls, 1);
  assert.ok(failed.every((r) => r.status === "rejected"));
  const ready = await Promise.all([get(), get()]);
  assert.equal(calls, 2);
  assert.equal(ready[0], ready[1]);
  assert.equal(await get(), ready[0]);
});
