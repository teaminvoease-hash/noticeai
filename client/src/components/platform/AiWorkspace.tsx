import { useEffect, useMemo, useState } from "react";
import {
  Sparkle,
  FileText,
  DownloadSimple,
  ShieldCheck,
  ArrowRight,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { AiFacts, ExtractionResult, Role } from "@/types/platform";
interface Reference {
  id: string;
  act: string;
  section: string;
  description: string;
  verify: string;
  source: string;
  status: string;
}
interface AiStatus {
  textExtraction: boolean;
  aiEnabled: boolean;
  provider: string;
  model: string;
  references: Reference[];
}
interface Artifact {
  _id: string;
  kind: "facts" | "draft";
  draft?: string;
  facts?: AiFacts;
  provider: string;
  model: string;
  createdAt: string;
  sourceRevision: number;
  sourceFile?: string;
  intent?: "initial" | "revision";
  appliedRevision?: number;
}
interface Props {
  matterId: string;
  role: Role;
  revision: number;
  paymentStatus: string;
  signedFile?: string;
  files: string[];
  caseSummary?: string;
  hasDraft: boolean;
  editingDraft?: boolean;
  onApplied: () => Promise<unknown>;
  onAdoptFacts?: (text: string) => void;
}
export default function AiWorkspace({
  matterId,
  role,
  revision,
  paymentStatus,
  signedFile,
  files,
  caseSummary = "",
  hasDraft,
  editingDraft = false,
  onApplied,
  onAdoptFacts,
}: Props) {
  const [status, setStatus] = useState<AiStatus | null>(null),
    [artifacts, setArtifacts] = useState<Artifact[]>([]),
    [selected, setSelected] = useState(""),
    [extraction, setExtraction] = useState<ExtractionResult | null>(null),
    [consent, setConsent] = useState(false),
    [references, setReferences] = useState<string[]>([]),
    [active, setActive] = useState<Artifact | null>(null),
    [reviewed, setReviewed] = useState(false),
    [instructions, setInstructions] = useState(""),
    [editedDraft, setEditedDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const readable = useMemo(
    () => [...new Set(files)].filter((f) => /\.(pdf|docx)$/i.test(f)),
    [files],
  );
  async function refresh() {
    const [state, history] = await Promise.all([
      api<AiStatus>("/api/ai/status"),
      api<Artifact[]>("/api/ai/matters/" + matterId + "/artifacts"),
    ]);
    setStatus(state);
    setArtifacts(history);
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [matterId]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to process this document.",
      );
    } finally {
      setBusy(false);
    }
  }
  function choose(artifact: Artifact) {
    if (
      proposalDirty &&
      !window.confirm(
        "Discard your unsaved proposal edits and open another proposal?",
      )
    )
      return;
    setActive(artifact);
    setReviewed(false);
    setEditedDraft(artifact.draft || "");
  }
  const proposalDirty =
    active?.kind === "draft" &&
    active.appliedRevision == null &&
    editedDraft !== (active.draft || "");
  useEffect(() => {
    if (!proposalDirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      if (
        !window.confirm(
          "Leave this matter and discard your unsaved AI-proposal edits?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [proposalDirty]);
  return (
    <Card className="ai-workspace my-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkle size={22} className="text-primary" />
            <CardTitle>Document intelligence</CardTitle>
          </div>
          <Badge>
            {status?.aiEnabled
              ? "AI provider configured"
              : "Local text extraction available"}
          </Badge>
        </div>
        <CardDescription>
          Extract source text, review facts and prepare an advocate-reviewed
          proposal. No extracted content replaces the matter automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-7 xl:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-xs font-semibold"
              htmlFor={"ai-source-" + matterId}
            >
              Source document
            </label>
            <select
              id={"ai-source-" + matterId}
              className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setExtraction(null);
                setConsent(false);
              }}
            >
              <option value="">Use the matter’s recorded facts</option>
              {readable.map((f, i) => (
                <option value={f} key={f}>
                  Attached PDF/DOCX {i + 1} · {f.slice(-18)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Text PDFs and DOCX are supported, up to 10 MB and 50 PDF pages.
              Scanned pages require manual transcription; OCR is not configured.
            </p>
            <Button
              className="mt-3"
              variant="outline"
              disabled={busy || !selected}
              onClick={() =>
                run(async () => {
                  const data = await api<ExtractionResult>(
                    "/api/ai/extract",
                    "POST",
                    { fileName: selected },
                  );
                  setExtraction(data);
                  setMessage(
                    "Text extracted locally. Review the source before using it.",
                  );
                })
              }
            >
              <FileText />
              Extract text locally
            </Button>
            {extraction && (
              <div className="mt-4 rounded-lg border bg-slate-50 p-4">
                <p className="text-xs font-semibold">
                  {extraction.originalName} ·{" "}
                  {extraction.pages ? extraction.pages + " pages" : "DOCX"}
                </p>
                {extraction.truncated && (
                  <p className="my-2 text-xs text-amber-800">
                    Only the first 50,000 characters are shown.
                  </p>
                )}
                <label className="sr-only" htmlFor={"source-text-" + matterId}>
                  Extracted source text
                </label>
                <textarea
                  id={"source-text-" + matterId}
                  readOnly
                  value={extraction.text}
                  rows={9}
                  className="mt-3 w-full rounded-md border bg-white p-3 text-xs leading-6"
                />
                {onAdoptFacts && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      onAdoptFacts(extraction.text.slice(0, 20000));
                      setMessage(
                        "The first 20,000 characters were prefilled in the facts editor. Review and edit before saving.",
                      );
                    }}
                  >
                    Prefill facts editor for review
                    <ArrowRight />
                  </Button>
                )}
              </div>
            )}
            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex gap-2 text-primary">
                <ShieldCheck size={19} />
                <strong className="text-xs">A human remains in control</strong>
              </div>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                Extraction can miss context. AI proposals can contain errors.
                Verify evidence, applicable law, deadlines, jurisdiction and
                relief before approval or signature.
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI preparation</h3>
            {editingDraft && (
              <p
                role="status"
                className="my-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-7"
              >
                Save or cancel your current manual edits before generating or
                applying an AI draft proposal.
              </p>
            )}
            {role === "lawyer" && !signedFile && (
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                You can also{" "}
                <a href="#draft" className="font-medium text-primary underline">
                  edit the saved notice manually
                </a>
                . AI availability does not prevent manual drafting and vetting.
              </p>
            )}
            {!status?.aiEnabled ? (
              <p className="mt-3 rounded-lg border border-dashed p-4 text-xs leading-6 text-muted-foreground">
                External AI processing is disabled or unconfigured in this
                environment. An administrator can configure a staging-only
                provider key and enable AI after reviewing data handling. Local
                extraction and manual drafting continue to work.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Selected {selected ? "document text" : "matter facts"} and
                  case context will be sent to {status.provider}. Do not include
                  unrelated personal or privileged material.
                </p>
                <label className="mt-3 flex items-start gap-3 text-xs leading-6">
                  <input
                    className="mt-1 size-4 shrink-0"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  I authorise sending this selected content to the configured AI
                  provider for this request.
                </label>
                <details className="my-4">
                  <summary className="cursor-pointer text-xs font-semibold">
                    Candidate legal provisions — advocate verification required
                  </summary>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    Select only provisions relevant to the facts. This curated
                    reference list is not current-law research or a
                    determination of applicability.
                  </p>
                  {status.references.map((r) => (
                    <label
                      key={r.id}
                      className="my-3 flex items-start gap-3 text-xs leading-6"
                    >
                      <input
                        className="mt-1 size-4 shrink-0"
                        type="checkbox"
                        checked={references.includes(r.id)}
                        onChange={(e) =>
                          setReferences((v) =>
                            e.target.checked
                              ? [...v, r.id]
                              : v.filter((x) => x !== r.id),
                          )
                        }
                      />
                      <span>
                        <strong>
                          {r.act} · s. {r.section}
                        </strong>
                        <span className="block">{r.description}</span>
                        <span className="block text-muted-foreground">
                          {r.verify}{" "}
                          <a
                            href={r.source}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            India Code
                          </a>
                        </span>
                      </span>
                    </label>
                  ))}
                </details>
                {role === "lawyer" && hasDraft && !signedFile && (
                  <div className="my-4 rounded-lg border border-primary/20 bg-muted/40 p-4">
                    <label
                      htmlFor={"ai-revision-" + matterId}
                      className="block text-sm font-semibold"
                    >
                      What should AI change in this notice?
                    </label>
                    <textarea
                      id={"ai-revision-" + matterId}
                      value={instructions}
                      maxLength={4000}
                      rows={4}
                      disabled={busy}
                      className="mt-3 w-full rounded-lg border border-input bg-background p-3 text-sm leading-7"
                      placeholder="For example: clarify the requested remedy using the uploaded correspondence. Preserve the verified facts."
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      Uses saved draft revision {revision}, the selected source
                      and your instructions. Save manual edits first. The result
                      remains a proposal until you review and apply it.
                    </p>
                    {paymentStatus !== "Paid" && (
                      <p className="mt-2 text-xs">
                        Verified payment is required for draft revisions.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "facts",
                      "draft",
                      ...(role === "lawyer" && hasDraft ? ["revise"] : []),
                    ] as ("facts" | "draft" | "revise")[]
                  ).map((kind) => (
                    <Button
                      key={kind}
                      variant={
                        kind === "revise" || (kind === "draft" && !hasDraft)
                          ? "default"
                          : "outline"
                      }
                      disabled={
                        busy ||
                        !consent ||
                        (editingDraft && kind !== "facts") ||
                        (proposalDirty && kind !== "facts") ||
                        !!signedFile ||
                        (kind === "revise" &&
                          (paymentStatus !== "Paid" ||
                            instructions.trim().length < 10))
                      }
                      onClick={() =>
                        run(async () => {
                          const result = await api<{ artifact: Artifact }>(
                            "/api/ai/matters/" + matterId + "/" + kind,
                            "POST",
                            {
                              fileName: selected || undefined,
                              text: extraction?.text || caseSummary,
                              referenceIds: references,
                              consentToAi: consent,
                              ...(kind === "revise"
                                ? { instructions, revision }
                                : {}),
                            },
                          );
                          choose(result.artifact);
                          await refresh();
                          setMessage(
                            "Proposal saved for review. The matter’s facts and draft have not changed.",
                          );
                        })
                      }
                    >
                      <Sparkle />
                      {kind === "revise"
                        ? "Propose changes to saved notice"
                        : kind === "facts"
                          ? "Propose extracted facts"
                          : "Prepare notice proposal"}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <h3 className="mb-2 mt-6 text-sm font-semibold">
              Working-copy exports
            </h3>
            <p className="mb-3 text-xs leading-6 text-muted-foreground">
              Exports use the current saved matter draft, not an unapplied AI
              proposal. They are marked unsigned and require independent review.
            </p>
            {!hasDraft ? (
              <p className="text-xs text-muted-foreground">
                Save a notice draft before exporting a working copy.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a href={"/api/matters/" + matterId + "/export/pdf"}>
                    <DownloadSimple />
                    PDF working copy
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={"/api/matters/" + matterId + "/export/docx"}>
                    <DownloadSimple />
                    Editable DOCX
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-800"
          >
            <WarningCircle size={18} className="shrink-0" />
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mt-4 text-xs leading-6 text-muted-foreground"
          >
            {message}
          </p>
        )}
        {artifacts.length > 0 && (
          <div className="mt-6 border-t pt-5">
            <h3 className="mb-3 text-sm font-semibold">Saved AI proposals</h3>
            <div className="flex flex-wrap gap-2">
              {artifacts.map((a) => (
                <Button
                  key={a._id}
                  variant="outline"
                  size="sm"
                  onClick={() => choose(a)}
                >
                  {a.kind === "facts"
                    ? "Facts"
                    : a.intent === "revision"
                      ? "Revision"
                      : "Draft"}
                  {a.appliedRevision != null
                    ? ` · Applied v${a.appliedRevision}`
                    : ""}{" "}
                  · {new Date(a.createdAt).toLocaleDateString("en-IN")}
                </Button>
              ))}
            </div>
          </div>
        )}
        {active && (
          <section className="mt-5 rounded-lg border p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {active.kind === "facts"
                  ? "Fact proposal"
                  : "Notice draft proposal"}
              </h3>
              <Badge>
                {active.appliedRevision != null
                  ? `Applied to revision ${active.appliedRevision}`
                  : "Unapplied · Review required"}
              </Badge>
            </div>
            <p className="my-3 text-xs text-muted-foreground">
              {active.provider} / {active.model} · Based on draft revision{" "}
              {active.sourceRevision}
            </p>
            {active.kind === "facts" && active.facts ? (
              <>
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {active.facts.summary}
                </p>
                {(
                  [
                    "parties",
                    "dates",
                    "amounts",
                    "obligations",
                    "missingInformation",
                    "sourceQuotes",
                  ] as const
                ).map((key) => (
                  <div key={key} className="mt-4">
                    <h4 className="text-xs font-semibold">
                      {key.replace(/([A-Z])/g, " $1")}
                    </h4>
                    <ul className="mt-2 list-inside list-disc text-xs leading-7 text-muted-foreground">
                      {active.facts?.[key].map((value, i) => (
                        <li key={i}>{value}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {onAdoptFacts && (
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => onAdoptFacts(active.facts!.summary)}
                  >
                    Prefill the facts editor for review
                  </Button>
                )}
              </>
            ) : (
              <>
                {role === "lawyer" && active.appliedRevision == null ? (
                  <>
                    <label
                      htmlFor="ai-proposal-editor"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Review and edit the proposed notice
                    </label>
                    <p className="mb-3 text-xs leading-6 text-muted-foreground">
                      Your edits are saved only when you save the reviewed
                      proposal as a new draft version.
                    </p>
                    <textarea
                      id="ai-proposal-editor"
                      className="w-full rounded-lg border border-input bg-background p-4 font-serif text-sm leading-8"
                      rows={14}
                      maxLength={100000}
                      value={editedDraft}
                      disabled={busy}
                      onChange={(e) => {
                        setEditedDraft(e.target.value);
                        setReviewed(false);
                      }}
                    />
                    <details className="my-3 text-sm">
                      <summary>Compare with original AI proposal</summary>
                      <pre className="mt-3 whitespace-pre-wrap break-words rounded-md bg-muted p-4 leading-7">
                        {active.draft}
                      </pre>
                    </details>
                  </>
                ) : (
                  <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-4 font-serif text-sm leading-8">
                    {active.draft}
                  </pre>
                )}
                {active.appliedRevision != null && (
                  <p className="my-3 text-sm">
                    This original AI proposal was used for saved revision{" "}
                    {active.appliedRevision}. The saved draft and version
                    history include any advocate edits. Changes require fresh
                    professional vetting.
                  </p>
                )}
                {role === "lawyer" && active.appliedRevision == null && (
                  <>
                    <label className="my-4 flex items-start gap-3 text-xs leading-6">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0"
                        checked={reviewed}
                        onChange={(e) => setReviewed(e.target.checked)}
                      />
                      I have reviewed this proposal against the evidence and
                      will apply it as a draft version, not as a signed or
                      issued notice.
                    </label>
                    <Button
                      disabled={
                        busy ||
                        !reviewed ||
                        editingDraft ||
                        !editedDraft.trim() ||
                        paymentStatus !== "Paid" ||
                        !!signedFile ||
                        revision !== active.sourceRevision
                      }
                      onClick={() =>
                        run(async () => {
                          const saved = await api<{ draftRevision: number }>(
                            "/api/ai/artifacts/" + active._id + "/apply",
                            "POST",
                            { reviewed: true, editedDraft, matterId },
                          );
                          setActive({
                            ...active,
                            appliedRevision: saved.draftRevision,
                          });
                          setReviewed(false);
                          setMessage(
                            "Saved as a new draft version. Fresh professional vetting is required before signing.",
                          );
                          try {
                            await onApplied();
                            await refresh();
                          } catch {
                            setError(
                              "The draft was saved, but the latest view could not refresh. Reload this matter before your next action.",
                            );
                          }
                        })
                      }
                    >
                      Save reviewed proposal as new draft
                    </Button>
                    {revision !== active.sourceRevision && (
                      <p className="mt-2 text-xs text-amber-800">
                        The saved draft changed after this proposal. Prepare a
                        fresh proposal for the current version.
                      </p>
                    )}
                    {paymentStatus !== "Paid" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Verified payment is required before editing the saved
                        notice draft.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => {
                if (
                  !proposalDirty ||
                  window.confirm(
                    "Discard your unsaved proposal edits and close this proposal?",
                  )
                )
                  setActive(null);
              }}
            >
              Close proposal
            </Button>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
