
const { Client } = require("../models/client.model");
const { ClientNotice } = require("../models/clientNotice.model");
const { ClientDocument } = require("../models/clientDocument.model");
const { ClientPayment } = require("../models/clientPayment.model");
const { ClientNotification } = require("../models/clientNotification.model");
const { ClientDefaulter } = require("../models/clientDefaulter.model");
const { Lawyer } = require("../models/lawyer.model");
const { EmailSendHnaldre } = require("../middleware/SendEmail");
const bcrypt = require("bcryptjs");

const buildId = (prefix) => `${prefix}-${require("crypto").randomUUID()}`;

const generateClientNoticeId = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const noticeId = `LN-${random}`;
    const exists = await ClientNotice.exists({ noticeId });
    if (!exists) return noticeId;
  }

  for (let number = 1000; number <= 9999; number += 1) {
    const noticeId = `LN-${number}`;
    const exists = await ClientNotice.exists({ noticeId });
    if (!exists) return noticeId;
  }

  throw new Error("All 4 digit notice IDs are already used");
};



const stripHtmlToText = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};



const buildFallbackNotice = ({ client, defaulter, subject, category, recipientDetails, caseSummary }) => {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `
LEGAL NOTICE

Date: ${today}

From:
${client?.name || "Client Name"}
${client?.company ? `${client.company}\n` : ""}${client?.address || ""}
${client?.phone ? `Phone: ${client.phone}\n` : ""}${client?.email ? `Email: ${client.email}` : ""}

To:
${recipientDetails || defaulter?.name || "Recipient Name"}

Subject: ${subject || "Legal Notice"}
Category: ${category || "General"}

Sir/Madam,

Under instructions from and on behalf of my client ${client?.name || "the client"}, I hereby issue this legal notice to you in relation to the matter described below.

1. My client states that the dispute pertains to the category of ${category || "general legal"} matter.

2. The notice is being issued against ${defaulter?.name || "the recipient"}${defaulter?.companyName ? ` of ${defaulter.companyName}` : ""}. The available contact details are as follows:
   Name: ${defaulter?.name || "-"}
   Company: ${defaulter?.companyName || "-"}
   Address: ${defaulter?.address || "-"}
   Phone: ${defaulter?.phone || "-"}
   Email: ${defaulter?.email || "-"}

3. As per the records provided by my client, the financial particulars, if applicable, require verification against the supporting records. Recorded amount: ${defaulter?.totalDueAmount ? "Rs. "+Number(defaulter.totalDueAmount).toLocaleString("en-IN") : "Not supplied"}. Recorded transaction date: ${defaulter?.lastInvoiceDate || "Not supplied"}.

4. The material facts, as provided by my client, are stated below:
${caseSummary || "The client has reported a dispute and seeks immediate resolution in accordance with law."}

5. My client calls upon you to immediately comply with your legal and contractual obligations, address the documented matter. [Advocate: specify the precise relief, any substantiated amount and a legally appropriate response deadline after checking the facts and applicable law.]

6. In the event of failure to comply within the above period, [Advocate: identify appropriate remedies and the competent forum only after reviewing the evidence, jurisdiction and applicable law. Do not infer criminal liability from a contractual dispute.]

7. You are further called upon to preserve all relevant records, communications, invoices, agreements, and supporting materials relating to this matter.

This notice is issued without prejudice to all other legal rights and remedies available to my client under applicable law.

For and on behalf of the Client,

${client?.name || "Client Name"}
  `.trim();
};

const generateNoticeWithFallback = async (payload) => 'PRELIMINARY TEMPLATE — NOT AI-GENERATED. INDEPENDENT ADVOCATE REVIEW REQUIRED.\n\n'+buildFallbackNotice(payload);

const generateDefaulterId = async () => {
  let nextId = "";
  let exists = true;

  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    nextId = `DFT-${random}`;
    const found = await ClientDefaulter.findOne({ defaulterId: nextId }).select("_id");
    exists = Boolean(found);
  }

  return nextId;
};

