const { assertIsolation, assertRuntimeSecrets } = require("./isolation");
function runtimeConfig(source) {
  const env = { ...source };
  env.VERCEL = "1";
  env.MONGODB_URI ||= env.MYNOTICE_MONGODB_URI;
  if (!env.MONGODB_URI)
    throw new Error("MongoDB integration is not configured");
  const uri = new URL(env.MONGODB_URI);
  if (!["mongodb:", "mongodb+srv:"].includes(uri.protocol))
    throw new Error("MongoDB integration is invalid");
  const deploymentEnvironment = env.VERCEL_ENV || ({ staging: "preview", production: "production" })[env.APP_ENV];
  if (!["preview", "production"].includes(deploymentEnvironment))
    throw new Error("Set the deployment environment explicitly");
  if (deploymentEnvironment === "preview") {
    env.APP_ENV = "staging";
    env.STAGING_DATABASE_NAME = "noticeai_vercel_staging";
    uri.pathname = "/" + env.STAGING_DATABASE_NAME;
    env.MONGODB_URI = uri.toString();
    env.SESSION_COOKIE_NAME = "resolvex.vercel.preview.sid";
    env.PAYU_IS_LIVE = "false";
    env.STAGING_ALLOW_EXTERNAL_DELIVERY = "false";
    env.AI_FEATURES_ENABLED = "false";
  } else {
    // Do not silently create/use MongoDB's implicit "test" database in production.
    if (env.MONGODB_DATABASE_NAME) {
      if (!/^[a-zA-Z0-9_-]+$/.test(env.MONGODB_DATABASE_NAME))
        throw new Error("Invalid application database name");
      uri.pathname = "/" + env.MONGODB_DATABASE_NAME;
      env.MONGODB_URI = uri.toString();
    }
    if (!decodeURIComponent(uri.pathname.slice(1)))
      throw new Error(
        "Production MongoDB integration must name the existing application database",
      );
    env.APP_ENV = "production";
    env.SESSION_COOKIE_NAME ||= "resolvex.vercel.sid";
  }
  env.UPLOAD_STORAGE = "gridfs";
  env.TRUST_PROXY = "1";
  if (
    !env.APP_ORIGIN &&
    env.VERCEL_URL &&
    /^[a-z0-9.-]+\.vercel\.app$/.test(env.VERCEL_URL)
  )
    env.APP_ORIGIN = "https://" + env.VERCEL_URL;
  if (!/^https:\/\//.test(env.APP_ORIGIN || ""))
    throw new Error("Set a trusted HTTPS application origin");
  assertRuntimeSecrets(env);
  assertIsolation(env);
  return env;
}
function singleFlight(create) {
  let pending;
  return () =>
    (pending ||= Promise.resolve()
      .then(create)
      .catch((error) => {
        pending = undefined;
        throw error;
      }));
}
module.exports = { runtimeConfig, singleFlight };
