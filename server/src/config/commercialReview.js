// Technical safeguards do not legalise a referral, solicitation or fee-sharing model.
function commercialReady(env = process.env) {
  return (
    env.NODE_ENV !== "production" ||
    env.APP_ENV === "staging" ||
    env.LEGAL_MODEL_REVIEW_APPROVED === "true"
  );
}
function requireCommercialReview(req, res, next) {
  const newFinancial =
    (req.path === "/payu/initiate" ||
      req.path === "/client-portal/payments" ||
      req.path === "/wallet/credit" ||
      req.path === "/create-admin-withdrawal" ||
      (req.path.startsWith("/update-admin-withdrawal/") &&
        req.body.status === "approved")) &&
    req.method === "POST";
  if (newFinancial && !commercialReady())
    return res
      .status(503)
      .json({
        success: false,
        message:
          "New payment and payout processing is paused pending independent legal review of engagement and fee arrangements. Existing payment callbacks and records remain available.",
      });
  next();
}
module.exports = { commercialReady, requireCommercialReview };
