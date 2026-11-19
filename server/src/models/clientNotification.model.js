const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientNotificationSchema = new Schema(
  {
    clientId: { type: String, required: true },
    notificationId: { type: String, required: true, unique: true },
    channel: { type: String, required: true },
    noticeId: { type: String },
    matterId: String,
    section: String,
    message: { type: String, required: true },
    status: { type: String, default: "Unread" },
  },
  { timestamps: true }
);

const ClientNotification = mongoose.model("client_notifications", clientNotificationSchema);
module.exports = { ClientNotification };
