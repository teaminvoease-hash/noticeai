const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  express = require("express"),
  request = require("supertest");
test("production commercial review gate preserves callbacks, reconciliation and rejection paths", async () => {
  const old = {
    node: process.env.NODE_ENV,
    app: process.env.APP_ENV,
    approved: process.env.LEGAL_MODEL_REVIEW_APPROVED,
  };
  try {
    process.env.NODE_ENV = "production";
    delete process.env.APP_ENV;
    delete process.env.LEGAL_MODEL_REVIEW_APPROVED;
    const app = express();
    app.use(
      express.json(),
      require("../server/src/config/commercialReview").requireCommercialReview,
    );
    app.use((_req, res) => res.json({ success: true }));
    for (const url of [
      "/payu/initiate",
      "/client-portal/payments",
      "/wallet/credit",
      "/create-admin-withdrawal",
    ])
      assert.equal((await request(app).post(url).send({})).status, 503);
    for (const url of [
      "/payu/success",
      "/payu/failure",
      "/payment-ledger/123/verify",
    ])
      assert.equal((await request(app).post(url).send({})).status, 200);
    assert.equal(
      (
        await request(app)
          .post("/update-admin-withdrawal/123")
          .send({ status: "rejected" })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(app)
          .post("/update-admin-withdrawal/123")
          .send({ status: "approved" })
      ).status,
      503,
    );
    process.env.APP_ENV = "staging";
    assert.equal(
      (await request(app).post("/payu/initiate").send({})).status,
      200,
    );
  } finally {
    for (const [k, v] of [
      ["NODE_ENV", old.node],
      ["APP_ENV", old.app],
      ["LEGAL_MODEL_REVIEW_APPROVED", old.approved],
    ])
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
});
test("notice email uses only the advocate-approved destination and rejects manual service", () => {
  const {
    emailDestination,
  } = require("../server/src/services/professionalReview");
  assert.equal(
    emailDestination({
      professionalReview: {
        serviceRoute: {
          mode: "through_counsel",
          email: "counsel@example.test",
        },
      },
    }),
    "counsel@example.test",
  );
  assert.equal(
    emailDestination({
      professionalReview: {
        serviceRoute: {
          mode: "unrepresented_email",
          email: "recipient@example.test",
        },
      },
    }),
    "recipient@example.test",
  );
  assert.throws(
    () =>
      emailDestination({
        professionalReview: { serviceRoute: { mode: "manual_service" } },
      }),
    (e) => e.status === 409,
  );
  assert.throws(
    () => emailDestination({}),
    (e) => e.status === 409,
  );
});
