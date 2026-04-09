const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Attendance = require("./models/Attendance");
const VisitorRequest = require("./models/VisitorRequest");
const MeetingAttendance = require("./models/MeetingAttendance");
const Branding = require("./models/Branding");
const MeetingTitleConfig = require("./models/MeetingTitleConfig");
const User = require("./models/User");
const Notification = require("./models/Notification");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");
const {
  authenticate,
  requireAdmin,
  requireReceptionist,
  requireAdminOrMeetingLeader,
  requireMeetingLeader,
  requireStaff
} = require("./middleware/auth");

const router = express.Router();

const EXPORT_BRAND_MARK_SIZE = 110;

function normalizedIsoDate(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return raw;
}

function dayRangeFromIso(isoDate) {
  if (!isoDate) return null;
  const start = new Date(`${isoDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function drawPdfTable(doc, columns, rows, opts) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  const rowHeight = 22;
  const headerHeight = 24;

  const totalWeight = columns.reduce((sum, c) => sum + c.width, 0);
  const colWidths = columns.map((c) => (c.width / totalWeight) * pageWidth);

  const ensureSpace = (requiredHeight) => {
    if (doc.y + requiredHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      if (opts && typeof opts.onNewPage === "function") opts.onNewPage();
      renderHeader();
    }
  };

  const renderHeader = () => {
    const y = doc.y;
    let x = startX;
    doc.save();
    doc.font("Helvetica-Bold").fontSize(9);
    columns.forEach((col, i) => {
      const w = colWidths[i];
      doc.rect(x, y, w, headerHeight).fillAndStroke("#F3F4F6", "#D1D5DB");
      doc.fillColor("#111827").text(col.header, x + 5, y + 7, {
        width: w - 10,
        height: headerHeight - 10,
        ellipsis: true
      });
      x += w;
    });
    doc.restore();
    doc.y = y + headerHeight;
  };

  renderHeader();
  if (opts && typeof opts.onFirstPage === "function") opts.onFirstPage();

  rows.forEach((row) => {
    ensureSpace(rowHeight);
    const y = doc.y;
    let x = startX;
    doc.save();
    doc.font("Helvetica").fontSize(8.5).fillColor("#111827");
    columns.forEach((col, i) => {
      const w = colWidths[i];
      doc.rect(x, y, w, rowHeight).stroke("#E5E7EB");
      const value = row[col.key] == null ? "" : String(row[col.key]);
      doc.text(value, x + 5, y + 6, {
        width: w - 10,
        height: rowHeight - 8,
        ellipsis: true
      });
      x += w;
    });
    doc.restore();
    doc.y = y + rowHeight;
  });
}

function parseImageDataUrl(dataUrl) {
  const raw = String(dataUrl || "").trim();
  const match = raw.match(/^data:(image\/(?:png|jpeg|jpg));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  return { mime, buffer };
}

async function getBrandMarkDataUrl() {
  const doc = await Branding.findOne().sort({ updatedAt: -1 });
  return (doc && doc.brandMarkDataUrl) || "";
}

async function getMeetingTitlesForDate(eventDate) {
  if (!eventDate) return [];
  const rows = await MeetingTitleConfig.find({ eventDate }).sort({ meetingTitle: 1 }).select("meetingTitle");
  return rows.map((r) => String(r.meetingTitle || "").trim()).filter(Boolean);
}

async function getActiveMeetingTitleForDate(eventDate) {
  if (!eventDate) return "";
  const row = await MeetingTitleConfig.findOne({ eventDate, isActive: true }).select("meetingTitle updatedAt");
  if (row?.meetingTitle) return String(row.meetingTitle).trim();
  return "";
}

/** Display name for dashboard / lists (matches GET /visitor-requests fullName logic). */
function visitorRequestDashboardName(doc) {
  if (doc.nationality === "foreign") return (doc.fullName && String(doc.fullName).trim()) || "Visitor";
  const fp = doc.fetchedProfile;
  const n = fp && (fp.fullName || fp.name);
  return (
    (doc.fullName && String(doc.fullName).trim()) ||
    (n && String(n).trim()) ||
    (doc.contactNumber && String(doc.contactNumber).trim()) ||
    (doc.phoneNumber && String(doc.phoneNumber).trim()) ||
    "Visitor"
  );
}
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  }
});

async function createVisitorCheckInNotifications(attendanceDoc) {
  await createRoleNotificationsDeduped({
    roles: ["admin", "receptionist"],
    type: "visitor_check_in",
    title: "New visitor check-in",
    message: `${attendanceDoc.fullName} from ${attendanceDoc.institution || "—"} completed visitor attendance.`,
    metadata: { attendanceId: String(attendanceDoc._id) },
    dedupeKey: `attendance:${String(attendanceDoc._id)}`
  });
}

async function createRoleNotificationsDeduped({ roles, type, title, message, metadata, dedupeKey }) {
  const recipients = await User.find({
    status: "active",
    role: { $in: roles }
  }).select("_id");
  if (!recipients.length) return;

  const safeKey = String(dedupeKey || "").trim();
  const nextMetadata = {
    ...(metadata && typeof metadata === "object" ? metadata : {}),
    dedupeKey: safeKey
  };

  // Remove similar notifications for each recipient to avoid duplicates.
  if (safeKey) {
    await Notification.deleteMany({
      recipientUserId: { $in: recipients.map((r) => r._id) },
      type,
      "metadata.dedupeKey": safeKey
    });
  }

  await Notification.insertMany(
    recipients.map((u) => ({
      recipientUserId: u._id,
      type,
      title,
      message,
      metadata: nextMetadata
    }))
  );
}

async function createNewVisitorRequestNotifications(requestDoc) {
  const displayName = visitorRequestDashboardName(requestDoc);
  await createRoleNotificationsDeduped({
    roles: ["admin", "receptionist"],
    type: "visitor_request_submitted",
    title: "New visitor request",
    message: `${displayName} submitted a new request for ${requestDoc.service}.`,
    metadata: { requestId: String(requestDoc._id), status: requestDoc.status },
    dedupeKey: `visitor_request_submitted:${String(requestDoc._id)}`
  });
}

async function createVisitorRequestStatusNotifications({ requestDoc, actorUserId }) {
  const recipients = await User.find({
    status: "active",
    role: { $in: ["admin", "receptionist"] },
    _id: { $ne: actorUserId }
  }).select("_id");
  if (!recipients.length) return;

  const displayName = visitorRequestDashboardName(requestDoc);
  const safeKey = `visitor_request_status:${String(requestDoc._id)}:${String(requestDoc.status)}`;
  await Notification.deleteMany({
    recipientUserId: { $in: recipients.map((r) => r._id) },
    type: "visitor_request_status",
    "metadata.dedupeKey": safeKey
  });
  await Notification.insertMany(
    recipients.map((u) => ({
      recipientUserId: u._id,
      type: "visitor_request_status",
      title: `Visitor request ${requestDoc.status}`,
      message: `${displayName}'s request for ${requestDoc.service} was ${String(requestDoc.status).toLowerCase()}.`,
      metadata: { requestId: String(requestDoc._id), status: requestDoc.status, dedupeKey: safeKey }
    }))
  );
}

