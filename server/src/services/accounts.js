const mongoose = require("mongoose");
const Identity = require("../models/accountIdentity.model");
const problem = (status, message) =>
  Object.assign(new Error(message), { status });
const exactEmail = (email) =>
  new RegExp("^" + email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i");
// Share the signup identity reservation with legacy administrator/profile edits.
async function saveAccount(Model, role, id, input) {
  const patch = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  );
  const accountId = id ? String(id) : String(new mongoose.Types.ObjectId());
  if (patch.email !== undefined) {
    if (typeof patch.email !== "string")
      throw problem(400, "Enter a valid email address.");
    patch.email = patch.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email))
      throw problem(400, "Enter a valid email address.");
  }
  if (patch.email !== undefined) await require("./identityReadiness").requireIdentityIndex();
  let data;
  try {
    await mongoose.connection.transaction(async (session) => {
      const current = id ? await Model.findById(id).session(session) : null;
      if (id && !current) throw problem(404, "Account not found.");
      if (patch.email !== undefined) {
        if (
          await Model.exists({
            _id: { $ne: accountId },
            email: exactEmail(patch.email),
          }).session(session)
        )
          throw problem(409, "An account with this email already exists.");
        const reservation = await Identity.findOne({
          role,
          email: patch.email,
        }).session(session);
        if (reservation && reservation.accountId !== accountId)
          throw problem(
            409,
            "This email is already reserved by another account.",
          );
        if (!reservation)
          await Identity.create([{ role, email: patch.email, accountId }], {
            session,
          });
        await Identity.deleteMany(
          { role, accountId, email: { $ne: patch.email } },
          { session },
        );
      }
      if(current&&role==='lawyer'&&['enrollmentNo','barId'].some(k=>patch[k]!==undefined&&patch[k]!==current[k]))patch.credentialReview={status:'withdrawn'};
    if (current) {
        data = await Model.findOneAndUpdate(
          { _id: accountId, updatedAt: current.updatedAt },
          { $set: patch },
          { new: true, session, runValidators: true },
        );
        if (!data)
          throw problem(409, "The account changed. Refresh before saving.");
      } else
        [data] = await Model.create([{ _id: accountId, ...patch }], {
          session,
        });
    });
  } catch (error) {
    if (error.code === 11000)
      throw problem(409, "An account with this email already exists.");
    throw error;
  }
  return data;
}
module.exports = { saveAccount };
