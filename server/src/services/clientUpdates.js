const { ClientNotification } = require("../models/clientNotification.model");
async function notifyClient(notice, message, session, section = "timeline") {
  await ClientNotification.create(
    [
      {
        clientId: notice.clientId,
        noticeId: notice.noticeId,
        matterId: String(notice._id),
        section,
        notificationId: "NTF-" + require("crypto").randomUUID(),
        channel: "Portal",
        message,
        status: "Unread",
      },
    ],
    session ? { session } : {},
  );
}
module.exports = { notifyClient };