async function createPendingUserApprovalNotifications({ userDoc, actorUserId }) {
  const admins = await User.find({
    status: "active",
    role: "admin",
    _id: { $ne: actorUserId }
  }).select("_id");
  if (!admins.length) return;

  const roleLabel = userDoc.role === "admin" ? "Admin" : "Receptionist";
  const safeKey = `user_pending_approval:${String(userDoc._id)}`;
  await Notification.deleteMany({
    recipientUserId: { $in: admins.map((a) => a._id) },
    type: "user_pending_approval",
    "metadata.dedupeKey": safeKey
  });
  await Notification.insertMany(
    admins.map((u) => ({
      recipientUserId: u._id,
      type: "user_pending_approval",
      title: "User pending approval",
      message: `${userDoc.name} (${userDoc.email}) is awaiting approval as ${roleLabel}.`,
      metadata: { userId: String(userDoc._id), dedupeKey: safeKey }
    }))
  );
}

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/public/rwanda/lookup", async (req, res) => {
  const phone = String(req.query.phone || "").trim();
  if (!phone) return res.status(400).json({ message: "phone is required" });

  const url = process.env.RWANDA_LOOKUP_URL;
  if (!url) {
    return res.status(501).json({
      message: "RWANDA_LOOKUP_URL is not configured on the server",
      phone
    });
  }

  try {
    const target = new URL(url);
    target.searchParams.set("phone", phone);
    const response = await fetch(target.toString(), {
      headers: {
        Accept: "application/json",
        ...(process.env.RWANDA_LOOKUP_API_KEY ? { Authorization: `Bearer ${process.env.RWANDA_LOOKUP_API_KEY}` } : {})
      }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(502).json({ message: "Lookup API failed", status: response.status, data });
    }
    return res.json({ phone, data });
  } catch (err) {
    return res.status(500).json({ message: "Lookup error", error: err?.message || String(err) });
  }
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const passwordValue = String(password).trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    console.warn(`[auth] failed login for ${normalizedEmail}: user not found`);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (!user.passwordHash) {
    console.warn(`[auth] failed login for ${normalizedEmail}: missing password hash`);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(passwordValue, user.passwordHash);
  if (!valid) {
    console.warn(`[auth] failed login for ${normalizedEmail}: invalid password`);
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (user.status !== "active") {
    console.warn(`[auth] failed login for ${normalizedEmail}: status=${user.status}`);
    return res.status(403).json({ message: "User is not active yet" });
  }
  const token = jwt.sign(
    { userId: String(user._id), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
  return res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl || "",
      joinedDate: user.createdAt ? new Date(user.createdAt).toISOString().split("T")[0] : ""
    }
  });
});

router.get("/attendance", authenticate, async (_req, res) => {
  const records = await Attendance.find().sort({ createdAt: -1 });
  res.json(
    records.map((r) => ({
      id: r._id,
      date: r.date,
      name: r.fullName,
      position: r.position,
      institution: r.institution,
      contactType: r.contactType === "phone" ? "Phone" : "Passport",
      contact: r.phonePassport,
      email: r.email,
      time: new Date(r.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    }))
  );
});

router.post("/attendance", async (req, res) => {
  const { date, fullName, position, institution, contactType, phonePassport, email } = req.body;
  if (!fullName || !contactType || !phonePassport) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  const created = await Attendance.create({ date, fullName, position, institution, contactType, phonePassport, email });
  await createVisitorCheckInNotifications(created);
  res.status(201).json({ id: created._id });
});

// Visitor form (new)
router.post("/visitor-requests", async (req, res) => {
  const { nationality, phoneNumber, passportNumber, fullName, contactNumber, email, service, message } = req.body;

  const nat = nationality === "rwandan" ? "rwandan" : nationality === "foreign" ? "foreign" : "";
  if (!nat) return res.status(400).json({ message: "nationality must be rwandan or foreign" });
  if (!service) return res.status(400).json({ message: "service is required" });

  if (nat === "rwandan") {
    if (!fullName || !contactNumber || !email) {
      return res.status(400).json({ message: "fullName, contactNumber, email are required for rwandan visitors" });
    }
    const created = await VisitorRequest.create({
      nationality: nat,
      phoneNumber: String(phoneNumber || contactNumber).trim(),
      fullName: String(fullName).trim(),
      contactNumber: String(contactNumber).trim(),
      email: String(email).trim().toLowerCase(),
      service,
      message: message || ""
    });
    return res.status(201).json({ id: created._id });
  }

  // foreign
  if (!passportNumber || !fullName || !contactNumber || !email) {
    return res.status(400).json({ message: "passportNumber, fullName, contactNumber, email are required for foreign visitors" });
  }

  const created = await VisitorRequest.create({
    nationality: nat,
    passportNumber,
    fullName,
    contactNumber,
    email,
    service,
    message: message || ""
  });
  await createNewVisitorRequestNotifications(created);
  return res.status(201).json({ id: created._id });
});

// Public: check a visitor request status by id
router.get("/visitor-requests/:id/status", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "Missing request id" });

  const doc = await VisitorRequest.findById(id);
  if (!doc) return res.status(404).json({ message: "Visitor request not found" });

  return res.json({
    id: String(doc._id),
    status: doc.status,
    createdAt: doc.createdAt,
    decidedAt: doc.decidedAt || null
  });
});

