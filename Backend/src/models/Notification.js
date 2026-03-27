const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["service_request_status"], required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
