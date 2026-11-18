const { test, before, after } = require("node:test"),
  assert = require("node:assert/strict"),
  request = require("supertest"),
  mongoose = require("mongoose"),
  crypto = require("node:crypto"),
  bcrypt = require("bcryptjs");
let app, client, other, anonymous, users, memory;
async function call(agent, method, url, body) {
  const s = await agent.get("/api/session");
  return agent[method](url)
    .set("X-CSRF-Token", s.body.csrf)
    .send(body || {});
}
before(async () => {
  process.env.SESSION_SECRET =
    "isolated-transfer-testing-secret-with-at-least-32-characters";
  process.env.APP_ORIGIN = "http://localhost:6080";
  if (!process.env.TEST_MONGODB_URI) {
    memory = await require("mongodb-memory-server").MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: {
        version: "7.0.24",
        downloadDir: require("path").resolve(".cache/mongodb"),
      },
    });
    process.env.TEST_MONGODB_URI = memory.getUri("noticeai_transfers_test");
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
  const Client = require("../server/src/access").Client,
    password = await bcrypt.hash("Testing-password-123", 10);
  users = await Client.create([
    {
      name: "Synthetic transfer client",
      email: "transfer@example.test",
      password,
      status: "active",
    },
    {
      name: "Synthetic outsider",
      email: "outside@example.test",
      password,
      status: "active",
    },
  ]);
  client = request.agent(app);
  other = request.agent(app);
  anonymous = request.agent(app);
  for (const [agent, email] of [
    [client, "transfer@example.test"],
    [other, "outside@example.test"],
  ])
    assert.equal(
      (
        await call(agent, "post", "/api/auth/client/login", {
          email,
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
test("10 MB authenticated upload survives small parts, replay checks and private bounded download", async () => {
  const data = Buffer.alloc(10 * 1024 * 1024, 65);
  data.write("%PDF-1.7\nSynthetic upload fixture only.\n");
  const start = await call(client, "post", "/api/file-transfers", {
    filename: "synthetic-large.pdf",
    size: data.length,
  });
  assert.equal(start.status, 200, JSON.stringify(start.body));
  const { id, partBytes } = start.body.data,
    url = "/api/file-transfers/" + id;
  assert.equal((await call(client, "post", url + "/complete")).status, 409);
  assert.equal(
    (
      await call(other, "put", url + "/0", {
        data: data.subarray(0, partBytes).toString("base64"),
      })
    ).status,
    404,
  );
  assert.equal(
    (await call(client, "put", url + "/0", { data: "not base64" })).status,
    400,
  );
  for (
    let offset = 0, index = 0;
    offset < data.length;
    offset += partBytes, index++
  ) {
    const body = {
      data: data.subarray(offset, offset + partBytes).toString("base64"),
    };
    assert.equal(
      (await call(client, "put", url + "/" + index, body)).status,
      200,
    );
    if (index === 0) {
      assert.equal((await call(client, "put", url + "/0", body)).status, 200);
      assert.equal(
        (
          await call(client, "put", url + "/0", {
            data: Buffer.alloc(partBytes, 66).toString("base64"),
          })
        ).status,
        409,
      );
    }
  }
  const finished = await Promise.all([
    call(client, "post", url + "/complete"),
    call(client, "post", url + "/complete"),
  ]);
  assert.ok(finished.some((r) => r.status === 200));
  assert.ok(finished.every((r) => [200, 409].includes(r.status)));
  const result = finished.find((r) => r.status === 200).body,
    File = require("../server/src/models/file.model");
  assert.equal(await File.countDocuments({ name: result.fileName }), 1);
  assert.equal(
    (await call(client, "post", url + "/complete")).body.fileName,
    result.fileName,
  );
  const info = await client.get("/api/files/" + result.fileName + "/info");
  assert.equal(info.body.data.size, data.length);
  assert.equal(
    (await other.get("/api/files/" + result.fileName + "/parts/0")).status,
    404,
  );
  assert.equal(
    (await anonymous.get("/api/files/" + result.fileName + "/info")).status,
    404,
  );
  const downloaded = [];
  for (let i = 0; i < Math.ceil(data.length / partBytes); i++) {
    const part = await client.get(
      "/api/files/" + result.fileName + "/parts/" + i,
    );
    assert.equal(part.status, 200);
    assert.ok(part.body.length <= partBytes);
    downloaded.push(part.body);
  }
  assert.equal(
    crypto.createHash("sha256").update(Buffer.concat(downloaded)).digest("hex"),
    crypto.createHash("sha256").update(data).digest("hex"),
  );
  const old = process.env.VERCEL;
  try {
    process.env.VERCEL = "1";
    const wrapper = await client.get("/uploads/" + result.fileName);
    assert.equal(wrapper.status, 200);
    assert.match(wrapper.headers["content-type"], /text\/html/);
    assert.match(wrapper.text, /private-download.js/);
    assert.equal((await other.get("/uploads/" + result.fileName)).status, 404);
  } finally {
    if (old === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = old;
  }
  const row = await mongoose.connection.db
    .collection("upload_transfers")
    .findOne({ _id: id });
  assert.equal(row.parts, undefined);
  assert.equal(row.status, "complete");
});
test("transfer size, content type and expiration cannot bypass existing file validation", async () => {
  assert.equal(
    (
      await call(client, "post", "/api/file-transfers", {
        filename: "oversize.pdf",
        size: 10 * 1024 * 1024 + 1,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(client, "post", "/api/file-transfers", {
        filename: "unsafe.html",
        size: 10,
      })
    ).status,
    400,
  );
  const s = await call(client, "post", "/api/file-transfers", {
    filename: "fake.pdf",
    size: 10,
  });
  const url = "/api/file-transfers/" + s.body.data.id;
  assert.equal(
    (
      await call(client, "put", url + "/0", {
        data: Buffer.alloc(10, 65).toString("base64"),
      })
    ).status,
    200,
  );
  assert.equal((await call(client, "post", url + "/complete")).status, 400);
  await mongoose.connection.db
    .collection("upload_transfers")
    .updateOne({ _id: s.body.data.id }, { $set: { expiresAt: new Date(0) } });
  assert.equal((await call(client, "post", url + "/complete")).status, 404);
});
