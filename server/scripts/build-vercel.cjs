const { build } = require("esbuild");
build({
  entryPoints: [require.resolve("sanitize-html")],
  outfile: "server/generated/sanitize-html.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  legalComments: "eof",
}).catch(() => { process.exitCode = 1; });
