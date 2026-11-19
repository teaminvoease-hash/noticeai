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

test("signed copy and courier updates notify only the owning client and preserve private receipts", async () => {
  const n = await matter("QA-COURIER-001"), url = "/api/client-portal/notices/" + n.id;
  await call(admin, "post", "/api/advocates/" + users.lawyer.id + "/credential-review", credentials);
  const delivery = { courier: "Synthetic carrier", trackingId: "QA-TRACK-001", dispatchDate: "2026-11-18", deliveryStatus: "In Transit", note: "The signed notice was handed to the carrier today." };
  assert.equal((await call(admin, "post", url + "/delivery", delivery)).status, 409);
  assert.equal((await call(client, "post", url + "/delivery", delivery)).status, 403);
  assert.equal((await call(otherLawyer, "post", url + "/delivery", delivery)).status, 404);
  assert.equal((await call(lawyer, "post", url + "/status", { status: "approved", revision: 0, vetting })).status, 200);
  async function upload(agent, name) {
    const s = await agent.get("/api/session");
    const r = await agent.post("/api/file-upload").set("X-CSRF-Token", s.body.csrf)
      .attach("file", Buffer.from("%PDF-1.7\nSynthetic QA document\n%%EOF"), { filename: name, contentType: "application/pdf" });
    assert.equal(r.status, 200); assert.equal(r.body.success, true); return r.body.fileName;
  }
  const signed = await upload(lawyer, "signed.pdf");
  assert.equal((await call(lawyer, "post", url + "/signed-file", { signedFile: signed, revision: 0 })).status, 200);
  let feed = (await client.get("/api/client-portal/notification-feed")).body.data;
  assert.ok(feed.items.some(i => i.matterId === n.id && i.section === "signed"));
  const { ClientNotification } = require("../server/src/access");
  const count = () => ClientNotification.countDocuments({ noticeId: n.noticeId });
  const before = await count(), receipt = await upload(lawyer, "receipt.pdf");
  const body = { ...delivery, courierReceipt: receipt, nextUpdateAt: new Date(Date.now() + 86400000).toISOString() };
  assert.equal((await call(lawyer, "post", url + "/delivery", { ...body, dispatchDate: "2026-02-30" })).status, 400);
  const foreign = await upload(outsider, "foreign.pdf");
  assert.equal((await call(lawyer, "post", url + "/delivery", { ...body, courierReceipt: foreign })).status, 403);
  const result = await call(lawyer, "post", url + "/delivery", body);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(await count(), before + 1);
  assert.equal((await call(lawyer, "post", url + "/delivery", body)).status, 200);
  assert.equal(await count(), before + 1, "identical retries do not duplicate notifications");
  assert.equal((await client.get("/uploads/" + receipt)).status, 200);
  assert.equal((await outsider.get("/uploads/" + receipt)).status, 404);
  assert.equal((await otherLawyer.get("/uploads/" + receipt)).status, 404);
  const receipt2 = await upload(admin, "updated-receipt.pdf"), proof = await upload(admin, "delivery-proof.pdf");
  assert.equal((await call(admin, "post", url + "/delivery", { ...delivery, deliveryStatus: "Delivered", courierReceipt: receipt2, proofOfDelivery: proof, expectedUpdatedAt: result.body.data.updatedAt })).status, 200);
  const view = (await client.get("/api/matters/" + n.id)).body.data;
  assert.equal(view.notice.courierReceipt, receipt2); assert.equal(view.notice.nextUpdateAt, null);
  assert.ok(view.events.some(e => e.attachments.some(f => f.fileName === receipt)));
  assert.equal((await client.get("/uploads/" + receipt)).status, 200, "historical receipt remains accessible");
  const tracking = (await client.get("/api/client-portal/delivery-tracking")).body.data.find(r => r.noticeId === n.noticeId);
  assert.equal(tracking.courierReceipt, receipt2);
  const downloads = (await client.get("/api/client-portal/downloads")).body.data;
  assert.ok(downloads.some(r => r.fileType === "Courier Receipt" && r.fileName === receipt2));
  feed = (await client.get("/api/client-portal/notification-feed")).body.data;
  const notification = feed.items.find(i => i.matterId === n.id && i.section === "delivery");
  assert.match(notification.message, /Delivered/);
  assert.equal((await outsider.get("/api/client-portal/notification-feed")).body.data.items.some(i => i.noticeId === n.noticeId), false);
  assert.equal((await call(outsider, "patch", "/api/client-portal/notifications/" + notification._id + "/read")).status, 404);
  assert.equal((await call(client, "patch", "/api/client-portal/notifications/" + notification._id + "/read")).status, 200);
  const stableCount = await count();
  assert.equal((await call(admin, "post", url + "/delivery", { ...delivery, expectedUpdatedAt: result.body.data.updatedAt })).status, 409);
  assert.equal(await count(), stableCount);
  // The receipt/status change and client notification must commit together.
  const original = ClientNotification.create;
  ClientNotification.create = async () => { throw Error("Synthetic notification write failure"); };
  try {
    assert.equal((await call(admin, "post", url + "/delivery", { ...delivery, note: "Synthetic rollback check: do not commit this update." })).status, 500);
  } finally { ClientNotification.create = original; }
  const unchanged = await require("../server/src/access").ClientNotice.findById(n.id);
  assert.equal(unchanged.deliveryStatus, "Delivered"); assert.equal(unchanged.courierReceipt, receipt2);
  assert.equal(await count(), stableCount);
});

