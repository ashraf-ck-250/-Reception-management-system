const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

function requireReceptionist(req, res, next) {
  if (req.auth?.role !== "receptionist") {
    return res.status(403).json({ message: "Reception access required" });
  }
  return next();
}

function requireMeetingLeader(req, res, next) {
  if (req.auth?.role !== "meeting_leader") {
    return res.status(403).json({ message: "Meeting leader access required" });
  }
  return next();
}

function requireAdminOrMeetingLeader(req, res, next) {
  if (!["admin", "meeting_leader"].includes(req.auth?.role)) {
    return res.status(403).json({ message: "Admin or meeting leader access required" });
  }
  return next();
}

function requireStaff(req, res, next) {
  if (!["admin", "receptionist", "meeting_leader"].includes(req.auth?.role)) {
    return res.status(403).json({ message: "Staff access required" });
  }
  return next();
}

module.exports = { authenticate, requireAdmin, requireReceptionist, requireMeetingLeader, requireAdminOrMeetingLeader, requireStaff };