const sendNoticeCreatedEmails = async ({ client, createdNotice, defaulter, category, recipientDetails }) => {
  const clientEmail = String(client?.email || "").trim();
  const adminEmail = process.env.NOTIFY_EMAIL;
  const safeClientName = client?.name || client?.owner_name || client?.ownerName || "Client";
  const safeNoticeId = createdNotice?.noticeId || "New Notice";
  const safeSubject = createdNotice?.subject || "-";
  const safeDefaulter = createdNotice?.defaulterName || defaulter?.name || "-";
  const safeCategory = category || createdNotice?.category || "-";
  const safeRecipientDetails = recipientDetails || createdNotice?.recipientDetails || "-";

  const clientSubject = `Notice submission confirmation - ${safeNoticeId}`;
  const clientMessage = `
Dear ${safeClientName},

Your legal notice request has been submitted successfully on Legal Notice Platform.

Basic details:
- Notice ID: ${safeNoticeId}
- Subject: ${safeSubject}
- Category: ${safeCategory}
- Defaulter: ${safeDefaulter}

Our team will review and process your notice further.

Regards,
Legal Notice Platform
  `.trim();

  const adminSubject = `New client notice created - ${safeNoticeId}`;
  const adminMessage = `
A new client notice has been created on Legal Notice Platform.

Basic details:
- Notice ID: ${safeNoticeId}
- Client Name: ${safeClientName}
- Client Email: ${clientEmail || "-"}
- Subject: ${safeSubject}
- Category: ${safeCategory}
- Defaulter: ${safeDefaulter}
- Recipient Details: ${safeRecipientDetails}

Please review this notice in the admin dashboard.
  `.trim();

  const tasks = [];

  if (clientEmail) {
    tasks.push(
      EmailSendHnaldre(clientEmail, clientSubject, clientMessage).catch((emailError) => {
        console.log("Failed to send client notice confirmation email:", emailError.message || emailError);
      })
    );
  }

  tasks.push(
    EmailSendHnaldre(adminEmail, adminSubject, adminMessage).catch((emailError) => {
      console.log("Failed to send admin notice alert email:", emailError.message || emailError);
    })
  );

  await Promise.all(tasks);
};

const sendNoticeAssignedEmails = async ({ lawyer, client, notice }) => {
  const lawyerEmail = String(lawyer?.email || "").trim();
  const clientEmail = String(client?.email || "").trim();
  const lawyerName = lawyer?.name || "Lawyer";
  const clientName = client?.name || client?.owner_name || client?.ownerName || "Client";
  const noticeId = notice?.noticeId || "Notice";
  const subject = notice?.subject || "-";
  const category = notice?.category || "-";

  const lawyerSubject = `New notice assigned - ${noticeId}`;
  const lawyerMessage = `
Dear ${lawyerName},

Admin has assigned a new notice to you.

Notice details:
- Notice ID: ${noticeId}
- Subject: ${subject}
- Category: ${category}
- Client Name: ${clientName}

Please login to the lawyer dashboard to review the notice.

Regards,
Legal Notice Platform
  `.trim();

  const clientSubject = `Your notice has been assigned - ${noticeId}`;
  const clientMessage = `
Dear ${clientName},

Your notice has now been assigned to a lawyer.

Assignment details:
- Notice ID: ${noticeId}
- Subject: ${subject}
- Assigned Lawyer: ${lawyerName}${lawyer?.advocate_id ? ` (${lawyer.advocate_id})` : ""}

The assigned lawyer will review your notice in the next stage.

Regards,
Legal Notice Platform
  `.trim();

  const tasks = [];

  if (lawyerEmail) {
    tasks.push(
      EmailSendHnaldre(lawyerEmail, lawyerSubject, lawyerMessage).catch((emailError) => {
        console.log("Failed to send lawyer notice assignment email:", emailError.message || emailError);
      })
    );
  }

  if (clientEmail) {
    tasks.push(
      EmailSendHnaldre(clientEmail, clientSubject, clientMessage).catch((emailError) => {
        console.log("Failed to send client notice assignment email:", emailError.message || emailError);
      })
    );
  }

  await Promise.all(tasks);
};

