const path = require("path");
const fs = require("fs");

/** Same asset as public navbar (Frontend src/assets/gov.png), copied for CID embedding */
const EMAIL_LOGO_CID = "rms-logo@reception";
const emailLogoPath = path.join(__dirname, "assets", "gov.png");

function getLogoAttachment() {
  if (!fs.existsSync(emailLogoPath)) return null;
  return { filename: "gov.png", path: emailLogoPath, cid: EMAIL_LOGO_CID };
}

module.exports = { EMAIL_LOGO_CID, getLogoAttachment };