router.get("/visitor-requests", authenticate, requireStaff, async (_req, res) => {
  const records = await VisitorRequest.find().sort({ createdAt: -1 });
  res.json(
    records.map((r) => ({
      id: String(r._id),
      createdAt: r.createdAt,
      nationality: r.nationality,
      fullName:
        r.nationality === "foreign"
          ? r.fullName
          : r.fullName || (r.fetchedProfile && (r.fetchedProfile.fullName || r.fetchedProfile.name)) || "",
      phoneNumber: r.phoneNumber,
      passportNumber: r.passportNumber,
      contactNumber: r.contactNumber,
      email: r.email,
      service: r.service,
      message: r.message,
      status: r.status,
      decidedAt: r.decidedAt
    }))
  );
});

router.patch("/visitor-requests/:id/status", authenticate, requireReceptionist, async (req, res) => {
  const { status } = req.body;
  if (!["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const updated = await VisitorRequest.findByIdAndUpdate(
    req.params.id,
    { status, decidedByUserId: req.auth.userId, decidedAt: new Date() },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "Visitor request not found" });
  await createVisitorRequestStatusNotifications({ requestDoc: updated, actorUserId: req.auth.userId });
  return res.json({ ok: true });
});

// Meeting attendance (new)
router.post("/meeting-attendance", async (req, res) => {
  const { eventDate, meetingTitle, fullName, phoneNumber, email, institution, position, signatureDataUrl } = req.body;
  if (!eventDate || !fullName || !phoneNumber || !institution || !position) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const dateKey = String(eventDate).trim();
  const titleFromBody = String(meetingTitle || "").trim();
  let titleKey = titleFromBody;
  if (!titleKey) {
    titleKey = await getActiveMeetingTitleForDate(dateKey);
  }
  if (!titleKey) return res.status(400).json({ message: "Meeting title is not set. Please contact the meeting leader." });
  // Guard against arbitrary titles being submitted (must exist for that date).
  const allowedTitles = await getMeetingTitlesForDate(dateKey);
  if (allowedTitles.length && !allowedTitles.includes(titleKey)) {
    return res.status(400).json({ message: "Invalid meeting title for the selected date" });
  }
  const phoneKey = String(phoneNumber).trim();
  const emailKey = String(email || "").trim().toLowerCase();

  const signatureValue = String(signatureDataUrl || "").trim();
  if (signatureValue) {
    const parsed = parseImageDataUrl(signatureValue);
    if (!parsed) return res.status(400).json({ message: "Invalid signature image" });
    // Keep payload small for DB and serverless limits
    if (signatureValue.length > 300_000) return res.status(413).json({ message: "Signature is too large" });
  }

  // Submit once only per meeting/date/phoneNumber.
  const existing = await MeetingAttendance.findOne({ eventDate: dateKey, meetingTitle: titleKey, phoneNumber: phoneKey }).select("_id");
  if (existing) {
    return res.status(409).json({ message: "Attendance already submitted for this meeting" });
  }

  const created = await MeetingAttendance.create({
    eventDate: dateKey,
    meetingTitle: titleKey,
    fullName,
    phoneNumber: phoneKey,
    email: emailKey,
    institution,
    position,
    signatureDataUrl: signatureValue
  });
  await createRoleNotificationsDeduped({
    roles: ["admin", "meeting_leader"],
    type: "meeting_attendance_submitted",
    title: "New meeting attendance",
    message: `${fullName} submitted attendance for "${titleKey}" (${dateKey}).`,
    metadata: { attendanceId: String(created._id), eventDate: dateKey, meetingTitle: titleKey },
    dedupeKey: `meeting_attendance:${String(created._id)}`
  });
  return res.status(201).json({ id: created._id });
});

// Public: fetch meeting titles for a date (used by attendance form)
router.get("/public/meeting-titles", async (req, res) => {
  const eventDate = normalizedIsoDate(req.query.eventDate);
  if (!eventDate) return res.status(400).json({ message: "eventDate is required (YYYY-MM-DD)" });
  const meetingTitles = await getMeetingTitlesForDate(eventDate);
  return res.json({ eventDate, meetingTitles });
});

// Public: active meeting title (autofill for attendance form)
router.get("/public/active-meeting-title", async (req, res) => {
  const eventDate = normalizedIsoDate(req.query.eventDate);
  if (!eventDate) return res.status(400).json({ message: "eventDate is required (YYYY-MM-DD)" });
  const meetingTitle = await getActiveMeetingTitleForDate(eventDate);
  return res.json({ eventDate, meetingTitle });
});

router.get("/meeting-attendance", authenticate, requireAdmin, async (req, res) => {
  const eventDate = normalizedIsoDate(req.query.eventDate);
  const query = eventDate ? { eventDate } : {};
  const records = await MeetingAttendance.find(query).sort({ createdAt: -1 });
  res.json(
    records.map((r) => ({
      id: String(r._id),
      eventDate: r.eventDate,
      meetingTitle: r.meetingTitle || "",
      fullName: r.fullName,
      phoneNumber: r.phoneNumber,
      email: r.email,
      institution: r.institution,
      position: r.position,
      createdAt: r.createdAt,
      signatureDataUrl: r.signatureDataUrl || ""
    }))
  );
});

