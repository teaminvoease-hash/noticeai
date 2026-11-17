const { test, before, after } = require("node:test"),
  assert = require("node:assert/strict"),
  request = require("supertest"),
  mongoose = require("mongoose"),
  bcrypt = require("bcryptjs");
let app, admin, client, outsider, lawyer, otherLawyer, users, memory;
async function call(agent, method, url, body) {
  const s = await agent.get("/api/session");
  assert.ok(s.body.csrf, JSON.stringify(s.body));
  return agent[method](url)
    .set("X-CSRF-Token", s.body.csrf)
    .send(body || {});
}
const vetting = {
  serviceRoute: {
    mode: "manual_service",
    basis:
      "Synthetic QA: advocate-selected non-email service after representation checks.",
  },
  checklist: {
    instructionsAndAuthority: true,
    conflictsAndIndependence: true,
    factsAndEvidence: true,
    lawAndDeadlines: true,
    correctionsAndUpdates: true,
    communicationAndService: true,
    scopeAndFees: true,
    confidentiality: true,
  },
  note: "Synthetic QA review of the supplied facts, documents and professional scope.",
  updates:
    "Synthetic QA conclusion: necessary updates were checked against this saved revision.",
};
const credentials = {
  status: "verified",
  barCouncil: "Synthetic QA Council",
  enrolmentNumber: "QA-001",
  sourceReference:
    "Synthetic QA fixture reference; no real registry verification.",
  practisingStatusChecked: true,
};
async function matter(code) {
  return require("../server/src/access").ClientNotice.create({
    noticeId: code,
    clientId: users.client.id,
    lawyerId: users.lawyer.id,
    subject: "Synthetic professional review",
    category: "Contract",
    authorityLetter: "synthetic-reference.pdf",
    generatedNotice:
      "<p>Synthetic draft content requiring independent review.</p>",
    caseSummary: "Synthetic facts only",
    paymentStatus: "Paid",
    status: "pending",
  });
}
before(async () => {
  process.env.SESSION_SECRET =
    "professional-test-secret-at-least-32-characters";
  process.env.APP_ORIGIN = "http://localhost:6080";
  if (!process.env.TEST_MONGODB_URI) {
    memory = await require("mongodb-memory-server").MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: {
        version: "7.0.24",
        downloadDir: require("path").resolve(".cache/mongodb"),
      },
    });
    process.env.TEST_MONGODB_URI = memory.getUri("noticeai_professional_test");
  }
  require("../server/src/config/isolation").assertTestDatabase(
    process.env.TEST_MONGODB_URI,
  );
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  await mongoose.connection.dropDatabase();
  app = require("../server/app").createApp({
    sessionStore: new (require("express-session").MemoryStore)(),
  });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  const models = require("../server/src/auth").models,
    password = await bcrypt.hash("Testing-password-123", 10);
  users = {};
  for (const [key, role] of [
    ["admin", "admin"],
    ["client", "client"],
    ["outsider", "client"],
    ["lawyer", "lawyer"],
    ["otherLawyer", "lawyer"],
  ])
    users[key] = await models[role].create({
      name: "QA " + key,
      email: key + "@example.test",
      password,
      status: "active",
    });
  [admin, client, outsider, lawyer, otherLawyer] = Array.from(
    { length: 5 },
    () => request.agent(app),
  );
  for (const [key, agent, role] of [
    ["admin", admin, "admin"],
    ["client", client, "client"],
    ["outsider", outsider, "client"],
    ["lawyer", lawyer, "lawyer"],
    ["otherLawyer", otherLawyer, "lawyer"],
  ])
    assert.equal(
      (
        await call(agent, "post", "/api/auth/" + role + "/login", {
          email: key + "@example.test",
          password: "Testing-password-123",
        })
      ).status,
      200,
    );
});
after(async () => {
  await mongoose.disconnect();
  if (memory) await memory.stop();
});
test("credentials and personal advocate vetting are mandatory, scoped and revision-bound", async () => {
  const n = await matter("QA-VET-001"),
    url = "/api/client-portal/notices/" + n.id + "/status";
  assert.equal(
    (
      await call(admin, "post", url, {
        status: "approved",
        revision: 0,
        vetting,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(client, "post", url, {
        status: "approved",
        revision: 0,
        vetting,
      })
    ).status,
    403,
  );
  assert.equal(
    (await call(lawyer, "post", url, { status: "approved", revision: 0 }))
      .status,
    400,
  );
  assert.equal(
    (
      await call(lawyer, "post", url, {
        status: "approved",
        revision: 0,
        vetting,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(
        lawyer,
        "post",
        "/api/advocates/" + users.lawyer.id + "/credential-review",
        credentials,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        admin,
        "post",
        "/api/advocates/" + users.lawyer.id + "/credential-review",
        { ...credentials, practisingStatusChecked: false },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        admin,
        "post",
        "/api/advocates/" + users.lawyer.id + "/credential-review",
        credentials,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(lawyer, "post", url, {
        status: "approved",
        revision: 0,
        vetting: {
          ...vetting,
          checklist: { ...vetting.checklist, correctionsAndUpdates: false },
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(otherLawyer, "post", url, {
        status: "approved",
        revision: 0,
        vetting,
      })
    ).status,
    404,
  );
  const approved = await call(lawyer, "post", url, {
    status: "approved",
    revision: 0,
    vetting,
  });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.data.professionalReview.lawyerId, users.lawyer.id);
  assert.equal(approved.body.data.professionalReview.contentHash.length, 64);
  assert.equal(
    await require("../server/src/models/matterWork.model").ProfessionalReview.countDocuments(
      { noticeId: n.noticeId },
    ),
    1,
  );
  assert.equal(
    (await client.get("/api/matters/" + n.id + "/professional-review")).body
      .data.current,
    true,
  );
  assert.equal(
    (await outsider.get("/api/matters/" + n.id + "/professional-review"))
      .status,
    404,
  );
  const edit = await call(
    lawyer,
    "post",
    "/api/client-portal/notices/" + n.id + "/generated-notice",
    {
      revision: 0,
      generatedNotice: "<p>Updated synthetic draft after review.</p>",
    },
  );
  assert.equal(edit.status, 200);
  assert.equal(
    (await client.get("/api/matters/" + n.id + "/professional-review")).body
      .data.current,
    false,
  );
  assert.equal(
    (
      await call(lawyer, "post", url, {
        status: "approved",
        revision: 0,
        vetting,
      })
    ).status,
    409,
  );
});
test("withdrawn practising checks prevent signing and move responsibility to administration", async () => {
  const n = await matter("QA-VET-002");
  assert.equal(
    (
      await call(
        lawyer,
        "post",
        "/api/client-portal/notices/" + n.id + "/status",
        { status: "approved", revision: 0, vetting },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        admin,
        "post",
        "/api/advocates/" + users.lawyer.id + "/credential-review",
        { status: "withdrawn" },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        lawyer,
        "post",
        "/api/client-portal/notices/" + n.id + "/signed-file",
        { signedFile: "qa.pdf", revision: 0 },
      )
    ).status,
    403,
  ); // File ownership is checked before review.
  const changed = (await client.get("/api/matters/" + n.id)).body.data;
  assert.equal(changed.workflow.owner, "admin");
  assert.match(changed.workflow.label, /credential/i);
  assert.equal(
    (await client.get("/api/matters/" + n.id + "/professional-review")).body
      .data.current,
    false,
  );
  const stored = await require("../server/src/access").ClientNotice.findById(
    n.id,
  );
  await assert.rejects(
    () =>
      require("../server/src/services/professionalReview").requireVetting(
        stored,
      ),
    (e) => e.status === 409,
  );
  assert.equal(
    (
      await call(
        admin,
        "post",
        "/api/advocates/" + users.lawyer.id + "/credential-review",
        credentials,
      )
    ).status,
    200,
  );
});
test("handoff updates have scoped ownership, conflict detection and real client notifications", async () => {
  const n = await matter("QA-HANDOFF-001"),
    url = "/api/matters/" + n.id + "/handoff";
  const snapshot = n.updatedAt.toISOString();
  const nextUpdateAt = new Date(Date.now() + 3600000).toISOString(),
    note =
      "Synthetic update: advocate is checking source records before making necessary corrections.";
  assert.equal(
    (
      await call(client, "post", url, {
        note,
        nextUpdateAt,
        expectedUpdatedAt: snapshot,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(otherLawyer, "post", url, {
        note,
        nextUpdateAt,
        expectedUpdatedAt: snapshot,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call(lawyer, "post", url, {
        note,
        nextUpdateAt: "invalid",
        expectedUpdatedAt: snapshot,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(lawyer, "post", url, {
        note,
        nextUpdateAt,
        expectedUpdatedAt: "stale",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(lawyer, "post", url, {
        note,
        nextUpdateAt,
        expectedUpdatedAt: snapshot,
      })
    ).status,
    200,
  );
  const summary = (
    await client.get("/api/client-portal/workflow")
  ).body.data.find((x) => x._id === n.id);
  assert.equal(summary.workflow.updateNote, note);
  assert.equal(
    new Date(summary.workflow.nextUpdateAt).toISOString(),
    nextUpdateAt,
  );
  assert.equal(summary.workflow.owner, "lawyer");
  assert.match(summary.workflow.nextAction, /mandatory/i);
  assert.equal(summary.generatedNotice, undefined);
  assert.equal(summary.professionalReview, undefined);
  const notifications = (await client.get("/api/client-portal/notifications"))
    .body.data;
  assert.ok(
    notifications.some((x) => x.noticeId === n.noticeId && x.message === note),
  );
  assert.equal(
    (await outsider.get("/api/client-portal/notifications")).body.data.length,
    0,
  );
  assert.ok(
    (await client.get("/api/matters/" + n.id + "/events")).body.data.some(
      (x) => x.label === "Client handoff update",
    ),
  );
});
test("reviewing new document evidence invalidates approval without deleting the previous review trail", async () => {
  const n = await matter("QA-VET-003");
  assert.equal(
    (
      await call(
        lawyer,
        "post",
        "/api/client-portal/notices/" + n.id + "/status",
        { status: "approved", revision: 0, vetting },
      )
    ).status,
    200,
  );
  const doc = await call(
    lawyer,
    "post",
    "/api/matters/" + n.id + "/document-requests",
    {
      type: "Synthetic source records",
      requestMessage: "Please provide the complete source record for checking.",
    },
  );
  assert.equal(doc.status, 200);
  assert.equal(
    (await client.get("/api/matters/" + n.id + "/professional-review")).body
      .data.current,
    false,
  );
  assert.equal(
    await require("../server/src/models/matterWork.model").ProfessionalReview.countDocuments(
      { noticeId: n.noticeId },
    ),
    1,
  );
  assert.equal(
    (
      await call(
        lawyer,
        "post",
        "/api/client-portal/notices/" + n.id + "/status",
        { status: "approved", revision: 0, vetting },
      )
    ).status,
    409,
  );
  const summary = (await client.get("/api/matters/" + n.id)).body.data.workflow;
  assert.equal(summary.owner, "client");
  assert.equal(summary.section, "documents");
});

test("public fee display is disabled by default without altering configured prices", async () => {
  const old = process.env.PUBLIC_PRICE_DISPLAY_APPROVED;
  const { AdminPayment } = require("../server/src/models/adminPayment.model");
  const p = await AdminPayment.create({
    paymentScope: "global",
    totalAmount: 1234,
    status: "verified",
  });
  try {
    delete process.env.PUBLIC_PRICE_DISPLAY_APPROVED;
    const hidden = await request(app).get("/api/public/pricing");
    assert.equal(hidden.body.data.available, false);
    assert.equal(hidden.body.data.amount, undefined);
    assert.equal((await AdminPayment.findById(p._id)).totalAmount, 1234);
    process.env.PUBLIC_PRICE_DISPLAY_APPROVED = "true";
    const approved = await request(app).get("/api/public/pricing");
    assert.equal(approved.body.data.amount, 1234);
  } finally {
    if (old === undefined) delete process.env.PUBLIC_PRICE_DISPLAY_APPROVED;
    else process.env.PUBLIC_PRICE_DISPLAY_APPROVED = old;
  }
});