const sendNoticeDispatchNotifications = async ({ lawyer, client, notice, defaulter }) => {
  const adminEmail = "quloedigotal@gmail.com";
  const clientEmail = String(client?.email || "").trim();
  const lawyerName = lawyer?.name || "Assigned Lawyer";
  const clientName = client?.name || client?.owner_name || client?.ownerName || "Client";
  const defaulterName = defaulter?.name || notice?.defaulterName || "Defaulter";
  const defaulterEmail = String(defaulter?.email || "").trim();
  const noticeId = notice?.noticeId || "Notice";
  const subject = notice?.subject || "-";

  const adminSubject = `Notice email sent to defaulter - ${noticeId}`;
  const adminMessage = `
A notice email has been sent to the defaulter by the assigned lawyer.

Dispatch details:
- Notice ID: ${noticeId}
- Subject: ${subject}
- Client Name: ${clientName}
- Lawyer Name: ${lawyerName}${lawyer?.advocate_id ? ` (${lawyer.advocate_id})` : ""}
- Defaulter Name: ${defaulterName}
- Defaulter Email: ${defaulterEmail || "-"}

Please refer to the lawyer dashboard/admin dashboard for further action.
  `.trim();

  const clientSubject = `Notice sent to defaulter - ${noticeId}`;
  const clientMessage = `
Dear ${clientName},

Your assigned lawyer has sent the notice to the defaulter.

Dispatch details:
- Notice ID: ${noticeId}
- Subject: ${subject}
- Lawyer Name: ${lawyerName}${lawyer?.advocate_id ? ` (${lawyer.advocate_id})` : ""}
- Defaulter Name: ${defaulterName}
- Defaulter Email: ${defaulterEmail || "-"}

Regards,
Legal Notice Platform
  `.trim();

  const tasks = [
    EmailSendHnaldre(adminEmail, adminSubject, adminMessage).catch((emailError) => {
      console.log("Failed to send admin notice dispatch email:", emailError.message || emailError);
    }),
  ];

  if (clientEmail) {
    tasks.push(
      EmailSendHnaldre(clientEmail, clientSubject, clientMessage).catch((emailError) => {
        console.log("Failed to send client notice dispatch email:", emailError.message || emailError);
      })
    );
  }

  await Promise.all(tasks);
};