// Admin: list meeting titles for a date
router.get("/admin/meeting-titles", authenticate, requireAdminOrMeetingLeader, async (req, res) => {
  const eventDate = normalizedIsoDate(req.query.eventDate);
  if (!eventDate) return res.status(400).json({ message: "eventDate is required (YYYY-MM-DD)" });
  const rows = await MeetingTitleConfig.find({ eventDate }).sort({ meetingTitle: 1 }).select("meetingTitle isActive updatedAt");
  return res.json({
    eventDate,
    meetingTitles: rows.map((r) => ({
      meetingTitle: String(r.meetingTitle || "").trim(),
      isActive: Boolean(r.isActive),
      updatedAt: r.updatedAt
    }))
  });
});

// Admin: add meeting title for a date (supports multiple per day)
router.put("/admin/meeting-titles", authenticate, requireMeetingLeader, async (req, res) => {
  const eventDate = normalizedIsoDate(req.body?.eventDate);
  const meetingTitle = String(req.body?.meetingTitle || "").trim();
  if (!eventDate || !meetingTitle) return res.status(400).json({ message: "eventDate and meetingTitle are required" });
  // Make this new/updated title the active one for the day
  await MeetingTitleConfig.updateMany({ eventDate }, { $set: { isActive: false } });
  await MeetingTitleConfig.updateOne(
    { eventDate, meetingTitle },
    { $set: { eventDate, meetingTitle, isActive: true } },
    { upsert: true }
  );
  await createRoleNotificationsDeduped({
    roles: ["admin"],
    type: "meeting_title_updated",
    title: "Meeting title updated",
    message: `Active meeting title for ${eventDate} was set to "${meetingTitle}".`,
    metadata: { eventDate, meetingTitle },
    dedupeKey: `meeting_title_updated:${eventDate}:${meetingTitle}`
  });
  const rows = await MeetingTitleConfig.find({ eventDate }).sort({ meetingTitle: 1 }).select("meetingTitle isActive updatedAt");
  return res.json({
    ok: true,
    meetingTitles: rows.map((r) => ({
      meetingTitle: String(r.meetingTitle || "").trim(),
      isActive: Boolean(r.isActive),
      updatedAt: r.updatedAt
    }))
  });
});

// Meeting leader: set active title
router.post("/admin/meeting-titles/activate", authenticate, requireMeetingLeader, async (req, res) => {
  const eventDate = normalizedIsoDate(req.body?.eventDate);
  const meetingTitle = String(req.body?.meetingTitle || "").trim();
  if (!eventDate || !meetingTitle) return res.status(400).json({ message: "eventDate and meetingTitle are required" });
  await MeetingTitleConfig.updateMany({ eventDate }, { $set: { isActive: false } });
  const updated = await MeetingTitleConfig.findOneAndUpdate(
    { eventDate, meetingTitle },
    { $set: { isActive: true } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "Meeting title not found" });
  await createRoleNotificationsDeduped({
    roles: ["admin"],
    type: "meeting_title_activated",
    title: "Meeting title activated",
    message: `Active meeting title for ${eventDate} is now "${meetingTitle}".`,
    metadata: { eventDate, meetingTitle },
    dedupeKey: `meeting_title_activated:${eventDate}:${meetingTitle}`
  });
  return res.json({ ok: true });
});

// Meeting leader: deactivate (clear active title for a date)
router.post("/admin/meeting-titles/deactivate", authenticate, requireMeetingLeader, async (req, res) => {
  const eventDate = normalizedIsoDate(req.body?.eventDate);
  if (!eventDate) return res.status(400).json({ message: "eventDate is required (YYYY-MM-DD)" });
  await MeetingTitleConfig.updateMany({ eventDate }, { $set: { isActive: false } });
  await createRoleNotificationsDeduped({
    roles: ["admin"],
    type: "meeting_title_deactivated",
    title: "Active meeting stopped",
    message: `Active meeting for ${eventDate} was deactivated.`,
    metadata: { eventDate },
    dedupeKey: `meeting_title_deactivated:${eventDate}`
  });
  return res.json({ ok: true });
});

router.get("/admin/branding", authenticate, requireAdmin, async (_req, res) => {
  const brandMarkDataUrl = await getBrandMarkDataUrl();
  return res.json({ brandMarkDataUrl });
});

router.put("/admin/branding", authenticate, requireAdmin, async (req, res) => {
  const brandMarkDataUrl = String(req.body?.brandMarkDataUrl || "").trim();
  if (brandMarkDataUrl) {
    const parsed = parseImageDataUrl(brandMarkDataUrl);
    if (!parsed) return res.status(400).json({ message: "Invalid brand mark image" });
    if (brandMarkDataUrl.length > 1_500_000) return res.status(413).json({ message: "Brand mark is too large" });
  }
  const existing = await Branding.findOne().sort({ updatedAt: -1 });
  if (existing) {
    existing.brandMarkDataUrl = brandMarkDataUrl;
    await existing.save();
  } else {
    await Branding.create({ brandMarkDataUrl });
  }
  return res.json({ ok: true });
});

