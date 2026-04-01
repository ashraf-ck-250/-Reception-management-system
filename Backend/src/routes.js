const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Attendance = require("./models/Attendance");
const ServiceRequest = require("./models/ServiceRequest");
const User = require("./models/User");
const Notification = require("./models/Notification");
const { authenticate, requireAdmin } = require("./middleware/auth");
const { sendMail } = require("./email/mailer");
const { acceptedEmail, rejectedEmail, pendingEmail } = require("./email/templates");

const router = express.Router();
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

async function createServiceStatusNotifications({ requestDoc, status, actorUserId }) {
  const recipients = await User.find({
    status: "active",
    role: { $in: ["admin", "receptionist"] }
  }).select("_id");

  if (!recipients.length) return;

  await Notification.insertMany(
    recipients.map((u) => ({
      recipientUserId: u._id,
      type: "service_request_status",
      title: `Service request ${status}`,
      message: `${requestDoc.fullName}'s request for ${requestDoc.service} was ${status.toLowerCase()}.`,
      metadata: {
        requestId: String(requestDoc._id),
        status,
        actorUserId
      }
    }))
  );
}

async function createNewServiceRequestNotifications({ requestDoc }) {
  const admins = await User.find({ status: "active", role: "admin" }).select("_id");
  if (!admins.length) return;

  await Notification.insertMany(
    admins.map((u) => ({
      recipientUserId: u._id,
      type: "new_service_request",
      title: "New service request submitted",
      message: `${requestDoc.fullName} submitted a request for ${requestDoc.service}.`,
      metadata: {
        requestId: String(requestDoc._id),
        status: requestDoc.status
      }
    }))
  );
}

