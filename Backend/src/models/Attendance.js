const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    position: { type: String, default: "", trim: true },
    institution: { type: String, default: "", trim: true },
    contactType: { type: String, enum: ["phone", "passport"], required: true },
    phonePassport: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
