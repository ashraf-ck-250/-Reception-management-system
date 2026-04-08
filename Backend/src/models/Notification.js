const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "visitor_check_in",
        "visitor_request_submitted",
        "visitor_request_status",
        "user_pending_approval",
        "meeting_attendance_submitted",
        "meeting_title_updated",
        "meeting_title_activated",
        "meeting_title_deactivated"
      ],
      required: true
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    metadata: { type: Object, default: {} },
    // No need to add extra field, use createdAt for TTL
  },
  { timestamps: true }
);

// Automatically delete notifications 7 days (604800 seconds) after creation
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model("Notification", notificationSchema);
