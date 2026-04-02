const mongoose = require("mongoose");

const visitorRequestSchema = new mongoose.Schema(
  {
    nationality: { type: String, enum: ["rwandan", "foreign"], required: true },

    // Rwandan flow
    phoneNumber: { type: String, default: "", trim: true },
    fetchedProfile: { type: Object, default: null },

    // Foreign flow
    passportNumber: { type: String, default: "", trim: true },
    fullName: { type: String, default: "", trim: true },
    contactNumber: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },

    service: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },

    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    decidedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("VisitorRequest", visitorRequestSchema);