// Admin exports (CSV/PDF)
router.get("/admin/exports/visitor-requests.csv", authenticate, requireAdmin, async (req, res) => {
  const reportDate = normalizedIsoDate(req.query.reportDate);
  const range = dayRangeFromIso(reportDate);
  const query = range ? { createdAt: { $gte: range.start, $lt: range.end } } : {};
  const records = await VisitorRequest.find(query).sort({ createdAt: -1 });
  const parser = new Parser({
    fields: ["createdAt", "nationality", "fullName", "phoneNumber", "passportNumber", "contactNumber", "email", "service", "message", "status", "decidedAt"]
  });
  const rows = records.map((r) => ({
    createdAt: r.createdAt?.toISOString?.() || "",
    nationality: r.nationality,
    fullName:
      r.nationality === "foreign"
        ? r.fullName
        : r.fullName || (r.fetchedProfile && (r.fetchedProfile.fullName || r.fetchedProfile.name)) || "",
    phoneNumber: r.phoneNumber,
    passportNumber: r.passportNumber,
    contactNumber: r.contactNumber,
    email: r.email,
    service: r.service,
    message: r.message,
    status: r.status,
    decidedAt: r.decidedAt ? new Date(r.decidedAt).toISOString() : ""
  }));
  const csv = parser.parse(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  const fileDate = reportDate || new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Disposition", `attachment; filename="visitor-requests-${fileDate}.csv"`);
  return res.send(csv);
});

router.get("/admin/exports/visitor-requests.pdf", authenticate, requireAdmin, async (req, res) => {
  const reportDate = normalizedIsoDate(req.query.reportDate);
  const includeBrand = !["0", "false", "no"].includes(String(req.query.includeBrand || "1").toLowerCase());
  const range = dayRangeFromIso(reportDate);
  const query = range ? { createdAt: { $gte: range.start, $lt: range.end } } : {};
  const records = await VisitorRequest.find(query).sort({ createdAt: -1 }).limit(5000);
  res.setHeader("Content-Type", "application/pdf");
  const fileDate = reportDate || new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Disposition", `attachment; filename="visitor-requests-${fileDate}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 36 });
  doc.pipe(res);

  const brandMarkDataUrl = await getBrandMarkDataUrl();
  const brand = parseImageDataUrl(brandMarkDataUrl);
  const drawBrandBottomRight = () => {
    if (!includeBrand) return;
    if (!brand) return;
    try {
      const size = EXPORT_BRAND_MARK_SIZE;
      const x = doc.page.width - doc.page.margins.right - size;
      const y = doc.page.height - doc.page.margins.bottom - size;
      doc.save();
      doc.opacity(0.95);
      doc.image(brand.buffer, x, y, { fit: [size, size], align: "right", valign: "bottom" });
      doc.restore();
    } catch {
      // ignore image render errors
    }
  };
  doc.font("Helvetica-Bold").fontSize(16).text("Visitor Requests Report", { align: "center" });
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(9).fillColor("#4B5563").text(
    `Generated: ${new Date().toLocaleString()}${reportDate ? `  |  Date filter: ${reportDate}` : ""}`,
    { align: "left" }
  );
  doc.moveDown(0.8);

  const rows = records.map((r) => ({
    date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
    name:
      r.nationality === "foreign"
        ? r.fullName
        : r.fullName || (r.fetchedProfile && (r.fetchedProfile.fullName || r.fetchedProfile.name)) || "",
    nationality: r.nationality,
    contact: r.contactNumber || r.phoneNumber || "-",
    service: r.service || "-",
    status: r.status || "-"
  }));

  drawPdfTable(
    doc,
    [
      { key: "date", header: "Date", width: 1.1 },
      { key: "name", header: "Name", width: 1.8 },
      { key: "nationality", header: "Nationality", width: 1.1 },
      { key: "contact", header: "Contact", width: 1.5 },
      { key: "service", header: "Service", width: 1.8 },
      { key: "status", header: "Status", width: 1.0 }
    ],
    rows,
    { onFirstPage: drawBrandBottomRight, onNewPage: drawBrandBottomRight }
  );
  doc.end();
});

