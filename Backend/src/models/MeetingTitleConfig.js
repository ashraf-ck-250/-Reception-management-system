const mongoose = require("mongoose");

const meetingTitleConfigSchema = new mongoose.Schema(
  {
    eventDate: { type: String, required: true, trim: true }, // YYYY-MM-DD
    meetingTitle: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: false }
  },
  { timestamps: true }
);

meetingTitleConfigSchema.index({ eventDate: 1, meetingTitle: 1 }, { unique: true });
meetingTitleConfigSchema.index({ eventDate: 1, isActive: 1 });

module.exports = mongoose.model("MeetingTitleConfig", meetingTitleConfigSchema);

