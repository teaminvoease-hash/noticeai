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
module.exports = { requireIdentityIndex };
