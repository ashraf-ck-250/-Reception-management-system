const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Attendance = require("./models/Attendance");
const ServiceRequest = require("./models/ServiceRequest");
const User = require("./models/User");
const Notification = require("./models/Notification");
const { authenticate, requireAdmin } = require("./middleware/auth");

const router = express.Router();

async function createServiceStatusNotifications({ requestDoc, status, actorUserId }) {
  const recipients = await User.find({
    status: "active",
    role: { $in: ["admin", "receptionist"] },
    _id: { $ne: actorUserId }
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
        status
      }
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
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });
  if (user.status !== "active") return res.status(403).json({ message: "User is not active yet" });
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
  res.status(201).json({ id: created._id });
});

router.patch("/service-requests/:id/status", authenticate, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["Pending", "Completed", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const updated = await ServiceRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!updated) return res.status(404).json({ message: "Service request not found" });
  await createServiceStatusNotifications({ requestDoc: updated, status, actorUserId: req.auth.userId });
  return res.json({ ok: true });
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
      joinedDate: u.createdAt.toISOString().split("T")[0]
    }))
  );
});

router.post("/users", authenticate, requireAdmin, async (req, res) => {
  const { name, email, role } = req.body;
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
    passwordHash
  });
  res.status(201).json({
    id: created._id,
    name: created.name,
    email: created.email,
    role: created.role,
    status: created.status,
    joinedDate: created.createdAt.toISOString().split("T")[0]
  });
});

router.put("/users/:id", authenticate, requireAdmin, async (req, res) => {
  const { name, email, role, status } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: req.params.id } });
  if (duplicate) return res.status(409).json({ message: "Email already exists" });

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    {
      name,
      email: normalizedEmail,
      role: role === "admin" ? "admin" : "receptionist",
      status: ["active", "pending", "rejected"].includes(status) ? status : "active"
    },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "User not found" });

  return res.json({
    id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    status: updated.status,
    joinedDate: updated.createdAt.toISOString().split("T")[0]
  });
});

router.patch("/users/:id/status", authenticate, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["active", "pending", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const updated = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!updated) return res.status(404).json({ message: "User not found" });
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
    recentVisitors: recentVisitors.map((v) => ({ name: v.fullName, institution: v.institution, time: new Date(v.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) })),
    recentRequests: recentRequests.map((r) => ({ name: r.fullName, service: r.service, status: r.status })),
    pendingApprovals: pendingApprovals.map((u) => ({ name: u.name, email: u.email, role: u.role === "admin" ? "Admin" : "Receptionist" })),
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