const submitNotice = async (req, res) => {
  try {
    const {
      clientId,
      subject,
      category,
      defaulterId,
      defaulterName,
      recipientDetails,
      caseSummary,
      supportingDocument,
    } = req.body;

    if (!clientId || !subject || !category || !defaulterId) {
      return res.status(200).json({ success: false, message: "clientId, subject, category and defaulterId are required" });
    }

    const client = await Client.findById(clientId).select("authorityLetter name email phone address company owner_name ownerName");
    if (!client || !String(client.authorityLetter || "").trim()) {
      return res.status(200).json({
        success: false,
        message: "Please upload authority letter in client profile before creating notice",
      });
    }

    const defaulter = await ClientDefaulter.findById(defaulterId);
    if (!defaulter || String(defaulter.clientId) !== String(clientId)) {
      return res.status(200).json({
        success: false,
        message: "Selected defaulter not found for this client",
      });
    }

    const generatedNotice = await generateNoticeWithFallback({
      client,
      defaulter,
      subject,
      category,
      recipientDetails,
      caseSummary,
    });

    const created = await ClientNotice.create({
      clientId,
      ...(req.body.intakeDraftId?{intakeDraftId:req.body.intakeDraftId,supportingDocuments:req.body.supportingDocuments||[]}:{}),
      noticeId: await generateClientNoticeId(),
      subject,
      category,
      defaulterId: String(defaulterId || "").trim(),
      defaulterName: String(defaulterName || "").trim(),
      recipientDetails: recipientDetails || "",
      caseSummary: caseSummary || "",
      supportingDocument: supportingDocument || "",
      authorityLetter: client.authorityLetter,
      generatedNotice,
      paymentStatus: "Pending",
      draftStatus: "Blocked",
      signedNoticeStatus: "Pending",
      status: "Pending",
    });

    await ClientNotification.create({clientId,notificationId:buildId('NTF'),channel:'Portal',noticeId:created.noticeId,message:'Notice intake saved. Preliminary draft requires payment and independent review.'});
    await sendNoticeCreatedEmails({
      client,
      createdNotice: created,
      defaulter,
      category,
      recipientDetails,
    });

    return res.status(200).json({ success: true, message: "Notice submitted successfully", data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const previewNotice = async (req, res) => {
  try {
    const {
      clientId,
      subject,
      category,
      defaulterId,
      recipientDetails,
      caseSummary,
    } = req.body;

    if (!clientId || !subject || !category || !defaulterId) {
      return res.status(200).json({
        success: false,
        message: "clientId, subject, category and defaulterId are required",
      });
    }

    const client = await Client.findById(clientId).select("authorityLetter name email phone address company owner_name ownerName");
    if (!client || !String(client.authorityLetter || "").trim()) {
      return res.status(200).json({
        success: false,
        message: "Please upload authority letter in client profile before generating preview",
      });
    }

    const defaulter = await ClientDefaulter.findById(defaulterId);
    if (!defaulter || String(defaulter.clientId) !== String(clientId)) {
      return res.status(200).json({
        success: false,
        message: "Selected defaulter not found for this client",
      });
    }

    const generatedNotice = await generateNoticeWithFallback({
      client,
      defaulter,
      subject,
      category,
      recipientDetails,
      caseSummary,
    });

    return res.status(200).json({
      success: true,
      message: "Preview generated successfully",
      data: {
        generatedNotice,
      },
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateNotice = async (req, res) => {
  try {
    const { clientId, subject, category, defaulterId, defaulterName, recipientDetails, caseSummary, supportingDocument } = req.body;

    if (!clientId || !subject || !category || !defaulterId) {
      return res.status(200).json({
        success: false,
        message: "clientId, subject, category and defaulterId are required",
      });
    }

    const client = await Client.findById(clientId).select("authorityLetter name email phone address company owner_name ownerName");
    if (!client || !String(client.authorityLetter || "").trim()) {
      return res.status(200).json({
        success: false,
        message: "Please upload authority letter in client profile before updating notice",
      });
    }

    const existing = await ClientNotice.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Notice not found" });
    }

    if (String(existing.clientId) !== String(clientId)) {
      return res.status(200).json({ success: false, message: "You can update only your own notice" });
    }

    if(req.body.draftRevision!==undefined&&req.body.draftRevision!==(existing.draftRevision||0))return res.status(409).json({success:false,message:'The request changed. Reload before editing the facts.'});
    const defaulter = await ClientDefaulter.findById(defaulterId);
    if (!defaulter || String(defaulter.clientId) !== String(clientId)) {
      return res.status(200).json({
        success: false,
        message: "Selected defaulter not found for this client",
      });
    }

    const generatedNotice = await generateNoticeWithFallback({
      client,
      defaulter,
      subject,
      category,
      recipientDetails,
      caseSummary,
    });

    const updated = await require("../matterServices").replaceRequest(
      req, existing,
      {
        subject,
        category,
        defaulterId: String(defaulterId || "").trim(),
        defaulterName: String(defaulterName || "").trim(),
        recipientDetails: recipientDetails || "",
        caseSummary: caseSummary || "",
        supportingDocument: supportingDocument || "",
        authorityLetter: client.authorityLetter,
        generatedNotice,
      }
    );

    return res.status(200).json({ success: true, message: "Notice updated successfully", data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateNoticeStatus = async (req, res) => {
  try {
    const nextStatus = String(req.body.status || "").trim();
    if (!nextStatus) {
      return res.status(200).json({
        success: false,
        message: "status is required",
      });
    }

    const normalizedStatus = nextStatus.toLowerCase();
    if (!["pending", "approved", "rejected", "verified"].includes(normalizedStatus)) {
      return res.status(200).json({
        success: false,
        message: "Allowed statuses are pending, approved, rejected, verified",
      });
    }

    const existing = await ClientNotice.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Notice not found" });
    }

    const updated = await ClientNotice.findByIdAndUpdate(
      req.params.id,
      { status: normalizedStatus },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Notice status updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const assignNoticeToLawyer = async (req, res) => {
  try {
    const lawyerId = String(req.body.lawyerId || "").trim();
    if (!lawyerId) {
      return res.status(200).json({
        success: false,
        message: "lawyerId is required",
      });
    }

    const notice = await ClientNotice.findById(req.params.id);
    if (!notice) {
      return res.status(200).json({ success: false, message: "Notice not found" });
    }

    const lawyer = await Lawyer.findById(lawyerId).select("name advocate_id email");
    if (!lawyer) {
      return res.status(200).json({ success: false, message: "Lawyer not found" });
    }

    const client = await Client.findById(notice.clientId).select("name email owner_name ownerName");

    const updated = await ClientNotice.findOneAndUpdate(
      {_id:notice._id,updatedAt:notice.updatedAt,signedFile:{$in:[null, ""]}},
      {
        ...(String(notice.lawyerId)!==String(lawyer._id)?{status:"pending"}:{}),
        lawyerId: String(lawyer._id),
        lawyerName: lawyer.name || "",
        lawyerCode: lawyer.advocate_id || "",
      },
      { new: true }
    );

    if(!updated)return res.status(409).json({success:false,message:"The matter changed or was signed. Refresh before assignment."});

    await sendNoticeAssignedEmails({
      lawyer,
      client,
      notice: updated,
    });

    return res.status(200).json({
      success: true,
      message: "Notice assigned successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateGeneratedNotice = async (req, res) => {
  try {
    const lawyerId = String(req.body.lawyerId || "").trim();
    const generatedNotice = String(req.body.generatedNotice || "").trim();

    if (!lawyerId || !generatedNotice) {
      return res.status(200).json({
        success: false,
        message: "lawyerId and generatedNotice are required",
      });
    }

    const existing = await ClientNotice.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Notice not found" });
    }

    if (String(existing.lawyerId || "") !== lawyerId) {
      return res.status(200).json({
        success: false,
        message: "You can edit only notices assigned to your login",
      });
    }

    const updated = await ClientNotice.findByIdAndUpdate(
      req.params.id,
      { generatedNotice },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Generated notice updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const sendNoticeEmailToDefaulter = async (req, res) => {
  try {
    const lawyerId = String(req.body.lawyerId || "").trim();
    if (!lawyerId) {
      return res.status(200).json({
        success: false,
        message: "lawyerId is required",
      });
    }

    const notice = await ClientNotice.findById(req.params.id);
    if (!notice) {
      return res.status(200).json({ success: false, message: "Notice not found" });
    }

    if (String(notice.lawyerId || "") !== lawyerId) {
      return res.status(200).json({
        success: false,
        message: "You can send only notices assigned to your login",
      });
    }

    const destination=require('../services/professionalReview').emailDestination(notice);
    const defaulter = require('mongoose').isValidObjectId(notice.defaulterId)?await ClientDefaulter.findById(notice.defaulterId).select("name email companyName"):null;
    const lawyer = await Lawyer.findById(lawyerId).select("name advocate_id");
    const client = await Client.findById(notice.clientId).select("name email owner_name ownerName");
    const clientName = client?.name || client?.owner_name || client?.ownerName || "Client";
    const lawyerName = lawyer?.name || "Assigned Lawyer";
    const defaulterName = defaulter?.name || notice.defaulterName || "Recipient";
    const emailSubject = `Legal Notice - ${notice.noticeId || "Notice"}`;
    const salutation=notice.professionalReview.serviceRoute.mode==='through_counsel'?'Counsel':defaulterName;
    const emailContent = `
Dear ${salutation},

Please find attached the advocate-provided signed notice for this matter.

Notice ID: ${notice.noticeId || "-"}
Subject: ${notice.subject || "-"}
Category: ${notice.category || "-"}
Issued on behalf of: ${clientName}
Assigned Lawyer: ${lawyerName}${lawyer?.advocate_id ? ` (${lawyer.advocate_id})` : ""}

The attached signed document is the operative copy. No preliminary draft is issued by this message.

Regards,
${lawyerName}
Legal Notice Platform
    `.trim();

    await EmailSendHnaldre(destination, emailSubject, emailContent, [await require('../storage').attachment(notice.signedFile,notice.noticeId+'-signed.pdf')]);
    await ClientNotification.create({clientId:notice.clientId,notificationId:buildId('NTF'),channel:'Portal',noticeId:notice.noticeId,message:'Assigned lawyer dispatched the signed notice by email.'});
    await sendNoticeDispatchNotifications({
      lawyer,
      client,
      notice,
      defaulter,
    });

    return res.status(200).json({
      success: true,
      message: "Notice email sent successfully",
      data: {
        defaulterEmail: destination,
        recipientEmail: destination,
        communicationRoute: notice.professionalReview.serviceRoute.mode,
      },
    });
  } catch (err) {
    return res.status(err.status||400).json({ success: false, message: err.status?err.message:"Unable to send the notice. Check the configured service and approved communication route." });
  }
};

const getNotices = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const data = await ClientNotice.find({ $and: [filter, req.scope || {}] }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const { clientId, noticeId, type, fileName, status, clientEmail, requestMessage, requestedByRole, requestedById, responseFiles } = req.body;
    if (!clientId || !noticeId || !type) {
      return res.status(200).json({ success: false, message: "clientId, noticeId and type are required" });
    }

    const normalizedRole = String(requestedByRole || "client").toLowerCase();
    const resolvedStatus = status || (normalizedRole === "lawyer" ? "sent" : "Requested");

    let created;
    await require("mongoose").connection.transaction(async session=>{
      await require("../matterServices").lockDocumentMatter(req,req.documentMatter,session);
      [created] = await ClientDocument.create([{
      clientId,
      noticeId,
      docId: buildId("DOC"),
      type,
      fileName: fileName || "",
      clientEmail: clientEmail || "",
      requestMessage: requestMessage || "",
      requestedByRole: requestedByRole || "client",
      requestedById: requestedById || "",
      responseFiles: Array.isArray(responseFiles) ? responseFiles : [],
      status: resolvedStatus,
    }],{session});
      await require("../matterServices").event(req,req.documentMatter,resolvedStatus==='Uploaded'?'Documents uploaded':'Document requested',type,session);
    });

    if (normalizedRole === "lawyer" && String(clientEmail || "").trim()) {
      const lawyer = requestedById
        ? await Lawyer.findById(requestedById).select("name email")
        : null;
      const lawyerName = lawyer?.name || "your assigned lawyer";
      const emailSubject = `New document request for notice ${noticeId}`;
      const emailContent = `
Dear Client,

A new document request has been created by ${lawyerName} for your notice ${noticeId}.

Requested document type: ${type}
Request message: ${requestMessage || "Please upload the requested document at the earliest."}

Please log in to your client dashboard and upload the requested document.

Regards,
Legal Notice Platform
      `.trim();

      try {
        await EmailSendHnaldre(String(clientEmail).trim(), emailSubject, emailContent);
      } catch (emailError) {
        console.log("Failed to send lawyer document request email:", emailError.message || emailError);
      }
    }

    return res.status(200).json({ success: true, message: "Document uploaded successfully", data: created });
  } catch (err) {
    return res.status(err.status||400).json({ success: false, message: err.status?err.message:"Unable to save this document." });
  }
};

const getDocuments = async (req, res) => {
  try {
    const { clientId, noticeId, requestedByRole, requestedById } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (noticeId) filter.noticeId = noticeId;
    if (requestedByRole) filter.requestedByRole = requestedByRole;
    if (requestedById) filter.requestedById = requestedById;
    const data = await ClientDocument.find({ $and: [filter, req.scope || {}] }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateDocument = async (req, res) => {
  try {
    const { clientId, noticeId, type, fileName, status, clientEmail, requestMessage, requestedByRole, requestedById, responseFiles } = req.body;
    if (!clientId || !noticeId || !type) {
      return res.status(200).json({
        success: false,
        message: "clientId, noticeId and type are required",
      });
    }

    const existing = await ClientDocument.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Document not found" });
    }

    if (String(existing.clientId) !== String(clientId)) {
      return res.status(200).json({ success: false, message: "You can update only your own documents" });
    }

    const updated = await ClientDocument.findByIdAndUpdate(
      req.params.id,
      {
        noticeId,
        type,
        fileName: typeof fileName === "undefined" ? existing.fileName || "" : fileName,
          clientEmail: typeof clientEmail === "undefined" ? existing.clientEmail || "" : clientEmail,
          requestMessage: typeof requestMessage === "undefined" ? existing.requestMessage || "" : requestMessage,
          requestedByRole: typeof requestedByRole === "undefined" ? existing.requestedByRole || "client" : requestedByRole,
          requestedById: typeof requestedById === "undefined" ? existing.requestedById || "" : requestedById,
          responseFiles: Array.isArray(responseFiles) ? responseFiles : existing.responseFiles || [],
          status: status || existing.status || "Requested",
        },
      { new: true }
    );

    return res.status(200).json({ success: true, message: "Document updated successfully", data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const createPayment = async (req, res) => {
  try {
    const { clientId, noticeId, amount, method, billingEmail } = req.body;

    if (!clientId || !noticeId || !amount || !method) {
      return res.status(200).json({ success: false, message: "clientId, noticeId, amount and method are required" });
    }

    let created;
    await require('mongoose').connection.transaction(async session=>{
      const changed=await ClientNotice.findOneAndUpdate({_id:req.paymentMatter._id,clientId,updatedAt:req.paymentMatter.updatedAt,paymentStatus:{$ne:'Paid'}},{$set:{paymentStatus:'Pending'}},{new:true,session});
      if(!changed)throw Object.assign(new Error('The payment state changed. Refresh before recording another payment.'),{status:409});
      [created]=await ClientPayment.create([{clientId,noticeId,txnId:buildId('TXN'),amount,method,billingEmail:billingEmail||'',status:'Pending'}],{session});
    });

    return res.status(200).json({ success: true, message: "Payment recorded successfully", data: created });
  } catch (err) {
    return res.status(err.status||400).json({ success: false, message: err.status?err.message:"Unable to record payment." });
  }
};

const getPayments = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const data = await ClientPayment.find({ $and: [filter, req.scope || {}] }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getDeliveryTracking = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const notices = await ClientNotice.find({ $and: [filter, req.scope || {}] }).sort({ createdAt: -1 });

    const data = notices.map(n => ({noticeId:n.noticeId,courier:n.courier || '',trackingId:n.trackingId || '',dispatchDate:n.dispatchDate || '',status:n.deliveryStatus || 'Not dispatched',proofOfDelivery:n.proofOfDelivery || ''}));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getDownloads = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const notices = await ClientNotice.find({ $and: [filter, req.scope || {}] }).sort({ createdAt: -1 });
    const payments = await ClientPayment.find({ $and: [filter, req.scope || {}] }).sort({ createdAt: -1 });

    const noticeFiles = notices.filter(n=>n.signedFile).map(n=>({noticeId:n.noticeId,fileType:'Final Signed Notice',fileName:n.signedFile,status:'Ready',availableOn:n.updatedAt}));
    const paymentFiles = notices.filter(n=>n.proofOfDelivery).map(n=>({noticeId:n.noticeId,fileType:'Proof of Delivery',fileName:n.proofOfDelivery,status:'Ready',availableOn:n.updatedAt}));

    return res.status(200).json({ success: true, data: [...noticeFiles, ...paymentFiles] });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const data = await ClientNotification.find({ $and: [filter, req.scope || {}] }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const createNotification = async (req, res) => {
  try {
    const { clientId, channel, noticeId, message, status } = req.body;

    if (!clientId || !channel || !message) {
      return res.status(200).json({ success: false, message: "clientId, channel and message are required" });
    }

    const created = await ClientNotification.create({
      clientId,
      notificationId: buildId("NTF"),
      channel,
      noticeId: noticeId || "",
      message,
      status: status || "Unread",
    });

    return res.status(200).json({ success: true, message: "Notification created", data: created });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const updated = await ClientNotification.findByIdAndUpdate(
      req.params.id,
      { status: "Read" },
      { new: true }
    );

    return res.status(200).json({ success: true, message: "Notification marked as read", data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getClientProfile = async (req, res) => {
  try {
    const data = await Client.findById(req.params.clientId).select("-password");
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateClientProfile = async (req, res) => {
  try {
    const update = {};

    if (typeof req.body.name !== "undefined") update.name = req.body.name;
    if (typeof req.body.email !== "undefined") update.email = req.body.email;
    if (typeof req.body.phone !== "undefined") update.phone = req.body.phone;
    if (typeof req.body.address !== "undefined") update.address = req.body.address;
    if (typeof req.body.city !== "undefined") update.city = req.body.city;
    if (typeof req.body.state !== "undefined") update.state = req.body.state;
    if (typeof req.body.pincode !== "undefined") update.pincode = req.body.pincode;
    if (typeof req.body.authorityLetter !== "undefined") {
      const current=await Client.findById(req.params.clientId);
      if(req.body.authorityLetter!==current.authorityLetter){update.authorityLetter=req.body.authorityLetter;update.authorityStatus=req.body.authorityLetter?'pending':'missing';update.authorityFeedback='';update.authoritySubmittedAt=new Date();update.authorityReviewedAt=null;update.authorityReviewedBy='';}
    }

    if (req.body.password && String(req.body.password).trim()) {
      update.password = bcrypt.hashSync(String(req.body.password).trim(), 10);
    }

    const data = await require("../services/accounts").saveAccount(Client,"client",req.params.clientId,update);
    return res.status(200).json({ success: true, message: "Profile updated successfully", data });
  } catch (err) {
    return res.status(err.status||400).json({ success: false, message: "Error: " + err.message });
  }
};

const createDefaulter = async (req, res) => {
  try {
    const {
      clientId,
      name,
      email,
      phone,
      companyName,
      address,
      totalDueAmount,
      lastInvoiceDate,
    } = req.body;

    if (!clientId || !name || !email || !phone || !companyName || !address || !lastInvoiceDate) {
      return res.status(200).json({
        success: false,
        message: "clientId, name, email, phone, companyName, address and lastInvoiceDate are required",
      });
    }

    const created = await ClientDefaulter.create({
      clientId,
      defaulterId: await generateDefaulterId(),
      name: String(name || "").trim(),
      email: String(email || "").trim(),
      phone: String(phone || "").trim(),
      companyName: String(companyName || "").trim(),
      address: String(address || "").trim(),
      totalDueAmount: Number(totalDueAmount || 0),
      lastInvoiceDate: String(lastInvoiceDate || "").trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Defaulter created successfully",
      data: created,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getDefaulters = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const data = await ClientDefaulter.find({ $and: [filter, req.scope || {}] }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const getDefaulterById = async (req, res) => {
  try {
    const data = await ClientDefaulter.findById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

const updateDefaulter = async (req, res) => {
  try {
    const {
      clientId,
      name,
      email,
      phone,
      companyName,
      address,
      totalDueAmount,
      lastInvoiceDate,
    } = req.body;

    if (!clientId || !name || !email || !phone || !companyName || !address || !lastInvoiceDate) {
      return res.status(200).json({
        success: false,
        message: "clientId, name, email, phone, companyName, address and lastInvoiceDate are required",
      });
    }

    const existing = await ClientDefaulter.findById(req.params.id);
    if (!existing) {
      return res.status(200).json({ success: false, message: "Defaulter not found" });
    }

    if (String(existing.clientId) !== String(clientId)) {
      return res.status(200).json({ success: false, message: "You can update only your own defaulter" });
    }

    const updated = await ClientDefaulter.findByIdAndUpdate(
      req.params.id,
      {
        name: String(name || "").trim(),
        email: String(email || "").trim(),
        phone: String(phone || "").trim(),
        companyName: String(companyName || "").trim(),
        address: String(address || "").trim(),
        totalDueAmount: Number(totalDueAmount || 0),
        lastInvoiceDate: String(lastInvoiceDate || "").trim(),
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Defaulter updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Error: " + err.message });
  }
};

module.exports = {
  submitNotice,
  previewNotice,
  updateNotice,
  updateNoticeStatus,
  assignNoticeToLawyer,
  updateGeneratedNotice,
  sendNoticeEmailToDefaulter,
  getNotices,
  uploadDocument,
  getDocuments,
  updateDocument,
  createPayment,
  getPayments,
  getDeliveryTracking,
  getDownloads,
  getNotifications,
  createNotification,
  markNotificationRead,
  getClientProfile,
  updateClientProfile,
  createDefaulter,
  getDefaulters,
  getDefaulterById,
  updateDefaulter,
};
