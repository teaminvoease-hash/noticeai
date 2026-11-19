// Read-only readiness check: production rollout does not create indexes implicitly.
async function requireIdentityIndex() {
  const Identity = require("../models/accountIdentity.model");
  let indexes = [];
  try {
    indexes = await Identity.collection.listIndexes().toArray();
  } catch (error) {
    if (error.code !== 26) throw error;
  }
  if (
    !indexes.some(
      (i) =>
        i.unique === true &&
        i.key?.role === 1 &&
        i.key?.email === 1 &&
        Object.keys(i.key).length === 2,
    )
  )
    throw Object.assign(
      new Error(
        "Account changes are paused until an administrator completes the account-identity index setup.",
      ),
      { status: 503 },
    );
}
// Explicit operator-only switch for the user-approved additive schema setup.
// Never initializes other models, migrates accounts, or modifies existing records.
async function provisionApprovedIdentityIndex(db, env = process.env) {
  if (env.APP_ENV !== "production" || env.PROVISION_IDENTITY_INDEX !== "true") return;
  if (db.databaseName !== "noticeai") throw new Error("Identity setup requires the approved database");
  await db.collection("account_identities").createIndex(
    { role: 1, email: 1 }, { unique: true, name: "role_1_email_1" },
  );
}
module.exports = { requireIdentityIndex, provisionApprovedIdentityIndex };