router.get("/admin/exports/meeting-attendance.csv", authenticate, requireAdmin, async (req, res) => {
  const eventDate = normalizedIsoDate(req.query.eventDate);
  const meetingTitle = String(req.query.meetingTitle || "").trim();
  const query = eventDate ? { eventDate, ...(meetingTitle ? { meetingTitle } : {}) } : {};
  const records = await MeetingAttendance.find(query).sort({ createdAt: -1 });
  const parser = new Parser({
    fields: ["eventDate", "meetingTitle", "fullName", "phoneNumber", "email", "institution", "position", "createdAt"]
  });
  const csv = parser.parse(
    records.map((r) => ({
      eventDate: r.eventDate,
      meetingTitle: r.meetingTitle || "",
      fullName: r.fullName,
      phoneNumber: r.phoneNumber,
      email: r.email,
      institution: r.institution,
      position: r.position,
      createdAt: r.createdAt?.toISOString?.() || ""
    }))
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  const fileDate = eventDate || new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Disposition", `attachment; filename="meeting-attendance-${fileDate}.csv"`);
  return res.send(csv);
});

router.get("/admin/exports/meeting-attendance.pdf", authenticate, requireAdmin, async (req, res) => {
  const eventDate = normalizedIsoDate(req.query.eventDate);
  const meetingTitle = String(req.query.meetingTitle || "").trim();
  const includeBrand = !["0", "false", "no"].includes(String(req.query.includeBrand || "1").toLowerCase());
  const query = eventDate ? { eventDate, ...(meetingTitle ? { meetingTitle } : {}) } : {};
  const records = await MeetingAttendance.find(query).sort({ createdAt: -1 }).limit(5000);
  res.setHeader("Content-Type", "application/pdf");
  const fileDate = eventDate || new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Disposition", `attachment; filename="meeting-attendance-${fileDate}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 36 });
  doc.pipe(res);

  const brandMarkDataUrl = await getBrandMarkDataUrl();
  const brand = parseImageDataUrl(brandMarkDataUrl);
  const drawBrandBottomRight = () => {
    if (!includeBrand) return;
    if (!brand) return;
    try {
      const size = EXPORT_BRAND_MARK_SIZE;
      const x = doc.page.width - doc.page.margins.right - size;
      const y = doc.page.height - doc.page.margins.bottom - size;
      doc.save();
      doc.opacity(0.95);
      doc.image(brand.buffer, x, y, { fit: [size, size], align: "right", valign: "bottom" });
      doc.restore();
    } catch {
      // ignore image render errors
    }
  };
  // Draw on the first page.
  drawBrandBottomRight();

  const titleSet = Array.from(new Set(records.map((r) => String(r.meetingTitle || "").trim()).filter(Boolean)));
  const headerTitle = titleSet.length === 1 ? `${titleSet[0]} Attendance report` : "Meeting Attendance Report";
  doc.font("Helvetica-Bold").fontSize(16).text(headerTitle, { align: "center" });
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(9).fillColor("#4B5563").text(
    `Generated: ${new Date().toLocaleString()}${eventDate ? `  |  Date filter: ${eventDate}` : ""}`,
    { align: "left" }
  );
  if (titleSet.length === 1) {
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).fillColor("#111827").text(`Meeting Title: ${titleSet[0]}`, { align: "left" });
  }
  doc.moveDown(0.8);

  // Custom table renderer to support signature images in cells.
  const columns = [
    { key: "no", header: "NO", width: 0.6 },
    { key: "name", header: "Full Name", width: 1.6 },
    { key: "phone", header: "Phone", width: 1.2 },
    { key: "meetingTitle", header: "Meeting Title", width: 1.5 },
    { key: "institution", header: "Institution", width: 1.3 },
    { key: "position", header: "Position", width: 1.2 },
    { key: "signature", header: "Signature", width: 1.3 }
  ];

  const rows = records.map((r, idx) => ({
    no: idx + 1,
    name: r.fullName || "",
    phone: r.phoneNumber || "",
    meetingTitle: r.meetingTitle || "",
    institution: r.institution || "",
    position: r.position || "",
    signatureDataUrl: r.signatureDataUrl || ""
  }));

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  const rowHeight = 28;
  const headerHeight = 24;

  const totalWeight = columns.reduce((sum, c) => sum + c.width, 0);
  const colWidths = columns.map((c) => (c.width / totalWeight) * pageWidth);

  const renderHeader = () => {
    const y = doc.y;
    let x = startX;
    doc.save();
    doc.font("Helvetica-Bold").fontSize(9);
    columns.forEach((col, i) => {
      const w = colWidths[i];
      doc.rect(x, y, w, headerHeight).fillAndStroke("#F3F4F6", "#D1D5DB");
      doc.fillColor("#111827").text(col.header, x + 5, y + 7, { width: w - 10, height: headerHeight - 10, ellipsis: true });
      x += w;
    });
    doc.restore();
    doc.y = y + headerHeight;
  };

  const ensureSpace = (requiredHeight) => {
    if (doc.y + requiredHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawBrandBottomRight();
      renderHeader();
    }
  };

  renderHeader();

  rows.forEach((row) => {
    ensureSpace(rowHeight);
    const y = doc.y;
    let x = startX;

    doc.save();
    doc.font("Helvetica").fontSize(8.5).fillColor("#111827");

    columns.forEach((col, i) => {
      const w = colWidths[i];
      doc.rect(x, y, w, rowHeight).stroke("#E5E7EB");

      if (col.key === "signature") {
        const parsed = parseImageDataUrl(row.signatureDataUrl);
        if (parsed) {
          try {
            const pad = 4;
            const targetW = Math.max(10, w - pad * 2);
            const targetH = Math.max(10, rowHeight - pad * 2);
            // Fit the signature into the cell.
            doc.image(parsed.buffer, x + pad, y + pad, { fit: [targetW, targetH], align: "center", valign: "center" });
          } catch {
            // ignore image render errors per-row
          }
        }
      } else {
        const value = row[col.key] == null ? "" : String(row[col.key]);
        doc.text(value, x + 5, y + 7, { width: w - 10, height: rowHeight - 10, ellipsis: true });
      }

      x += w;
    });

    doc.restore();
    doc.y = y + rowHeight;
  });
  doc.end();
});

router.put("/attendance/:id", authenticate, requireAdmin, async (req, res) => {
  const { date, fullName, position, institution, contactType, phonePassport, email } = req.body;
  if (!fullName || !contactType || !phonePassport) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  const updated = await Attendance.findByIdAndUpdate(
    req.params.id,
    { date, fullName, position, institution, contactType, phonePassport, email },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "Attendance not found" });
  return res.json({ ok: true });
});

router.delete("/attendance/:id", authenticate, requireAdmin, async (req, res) => {
  await Attendance.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/notifications", authenticate, async (req, res) => {
  const notifications = await Notification.find({ recipientUserId: req.auth.userId })
    .sort({ createdAt: -1 })
    .limit(30);
  const unreadCount = await Notification.countDocuments({ recipientUserId: req.auth.userId, read: false });
  res.json({
    unreadCount,
    notifications: notifications.map((n) => ({
      id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      metadata: n.metadata && typeof n.metadata === "object" ? n.metadata : {},
      read: n.read,
      createdAt: n.createdAt
    }))
  });
});

router.patch("/notifications/:id/read", authenticate, async (req, res) => {
  const updated = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientUserId: req.auth.userId },
    { read: true },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "Notification not found" });
  return res.json({ ok: true });
});

router.patch("/notifications/read-all", authenticate, async (req, res) => {
  await Notification.updateMany({ recipientUserId: req.auth.userId, read: false }, { read: true });
  return res.json({ ok: true });
});

router.delete("/notifications/:id", authenticate, async (req, res) => {
  const deleted = await Notification.findOneAndDelete({ _id: req.params.id, recipientUserId: req.auth.userId });
  if (!deleted) return res.status(404).json({ message: "Notification not found" });
  return res.json({ ok: true });
});

router.get("/users", authenticate, async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(
    users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      avatarUrl: u.avatarUrl || "",
      joinedDate: u.createdAt.toISOString().split("T")[0]
    }))
  );
});

