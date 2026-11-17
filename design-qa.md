# ResolveX homepage restoration — design QA

Date: 17 November 2026. Target: restore the visual identity of the user's uploaded `well-known (28).zip` homepage in the existing development React application, with a clear path into a real saved notice request. This is a redesign grounded in the supplied source, not a pixel-identical reinstatement of historical prices, copy or PHP execution.

## Source and comparison evidence

- Source visual truth: [uploaded homepage capture](docs/landing-redesign/02-uploaded-reference.jpg). A local static presentation of the uploaded `index.php`, header and stylesheet was rendered without executing PHP, config, archive scripts or private records. Only public presentation files/assets were read. Dynamic count displays were resolved for the presentation; original static pricing is not carried into the application.
- Implementation: [restored React homepage](docs/landing-redesign/03-restored-homepage.jpg), isolated staging at `http://localhost:6080/`.
- [Same-input full comparison](docs/landing-redesign/comparison.jpg) and [focused typography/CTA comparison](docs/landing-redesign/focused-comparison.jpg) were opened and visually inspected together. Comparisons are exact crops from captured screenshots, not mockups.
- Both original saved images: 1364×1024 pixels, native desktop with a 1212×886 browser window. At 100% zoom the page content region is approximately 1180×758 CSS pixels. Both were cropped at (92,174) to (1272,932), at the same density (1x); no density rescaling. The staging-only banner adds vertical height on the implementation, a deliberate safety difference. Chrome borders/desktop were excluded from the comparison.
- State: top of homepage, logged-out client acquisition view. Source header is static/logged-out; implementation CTA enters the actual signup flow. Narrow layout was checked at 300% zoom, about 393 CSS pixels wide; this is zoom reflow, not physical-device emulation.

## Required fidelity surfaces

| Surface | Comparison and result |
| --- | --- |
| Fonts / typography | Restored Georgia/Times serif headline and wordmark, original three-line headline composition, Inter body/control typography and gold emphasis. Responsive desktop headline is slightly smaller than original fixed 64px at this viewport; shorter supporting copy intentionally exposes the request action and mandatory review note. The focused comparison shows readable hierarchy and line wrapping. |
| Spacing / layout rhythm | Restored compact announcement/header, balanced two-column hero, framed photograph, overlapping information cards, proof cards and navy trust strip. The reference's dense paragraph is intentionally shortened. Below the hero, six business functions, a four-part explanation, searchable library, review section, scope, FAQ and final CTA are implemented with shared spacing and responsive grids. |
| Colors / tokens | Original navy #07182f, gold #d9a62e family, white and soft surfaces restored. Solid accessible gold controls replace decorative gradients; no hand-built replacement illustration was used. Body muted text is #5c6b80. Search boundary was strengthened. A navy-on-navy footer wordmark found during review was replaced with a white/gold classic wordmark and rechecked. |
| Imagery | The actual supplied hero image is reused byte-for-byte (SHA-256 a1626be8d93b85e8228574b9526d17617eb7d5aa43a9e3d29d147a41a82d76bd). Supplied dashboard and document-review images remain. Cropping/framing matches the source direction; images are clearly identified as illustrations, not live customer records or endorsements. Phosphor icons replace source text-glyph icons. |
| Copy / content | Clear “Create a notice request” CTA replaces vague workspace access. All 31 existing category names are preserved. The workflow summary describes existing operations without asserting automated issuance, guaranteed outcomes or invented metrics. Eight actual workflow stages replace the archived count of nine. Public fees still follow the backend legal-review display gate. Mandatory advocate vetting, checking and necessary corrections/updates are stated beside the hero action, in the review section/FAQ and full policy note. |

## Iterations and findings

