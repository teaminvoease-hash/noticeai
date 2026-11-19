// Same Express app as Render/Hostinger; the Vercel function never starts a TCP listener.
const {
  runtimeConfig,
  singleFlight,
} = require("../server/src/config/vercelRuntime");
let startupPhase = "configuration";
const getApp = singleFlight(async () => {
  startupPhase = "configuration";
  Object.assign(process.env, runtimeConfig(process.env));
  startupPhase = "database";
  const mongoose = require("mongoose");
  const staging = process.env.APP_ENV === "staging";
  // Production deployment must not create/drop collections or indexes implicitly.
  mongoose.set("autoIndex", staging);
  mongoose.set("autoCreate", staging);
  mongoose.set("bufferCommands", false);
  await mongoose.connect(process.env.MONGODB_URI, {
    // Small initial per-instance pool for low-traffic Fluid compute and the existing free Atlas tier.
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 30000,
    // Bound cold-start connectivity failure rather than queueing requests indefinitely.
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  startupPhase = "identity setup";
  await require("../server/src/services/identityReadiness").provisionApprovedIdentityIndex(
    mongoose.connection.db, process.env,
  );
  startupPhase = "application imports";
  const { createApp } = require("../server/app");
  const MongoStore = require("connect-mongo");
  startupPhase = "session store";
  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    autoRemove: staging ? "native" : "disabled",
  });
  startupPhase = "application setup";
  const app = createApp({
    sessionStore,
  });
  startupPhase = "staging indexes";
  if (staging)
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.init()),
    );
  return app;
});
module.exports = async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    // Error messages from drivers can contain connection information; never return or log them.
    console.error("Vercel application unavailable:", {
      phase: startupPhase,
      type: error.name || "Error",
      code: /^[A-Z_0-9]+$/.test(error.code || "") ? error.code : undefined,
      frames: String(error.stack || "").split("\n").filter((line) => /^\s+at /.test(line)).slice(0, 5),
      configured: {
        mongo: Boolean(process.env.MONGODB_URI || process.env.MYNOTICE_MONGODB_URI),
        session: Boolean(process.env.SESSION_SECRET?.length >= 32),
        origin: Boolean(process.env.APP_ORIGIN),
        deploymentUrl: Boolean(process.env.VERCEL_URL),
        environment: Boolean(process.env.VERCEL_ENV),
      },
    });
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message:
          "Application configuration or database connection is not ready. Contact the administrator.",
      }),
    );
  }
};