router.patch("/users/me", authenticate, async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ message: "Name and email are required" });
  const normalizedEmail = String(email).toLowerCase().trim();
  const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: req.auth.userId } });
  if (duplicate) return res.status(409).json({ message: "Email already exists" });
  const updated = await User.findByIdAndUpdate(req.auth.userId, { name, email: normalizedEmail }, { new: true });
  if (!updated) return res.status(404).json({ message: "User not found" });
  return res.json({
    id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    status: updated.status,
    avatarUrl: updated.avatarUrl || ""
  });
});

router.post("/users/me/avatar", authenticate, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Avatar file is required" });
  const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  const updated = await User.findByIdAndUpdate(req.auth.userId, { avatarUrl }, { new: true });
  if (!updated) return res.status(404).json({ message: "User not found" });
  return res.json({ avatarUrl });
});

router.post("/users", authenticate, requireAdmin, async (req, res) => {
  const { name, email, role, avatarUrl, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }
  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) return res.status(409).json({ message: "Email already exists" });
  const passwordHash = await bcrypt.hash(String(password), 10);
  const normalizedRole = role === "admin" ? "admin" : role === "meeting_leader" ? "meeting_leader" : "receptionist";
  const created = await User.create({
    name,
    email: String(email).toLowerCase().trim(),
    role: normalizedRole,
    status: "active",
    avatarUrl: avatarUrl || "",
    passwordHash
  });
  res.status(201).json({
    id: created._id,
    name: created.name,
    email: created.email,
    role: created.role,
    status: created.status,
    avatarUrl: created.avatarUrl || "",
    joinedDate: created.createdAt.toISOString().split("T")[0]
  });
});

router.put("/users/:id", authenticate, requireAdmin, async (req, res) => {
  const { name, email, role, status, avatarUrl } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: req.params.id } });
  if (duplicate) return res.status(409).json({ message: "Email already exists" });

  const existing = await User.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: "User not found" });

  const nextStatus = ["active", "pending", "rejected"].includes(status) ? status : "active";
  const normalizedRole = role === "admin" ? "admin" : role === "meeting_leader" ? "meeting_leader" : "receptionist";

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    {
      name,
      email: normalizedEmail,
      role: normalizedRole,
      status: nextStatus,
      avatarUrl: avatarUrl || ""
    },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "User not found" });

  if (nextStatus === "pending" && existing.status !== "pending") {
    await createPendingUserApprovalNotifications({ userDoc: updated, actorUserId: req.auth.userId });
  }

  return res.json({
    id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    status: updated.status,
    avatarUrl: updated.avatarUrl || "",
    joinedDate: updated.createdAt.toISOString().split("T")[0]
  });
});

router.patch("/users/:id/status", authenticate, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["active", "pending", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const existing = await User.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: "User not found" });

  const updated = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!updated) return res.status(404).json({ message: "User not found" });

  if (status === "pending" && existing.status !== "pending") {
    await createPendingUserApprovalNotifications({ userDoc: updated, actorUserId: req.auth.userId });
  }

  return res.json({ ok: true });
});

router.delete("/users/:id", authenticate, requireAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/stats/dashboard", authenticate, async (_req, res) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const startOfWeekWindow = new Date(startOfToday);
  startOfWeekWindow.setDate(startOfWeekWindow.getDate() - 6);

  const totalVisitorsToday = await VisitorRequest.countDocuments({
    createdAt: { $gte: startOfToday, $lt: startOfTomorrow }
  });
  const totalRequests = await VisitorRequest.countDocuments();
  const pendingRequests = await VisitorRequest.countDocuments({ status: "Pending" });
  const approvedRequests = await VisitorRequest.countDocuments({ status: "Approved" });
  const recentVisitorDocs = await VisitorRequest.find().sort({ createdAt: -1 }).limit(4);
  const recentVisitors = recentVisitorDocs.map((v) => ({
    id: String(v._id),
    name: visitorRequestDashboardName(v),
    institution: v.service || "",
    date: v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : "",
    time: new Date(v.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }));
  const recentRequestDocs = await VisitorRequest.find().sort({ createdAt: -1 }).limit(3);
  const recentRequests = recentRequestDocs.map((r) => ({
    id: String(r._id),
    name: visitorRequestDashboardName(r),
    service: r.service,
    status: r.status === "Approved" ? "Completed" : r.status,
    date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : ""
  }));
  const pendingApprovals = await User.find({ status: "pending" }).sort({ createdAt: -1 }).limit(5);
  const activeStaff = await User.countDocuments({ status: "active", role: "receptionist" });

  const hourlyAgg = await VisitorRequest.aggregate([
    { $match: { createdAt: { $gte: startOfToday, $lt: startOfTomorrow } } },
    { $group: { _id: { $hour: "$createdAt" }, visitors: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const hourlyMap = new Map(hourlyAgg.map((h) => [h._id, h.visitors]));
  const hourlyData = Array.from({ length: 10 }).map((_, i) => {
    const hour24 = 8 + i;
    const hour12 = hour24 > 12 ? hour24 - 12 : hour24;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    return { hour: `${hour12}${suffix}`, visitors: hourlyMap.get(hour24) || 0 };
  });

  const visitorWeeklyAgg = await VisitorRequest.aggregate([
    { $match: { createdAt: { $gte: startOfWeekWindow, $lt: startOfTomorrow } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, visitors: { $sum: 1 } } }
  ]);
  const requestWeeklyAgg = await VisitorRequest.aggregate([
    { $match: { createdAt: { $gte: startOfWeekWindow, $lt: startOfTomorrow } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, requests: { $sum: 1 } } }
  ]);
  const visitorsByDate = new Map(visitorWeeklyAgg.map((d) => [d._id, d.visitors]));
  const requestsByDate = new Map(requestWeeklyAgg.map((d) => [d._id, d.requests]));
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const dayDate = new Date(startOfWeekWindow);
    dayDate.setDate(startOfWeekWindow.getDate() + i);
    const key = dayDate.toISOString().split("T")[0];
    return {
      day: weekdayLabels[dayDate.getDay()],
      visitors: visitorsByDate.get(key) || 0,
      requests: requestsByDate.get(key) || 0
    };
  });

  const weekVisitors = weeklyData.reduce((sum, d) => sum + d.visitors, 0);
  const meetingDailyAgg = await MeetingAttendance.aggregate([
    { $match: { eventDate: { $gte: startOfWeekWindow.toISOString().slice(0, 10), $lte: startOfToday.toISOString().slice(0, 10) } } },
    { $group: { _id: "$eventDate", meetings: { $sum: 1 } } }
  ]);
  const meetingsByDate = new Map(meetingDailyAgg.map((d) => [d._id, d.meetings]));
  const meetingDailyData = Array.from({ length: 7 }).map((_, i) => {
    const dayDate = new Date(startOfWeekWindow);
    dayDate.setDate(startOfWeekWindow.getDate() + i);
    const key = dayDate.toISOString().split("T")[0];
    return {
      day: weekdayLabels[dayDate.getDay()],
      meetings: meetingsByDate.get(key) || 0
    };
  });
  const meetingByInstitutionAgg = await MeetingAttendance.aggregate([
    { $group: { _id: "$institution", meetings: { $sum: 1 } } },
    { $sort: { meetings: -1 } },
    { $limit: 5 }
  ]);
  const meetingByInstitution = meetingByInstitutionAgg.map((m) => ({
    institution: m._id || "Unknown",
    meetings: m.meetings
  }));

  res.json({
    stats: [
      { label: "Total Visitors Today", value: String(totalVisitorsToday) },
      { label: "Total Requests", value: String(totalRequests) },
      { label: "Pending Requests", value: String(pendingRequests) },
      { label: "Approved", value: String(approvedRequests) }
    ],
    recentVisitors,
    recentRequests,
    pendingApprovals: pendingApprovals.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role === "admin" ? "Admin" : "Receptionist"
    })),
    hourlyData,
    weeklyData,
    meetingDailyData,
    meetingByInstitution,
    systemOverview: {
      weekVisitors,
      activeStaff,
      avgWaitTime: "8 min"
    }
  });
});