test("administration cannot assign an unpaid notice", async () => {
  const n = await matter("QA-UNPAID-ASSIGN");
  await require("../server/src/access").ClientNotice.updateOne({ _id: n.id }, { $set: { paymentStatus: "Pending", lawyerId: "" } });
  assert.equal((await call(admin, "post", "/api/client-portal/notices/" + n.id + "/assign-lawyer", { lawyerId: users.lawyer.id })).status, 409);
  assert.equal((await require("../server/src/access").ClientNotice.findById(n.id)).lawyerId, "");
});

test("assigned advocate revises AI notice, edits it, re-vets the new version and signs without bypassing review", async () => {
  const before = { fetch: global.fetch, enabled: process.env.AI_FEATURES_ENABLED, key: process.env.OPENAI_API_KEY };
  try {
    process.env.AI_FEATURES_ENABLED = "true"; process.env.OPENAI_API_KEY = "synthetic-mocked-provider";
    const n = await matter("QA-AI-REVISION"), url = "/api/ai/matters/" + n.id + "/revise";
    await call(admin, "post", "/api/advocates/" + users.lawyer.id + "/credential-review", credentials);
    assert.equal((await call(lawyer, "post", "/api/client-portal/notices/" + n.id + "/status", { status: "approved", revision: 0, vetting })).status, 200);
    let outbound = 0;
    const proposalText = "Synthetic AI revision.\n\nThe advocate must verify the requested remedy.";
    global.fetch = async (url, options) => {
      outbound++; assert.equal(url, "https://api.openai.com/v1/responses");
      const payload = JSON.parse(JSON.parse(options.body).input[1].content[0].text);
      assert.match(payload.currentDraft, /Synthetic draft content/);
      assert.equal(payload.revisionInstructions, "Clarify the requested remedy using only the supplied facts.");
      return { ok: true, json: async () => ({ output_text: proposalText }) };
    };
    const body = { revision: 0, consentToAi: true, instructions: "Clarify the requested remedy using only the supplied facts." };
    assert.equal((await call(client, "post", url, body)).status, 403);
    assert.equal((await call(admin, "post", url, body)).status, 403);
    assert.equal((await call(otherLawyer, "post", url, body)).status, 404);
    assert.equal((await call(lawyer, "post", url, { ...body, revision: 9 })).status, 409);
    const proposed = await call(lawyer, "post", url, body);
    assert.equal(proposed.status, 200, JSON.stringify(proposed.body)); assert.equal(outbound, 1);
    const artifact = proposed.body.data.artifact, applyUrl = "/api/ai/artifacts/" + artifact._id + "/apply";
    assert.equal(artifact.intent, "revision");
    assert.equal((await require("../server/src/access").ClientNotice.findById(n.id)).draftRevision, 0, "AI generation does not overwrite the notice");
    assert.equal((await call(otherLawyer, "post", applyUrl, { reviewed: true })).status, 404);
    assert.equal((await call(lawyer, "post", applyUrl, { reviewed: true, editedDraft: " " })).status, 400);
    const edited = "Advocate-corrected notice based on the supplied evidence.\n\n<script>untrusted()</script> is quoted text, not executable markup.";
    const applied = await call(lawyer, "post", applyUrl, { reviewed: true, editedDraft: edited });
    assert.equal(applied.status, 200); assert.equal(applied.body.data.draftRevision, 1); assert.equal(applied.body.data.status, "pending");
    assert.match(applied.body.data.generatedNotice, /Advocate-corrected/); assert.doesNotMatch(applied.body.data.generatedNotice, /<script>/);
    const savedArtifact = await mongoose.models.ai_artifacts.findById(artifact._id);
    assert.equal(savedArtifact.draft, proposalText, "original AI proposal remains unchanged"); assert.equal(savedArtifact.appliedRevision, 1);
    const version = await require("../server/src/models/matterWork.model").DraftVersion.findOne({ noticeId: n.noticeId, revision: 1 });
    assert.equal(version.aiArtifactId, artifact._id); assert.match(version.label, /Advocate-edited/);
    const portal = (await client.get("/api/ai/matters/" + n.id + "/artifacts")).body.data;
    assert.equal(portal[0].instructions, undefined, "staff revision instructions are not exposed to the client");
    assert.equal((await call(lawyer, "post", applyUrl, { reviewed: true })).status, 409);
    const session = await lawyer.get("/api/session");
    const upload = await lawyer.post("/api/file-upload").set("X-CSRF-Token", session.body.csrf).attach("file", Buffer.from("%PDF-1.7\nSynthetic signed QA only\n%%EOF"), { filename: "ai-revision-signed.pdf", contentType: "application/pdf" });
    const signUrl = "/api/client-portal/notices/" + n.id + "/signed-file", signedBody = { revision: 1, signedFile: upload.body.fileName };
    assert.equal((await call(lawyer, "post", signUrl, signedBody)).status, 409, "old approval cannot authorise the edited notice");
    assert.equal((await call(lawyer, "post", "/api/client-portal/notices/" + n.id + "/status", { status: "approved", revision: 1, vetting })).status, 200);
    assert.equal((await call(lawyer, "post", signUrl, signedBody)).status, 200);
    assert.equal((await client.get("/uploads/" + upload.body.fileName)).status, 200);
    assert.equal((await call(lawyer, "post", url, { ...body, revision: 1 })).status, 409, "signed notices are immutable");
    assert.equal(outbound, 1);
  } finally {
    global.fetch = before.fetch;
    for (const [key, value] of [["AI_FEATURES_ENABLED", before.enabled], ["OPENAI_API_KEY", before.key]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("AI evidence cannot be taken from another matter even when the advocate can read both", async () => {
  const password = await bcrypt.hash("Testing-password-123", 10);
  const advocate = await require("../server/src/access").Lawyer.create({ name: "Synthetic evidence-scope advocate", email: "evidence-scope@example.test", password, status: "active" });
  const actor = request.agent(app);
  await call(actor, "post", "/api/auth/lawyer/login", { email: advocate.email, password: "Testing-password-123" });
  const s = await actor.get("/api/session");
  const upload = await actor.post("/api/file-upload").set("X-CSRF-Token", s.body.csrf).attach("file", Buffer.from("%PDF-1.7\nSynthetic evidence fixture\n%%EOF"), { filename: "other-matter.pdf", contentType: "application/pdf" });
  const n = await matter("QA-AI-EVIDENCE-TARGET"), source = await matter("QA-AI-EVIDENCE-SOURCE");
  const Model = require("../server/src/access").ClientNotice;
  await Model.updateMany({ _id: { $in: [n.id, source.id] } }, { $set: { lawyerId: advocate.id } });
  await Model.updateOne({ _id: source.id }, { $set: { supportingDocuments: [upload.body.fileName] } });
  assert.equal((await actor.get("/uploads/" + upload.body.fileName)).status, 200);
  const response = await call(actor, "post", "/api/ai/matters/" + n.id + "/draft", { consentToAi: true, fileName: upload.body.fileName });
  assert.equal(response.status, 403); assert.match(response.body.message, /this matter/);
  assert.equal(await mongoose.models.ai_artifacts.countDocuments({ noticeId: n.noticeId }), 0);
});

test("missing identity index pauses account changes without altering the database", async () => {
  const Identity = require("../server/src/models/accountIdentity.model");
  await Identity.collection.drop();
  assert.equal((await request(app).get("/api/health")).status, 503);
  const agent = request.agent(app);
  const response = await call(agent, "post", "/api/auth/client/signup", {
    name: "Synthetic blocked signup",
    email: "schema-gate@example.test",
    password: "Testing-password-123",
  });
  assert.equal(response.status, 503);
  assert.match(response.body.message, /index setup/);
  assert.equal(
    await require("../server/src/access").Client.countDocuments({
      email: "schema-gate@example.test",
    }),
    0,
  );
  const names = await mongoose.connection.db
    .listCollections({ name: "account_identities" })
    .toArray();
  assert.equal(names.length, 0);
  await Identity.collection.createIndex(
    { role: 1, email: 1 },
    { unique: true },
  );
  assert.equal((await request(app).get("/api/health")).status, 200);
  assert.equal(
    (
      await call(agent, "post", "/api/auth/client/signup", {
        name: "Synthetic allowed signup",
        email: "schema-gate@example.test",
        password: "Testing-password-123",
      })
    ).status,
    200,
  );
});
