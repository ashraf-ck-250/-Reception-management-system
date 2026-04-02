const mongoose = require("mongoose");

const meetingAttendanceSchema = new mongoose.Schema(
  {
    eventDate: { type: String, required: true }, // YYYY-MM-DD
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    institution: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

meetingAttendanceSchema.index({ eventDate: 1, phoneNumber: 1 });

module.exports = mongoose.model("MeetingAttendance", meetingAttendanceSchema);