async function createVisitorCheckInNotifications(attendanceDoc) {
  const recipients = await User.find({
    status: "active",
    role: { $in: ["admin", "receptionist"] }
  }).select("_id");
  if (!recipients.length) return;

  await Notification.insertMany(
    recipients.map((u) => ({
      recipientUserId: u._id,
      type: "visitor_check_in",
      title: "New visitor check-in",
      message: `${attendanceDoc.fullName} from ${attendanceDoc.institution || "—"} completed visitor attendance.`,
      metadata: { attendanceId: String(attendanceDoc._id) }
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
  await Notification.insertMany(
    admins.map((u) => ({
      recipientUserId: u._id,
      type: "user_pending_approval",
      title: "User pending approval",
      message: `${userDoc.name} (${userDoc.email}) is awaiting approval as ${roleLabel}.`,
      metadata: { userId: String(userDoc._id) }
    }))
  );
}

router.get("/health", (_req, res) => {
  res.json({ ok: true });
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
      joinedDate: user.createdAt.toISOString().split("T")[0]
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

router.get("/service-requests", authenticate, async (_req, res) => {
  const records = await ServiceRequest.find().sort({ createdAt: -1 });
  res.json(
    records.map((r) => ({
      id: r._id,
      date: r.createdAt.toISOString().split("T")[0],
      name: r.fullName,
      phone: r.phoneNumber,
      passport: r.passportNumber || "-",
      email: r.email,
      service: r.service,
      eventDate: r.eventDate,
      message: r.message,
      status: r.status
    }))
  );
});

router.post("/service-requests", async (req, res) => {
  const { fullName, phoneNumber, passportNumber, email, service, eventDate, message } = req.body;
  if (!fullName || !service) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  const created = await ServiceRequest.create({ fullName, phoneNumber, passportNumber, email, service, eventDate, message });
  await createNewServiceRequestNotifications({ requestDoc: created });

  // Email requester immediately (Pending)
  try {
    const frontendBase = process.env.FRONTEND_BASE_URL || "https://reception-management-system.vercel.app";
    const statusUrl = `${frontendBase}/request-status/${created._id}`;
    const to = created.email;
    if (to) {
      const payload = pendingEmail({ recipientName: created.fullName, service: created.service, statusUrl });
      await sendMail({ to, subject: payload.subject, html: payload.html });
    }
  } catch (err) {
    console.error("[email] pending notification error:", err.message || err);
  }

  res.status(201).json({ id: created._id });
});

router.delete("/service-requests/:id", authenticate, requireAdmin, async (req, res) => {
  const deleted = await ServiceRequest.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Service request not found" });
  return res.json({ ok: true });
});

router.patch("/service-requests/:id/status", authenticate, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["Pending", "Completed", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const updated = await ServiceRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!updated) return res.status(404).json({ message: "Service request not found" });
  await createServiceStatusNotifications({ requestDoc: updated, status, actorUserId: req.auth.userId });

  // Email requester on accept/reject
  try {
    const frontendBase = process.env.FRONTEND_BASE_URL || "https://reception-management-system.vercel.app";
    const statusUrl = `${frontendBase}/request-status/${updated._id}`;
    const submitAgainUrl = `${frontendBase}/service-request`;
    const to = updated.email;
    if (to && (status === "Completed" || status === "Rejected")) {
      const payload =
        status === "Completed"
          ? acceptedEmail({ recipientName: updated.fullName, service: updated.service, statusUrl })
          : rejectedEmail({ recipientName: updated.fullName, service: updated.service, statusUrl, submitAgainUrl });
      await sendMail({ to, subject: payload.subject, html: payload.html });
    }
  } catch (err) {
    console.error("[email] status notification error:", err.message || err);
  }

  return res.json({ ok: true });
});

// Public status page data for email links
router.get("/public/service-requests/:id", async (req, res) => {
  const doc = await ServiceRequest.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  return res.json({
    id: doc._id,
    fullName: doc.fullName,
    service: doc.service,
    status: doc.status,
    updatedAt: doc.updatedAt
  });
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
  const { name, email, role, avatarUrl } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }
  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) return res.status(409).json({ message: "Email already exists" });
  const passwordHash = await bcrypt.hash("changeme123", 10);
  const created = await User.create({
    name,
    email: String(email).toLowerCase().trim(),
    role: role === "admin" ? "admin" : "receptionist",
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

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    {
      name,
      email: normalizedEmail,
      role: role === "admin" ? "admin" : "receptionist",
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
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const startOfWeekWindow = new Date(startOfToday);
  startOfWeekWindow.setDate(startOfWeekWindow.getDate() - 6);

  const totalVisitorsToday = await Attendance.countDocuments({ date: today });
  const serviceRequests = await ServiceRequest.countDocuments();
  const pendingRequests = await ServiceRequest.countDocuments({ status: "Pending" });
  const completedRequests = await ServiceRequest.countDocuments({ status: "Completed" });
  const recentVisitors = await Attendance.find().sort({ createdAt: -1 }).limit(4);
  const recentRequests = await ServiceRequest.find().sort({ createdAt: -1 }).limit(3);
  const pendingApprovals = await User.find({ status: "pending" }).sort({ createdAt: -1 }).limit(5);
  const activeStaff = await User.countDocuments({ status: "active", role: "receptionist" });

  const hourlyAgg = await Attendance.aggregate([
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

  const visitorWeeklyAgg = await Attendance.aggregate([
    { $match: { createdAt: { $gte: startOfWeekWindow, $lt: startOfTomorrow } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, visitors: { $sum: 1 } } }
  ]);
  const requestWeeklyAgg = await ServiceRequest.aggregate([
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

  res.json({
    stats: [
      { label: "Total Visitors Today", value: String(totalVisitorsToday) },
      { label: "Service Requests", value: String(serviceRequests) },
      { label: "Pending Requests", value: String(pendingRequests) },
      { label: "Completed", value: String(completedRequests) }
    ],
    recentVisitors: recentVisitors.map((v) => ({
      id: String(v._id),
      name: v.fullName,
      institution: v.institution,
      time: new Date(v.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    })),
    recentRequests: recentRequests.map((r) => ({
      id: String(r._id),
      name: r.fullName,
      service: r.service,
      status: r.status
    })),
    pendingApprovals: pendingApprovals.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role === "admin" ? "Admin" : "Receptionist"
    })),
    hourlyData,
    weeklyData,
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

  const totalVisitors = await Attendance.countDocuments({ createdAt: { $gte: start, $lte: now } });
  const totalRequests = await ServiceRequest.countDocuments({ createdAt: { $gte: start, $lte: now } });
  const completedRequests = await ServiceRequest.countDocuments({ createdAt: { $gte: start, $lte: now }, status: "Completed" });
  const completionRate = totalRequests ? Math.round((completedRequests / totalRequests) * 100) : 0;

  const previousVisitors = await Attendance.countDocuments({ createdAt: { $gte: previousStart, $lt: start } });
  const previousRequests = await ServiceRequest.countDocuments({ createdAt: { $gte: previousStart, $lt: start } });
  const visitorChange = previousVisitors ? Math.round(((totalVisitors - previousVisitors) / previousVisitors) * 100) : 0;
  const requestChange = previousRequests ? Math.round(((totalRequests - previousRequests) / previousRequests) * 100) : 0;

  const serviceDistributionAgg = await ServiceRequest.aggregate([
    { $match: { createdAt: { $gte: start, $lte: now } } },
    { $group: { _id: "$service", value: { $sum: 1 } } },
    { $sort: { value: -1 } }
  ]);

  const weeklyStart = new Date(now);
  weeklyStart.setHours(0, 0, 0, 0);
  weeklyStart.setDate(weeklyStart.getDate() - 6);
  const weeklyEnd = new Date(now);
  weeklyEnd.setHours(23, 59, 59, 999);

  const visitorWeeklyAgg = await Attendance.aggregate([
    { $match: { createdAt: { $gte: weeklyStart, $lte: weeklyEnd } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, visitors: { $sum: 1 } } }
  ]);
  const requestWeeklyAgg = await ServiceRequest.aggregate([
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
  const monthlyVisitorAgg = await Attendance.aggregate([
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