1. **P1, initial current homepage:** unrelated sans-serif branding, vague request action and a large standalone policy block before the hero weakened the original visual direction. Evidence: current-before capture and uploaded-source capture. Restored the source's serif/navy/gold identity and put the complete mandatory review statement into a compact hero aside; retained the full policy lower down. Post-fix: full and focused comparisons above.
2. **P2, first restoration pass:** headline wrapped to two lines instead of the original three-line rhythm. Explicit editorial breaks and shorter supporting copy restore the composition while keeping the CTA visible. Post-fix: 03 and focused comparison.
3. **P2, category → signup:** arriving from the scrolled library retained the old scroll position, opening signup halfway down. Login/signup now reset scroll on mount. Repeated navigation opened signup at the heading and login at its first fields; selected category remained in the continuation URL.
4. **P2, narrow header access:** login must remain reachable when the compact header hides its desktop login link. Added a real Client login link inside the mobile dialog. Tested open, scroll and Escape with focus returning to the menu button. Evidence: 06.
5. **P2, footer contrast:** inherited legacy logo styling made the wordmark dark on the navy footer. The classic homepage now uses the original serif wordmark with white/gold text. Post-fix: 08.
6. **P2, search affordance:** strengthened the input boundary and retained a persistent label, focus indicator, result count and no-match recovery. Tested invoice filtering, no-match state and Clear search restoring all 31 categories. Evidence: 04.

No actionable P0/P1/P2 visual findings remain in the tested scope. P3 follow-up: full physical-device checks and future editorial refinement of below-the-fold copy. Conversion improvement is a design goal, not a measured outcome; no conversion-rate claim is made.

## Flow checks and health

| Step | Action / observed result | Health |
| --- | --- | --- |
| 1 | Original and restored homepage compared at the same desktop size/state | Passed for tested visual scope |
| 2 | Header Notice library opens its section below the sticky header | Passed |
| 3 | “invoice” shows the matching existing category; no-match and reset work | Passed |
| 4 | Category opens signup with an internal intake continuation | Passed navigation; no new real account created |
| 5 | Signup → Client login retains category and starts at the top | Passed |
| 6 | Synthetic client login returns to the existing intake route | Passed, isolated staging only |
| 7 | Start request persists the selected invoice category through real intake APIs; synthetic subject saved; Save and close lists it alongside the older saved request | Passed; [05](docs/landing-redesign/05-category-prefilled-intake.jpg) |
| 8 | Mobile navigation at 300% zoom opens, offers client login and closes on Escape with visible focus restoration | Passed tested reflow; [06](docs/landing-redesign/06-mobile-navigation.jpg) |
| 9 | Mandatory-review FAQ opens; scope/fee note and footer disclosure remain visible | Passed visual interaction |
| 10 | Tab exposes Skip to content; Enter then Tab reaches the primary request action with visible focus | Passed; [09](docs/landing-redesign/09-keyboard-request-action.jpg) |

## Technical checks and limits

- TypeScript and production Vite build passed locally. Thirteen unit tests pass, including two new tests for category continuity and rejection of external/protocol-relative/unrelated continuation URLs. The existing workflow integration suites are unchanged and run in GitHub CI with both storage modes.
- Native Chromium provided the rendered comparison and interaction evidence. The cloud-browser wrapper failed with “Browser Use could not read requirements”; native computer use remained available.
- Console inspection was attempted through Chromium DevTools, but the managed browser explicitly reported “DevTools not allowed on this page — Your organization has blocked the use of DevTools on this page.” No policy bypass was attempted. **Console errors were not inspected.** The observed navigation, API-backed save and visible error states passed; this is not equivalent to a console audit.
- No screen reader or physical phone was available. Zoom, labels, focus and native disclosure checks do not certify WCAG conformance. Independent BCI/engagement-model review remains required; no legal approval flags were enabled.
- Existing backend features, users, cases, documents, policies and professional-review gates were retained. No production site/database change, external email, real payment or external AI request occurred.

## Implementation checklist

- [x] Restore source-grounded typography, palette, layout and supplied assets.
- [x] Wire real navigation, category search, no-match recovery and onboarding continuation.
- [x] Validate internal-only continuation; preserve existing saved requests.
- [x] Exercise synthetic category → login → saved draft path.
- [x] Recheck visual findings after fixes; save screenshots and combined comparisons.
- [x] Retain production/BCI/accessibility release boundaries.
- [ ] Inspect browser console when an approved browser environment permits it.
- [ ] Run full physical-device/screen-reader/provider UAT before production release.

final result: passed
