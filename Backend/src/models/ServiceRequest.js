const mongoose = require("mongoose");

const serviceRequestSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, default: "", trim: true },
    passportNumber: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    service: { type: String, required: true, trim: true },
    eventDate: { type: String, default: "" },
    message: { type: String, default: "", trim: true },
    status: { type: String, enum: ["Pending", "Completed", "Rejected"], default: "Pending" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
