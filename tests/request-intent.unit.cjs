const { test } = require("node:test"),
  assert = require("node:assert/strict");
test("onboarding preserves the notice category through signup and login", async () => {
  const { requestDestination, safeRequestNext, requestAuthPath } = await import(
    "../client/src/lib/requestIntent.mjs"
  );
  const category = "Invoice / Outstanding Payment Demand Notice";
  const destination = requestDestination(category);
  const signup = requestAuthPath("/client-signup", destination);
  assert.equal(safeRequestNext(signup.split("?")[1]), destination);
  const login = requestAuthPath(
    "/client-login",
    safeRequestNext(signup.split("?")[1]),
  );
  assert.equal(safeRequestNext(login.split("?")[1]), destination);
  assert.equal(
    new URL(destination, "https://resolvex.invalid").searchParams.get(
      "category",
    ),
    category,
  );
});
test("onboarding continuation rejects external, protocol-relative and unrelated destinations", async () => {
  const { safeRequestNext } = await import(
    "../client/src/lib/requestIntent.mjs"
  );
  for (const value of [
    "https://example.test/client-notice-submission",
    "//example.test/client-notice-submission",
    "/admin-dashboard",
    "javascript:alert(1)",
    "/client-notice-submission/../admin-dashboard",
  ])
    assert.equal(
      safeRequestNext(new URLSearchParams({ next: value }).toString()),
      null,
    );
  assert.equal(
    safeRequestNext("?next=%2Fclient-notice-submission%3Fignored%3D1"),
    "/client-notice-submission",
  );
});
