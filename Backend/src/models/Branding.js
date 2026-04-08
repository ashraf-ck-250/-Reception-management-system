const mongoose = require("mongoose");

const brandingSchema = new mongoose.Schema(
  {
    // Data URL (PNG/JPEG). Used for PDF exports (logo/stamp).
    brandMarkDataUrl: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branding", brandingSchema);

