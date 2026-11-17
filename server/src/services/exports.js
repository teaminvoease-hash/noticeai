const PDFDocument = require("pdfkit");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
} = require("docx");
const sanitize = require("sanitize-html");
function plain(html) {
  return sanitize(
    String(html || "")
      .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<br\s*\/?\s*>/gi, "\n"),
    { allowedTags: [], allowedAttributes: {} },
  )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
const label =
  "UNSIGNED WORKING COPY — INDEPENDENT ADVOCATE REVIEW AND SIGNATURE REQUIRED";
async function exportNotice(notice, format) {
  const text = plain(notice.generatedNotice);
  if (!text)
    throw Object.assign(new Error("No draft is available to export."), {
      status: 409,
    });
  const meta = `${notice.noticeId} | Revision ${notice.draftRevision || 0} | ${notice.subject}`;
  if (format === "docx") {
    const doc = new Document({
      creator: "ResolveX",
      title: notice.subject,
      description: label,
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "RESOLVEX / NOTICE WORKSPACE",
                      bold: true,
                      color: "173A63",
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: notice.noticeId + " · Working copy · Page ",
                      size: 16,
                      color: "66758A",
                    }),
                    new TextRun({ children: [PageNumber.CURRENT] }),
                  ],
                }),
              ],
            }),
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: label,
                  bold: true,
                  color: "9A5B17",
                  size: 18,
                }),
              ],
              spacing: { after: 180 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: meta, size: 18, color: "60718A" }),
              ],
              spacing: { after: 300 },
            }),
            ...text
              .split("\n")
              .map(
                (line) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: line,
                        font: "Noto Sans Devanagari",
                        size: 23,
                      }),
                    ],
                    spacing: { after: 120, line: 310 },
                  }),
              ),
          ],
        },
      ],
    });
    return {
      buffer: await Packer.toBuffer(doc),
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  const doc = new PDFDocument({
    size: "A4",
    margin: 58,
    bufferPages: true,
    info: { Title: notice.subject, Author: "ResolveX", Subject: label },
  });
  const parts = [];
  const result = new Promise((resolve, reject) => {
    doc.on("data", (p) => parts.push(p));
    doc.on("end", () => resolve(Buffer.concat(parts)));
    doc.on("error", reject);
  });
  doc.registerFont(
    "Devanagari",
    require.resolve(
      "@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff2",
    ),
  );
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#153758")
    .text("RESOLVEX / NOTICE WORKSPACE");
  doc
    .moveDown()
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#965718")
    .text(label.replace("—", "-"));
  doc.moveDown().font("Helvetica").fontSize(8).fillColor("#6b7b90").text(meta);
  doc.moveDown(2).fontSize(11).fillColor("#172b43");
  for (const line of text.split("\n")) {
    const runs = line.match(
      /[\u0900-\u097f\u1cd0-\u1cff]+|[^\u0900-\u097f\u1cd0-\u1cff]+/gu,
    ) || [""];
    runs.forEach((run, i) =>
      doc
        .font(/[\u0900-\u097f]/u.test(run) ? "Devanagari" : "Helvetica")
        .text(run, { continued: i < runs.length - 1, lineGap: 5 }),
    );
    if (!line) doc.moveDown(0.4);
  }
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#78869a")
      .text(
        `${notice.noticeId} | Working copy | ${i + 1} / ${range.count}`,
        58,
        doc.page.height - 40,
        { lineBreak: false },
      );
  }
  doc.end();
  return { buffer: await result, type: "application/pdf" };
}
module.exports = { plain, exportNotice, label };