router.get("/stats/reports", authenticate, async (req, res) => {
  const { period = "week" } = req.query;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "month") {
    start.setDate(1);
  } else if (period === "year") {
    start.setMonth(0, 1);
  } else {
    start.setDate(start.getDate() - 6);
  }

  const previousStart = new Date(start);
  if (period === "month") {
    previousStart.setMonth(previousStart.getMonth() - 1);
  } else if (period === "year") {
    previousStart.setFullYear(previousStart.getFullYear() - 1);
  } else {
    previousStart.setDate(previousStart.getDate() - 7);
  }

  const totalVisitors = await VisitorRequest.countDocuments({ createdAt: { $gte: start, $lte: now } });
  const totalRequests = await VisitorRequest.countDocuments({ createdAt: { $gte: start, $lte: now } });
  const completedRequests = await VisitorRequest.countDocuments({ createdAt: { $gte: start, $lte: now }, status: "Approved" });
  const completionRate = totalRequests ? Math.round((completedRequests / totalRequests) * 100) : 0;

  const previousVisitors = await VisitorRequest.countDocuments({ createdAt: { $gte: previousStart, $lt: start } });
  const previousRequests = await VisitorRequest.countDocuments({ createdAt: { $gte: previousStart, $lt: start } });
  const visitorChange = previousVisitors ? Math.round(((totalVisitors - previousVisitors) / previousVisitors) * 100) : 0;
  const requestChange = previousRequests ? Math.round(((totalRequests - previousRequests) / previousRequests) * 100) : 0;

  const serviceDistributionAgg = await VisitorRequest.aggregate([
    { $match: { createdAt: { $gte: start, $lte: now } } },
    { $group: { _id: "$service", value: { $sum: 1 } } },
    { $sort: { value: -1 } }
  ]);

  const weeklyStart = new Date(now);
  weeklyStart.setHours(0, 0, 0, 0);
  weeklyStart.setDate(weeklyStart.getDate() - 6);
  const weeklyEnd = new Date(now);
  weeklyEnd.setHours(23, 59, 59, 999);

  const visitorWeeklyAgg = await VisitorRequest.aggregate([
    { $match: { createdAt: { $gte: weeklyStart, $lte: weeklyEnd } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, visitors: { $sum: 1 } } }
  ]);
  const requestWeeklyAgg = await VisitorRequest.aggregate([
    { $match: { createdAt: { $gte: weeklyStart, $lte: weeklyEnd } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, requests: { $sum: 1 } } }
  ]);
  const visitorsByDate = new Map(visitorWeeklyAgg.map((d) => [d._id, d.visitors]));
  const requestsByDate = new Map(requestWeeklyAgg.map((d) => [d._id, d.requests]));
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const dayDate = new Date(weeklyStart);
    dayDate.setDate(weeklyStart.getDate() + i);
    const key = dayDate.toISOString().split("T")[0];
    return {
      day: weekdayLabels[dayDate.getDay()],
      visitors: visitorsByDate.get(key) || 0,
      requests: requestsByDate.get(key) || 0
    };
  });

  const monthlyStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyVisitorAgg = await VisitorRequest.aggregate([
    { $match: { createdAt: { $gte: monthlyStart, $lte: now } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, visitors: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const visitorsByMonth = new Map(monthlyVisitorAgg.map((m) => [m._id, m.visitors]));
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyTrend = Array.from({ length: 6 }).map((_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      month: monthNames[date.getMonth()],
      visitors: visitorsByMonth.get(key) || 0
    };
  });

  res.json({
    summary: {
      totalVisitors,
      totalRequests,
      completionRate,
      avgWaitTime: "8 min",
      visitorChange,
      requestChange
    },
    serviceDistribution: serviceDistributionAgg.map((s) => ({ name: s._id, value: s.value })),
    weeklyData,
    monthlyTrend
  });
});

module.exports = router;
