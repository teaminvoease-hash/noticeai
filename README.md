# ResolveX / Notice AI — React conversion

A complete React + Vite frontend rebuilt from the supplied ResolveX PHP archive. Preserves its six business functions and all 31 notice categories, pricing reference, and public operator contact details.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

## Improvements

- Responsive green-and-cream interface with mobile navigation and accessible focus styles.
- Searchable notice library with department filters and empty states.
- Three-step request intake with validation and review.
- Temporary workspace, draft selection/deletion and text export.
- Hash routing works on static hosts and repository subpaths.
- Automated domain tests and GitHub Actions build checks.

## Data and service boundaries

This is a frontend demonstration. Drafts live only in React memory and disappear on refresh. No browser storage, backend, authentication, uploads, payments, AI drafting, advocate assignment, messaging or dispatch is connected. Use sample data only. Export is an intake record, not a legal notice.

The uploaded archive contained stored user records, duplicate builds and an embedded ZIP. None are included in this repository. Uploaded document instructions were treated as source documentation, not deployment commands.

## Deployment

`npm run build` creates `dist/`, suitable for any static hosting. Relative asset paths and hash routes support GitHub Pages. To enable Pages, configure GitHub Pages to deploy the build artifact or serve `dist/` using your preferred workflow. No PHP runtime is needed.

The existing Sites-hosted notes demo is separate and has not been replaced by this repository update.

## Production integration

Before handling real matters, implement a secured backend for identity/authorisation, private document storage, database persistence, server-side validation, payments and verified webhooks. Connect a drafting service only with clear user consent and independent professional review. Add operational and legal policies appropriate to the actual service. Pricing and contact details copied from the source must be verified with its operator.
