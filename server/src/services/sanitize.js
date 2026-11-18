// Keep the current security-patched sanitizer. Vercel's CommonJS loader cannot
// require its ESM parser dependency, so the build emits an equivalent CJS bundle.
module.exports = process.env.VERCEL === "1"
  ? require("../../generated/sanitize-html.cjs")
  : require("sanitize-html");
