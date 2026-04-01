const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Attendance = require("./models/Attendance");
const ServiceRequest = require("./models/ServiceRequest");

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
}

function setTime(date, hour, minute) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function avatarFor(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=128`;
}

async function seedIfEmpty() {
  // Only add admin and receptionist if no users exist
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const adminPassword = await bcrypt.hash("admin123", 10);
    const receptionistPassword = await bcrypt.hash("reception123", 10);
    const demoUsers = [
      { name: "Admin User", email: "admin@reception.rw", passwordHash: adminPassword, role: "admin", status: "active", avatarUrl: avatarFor("Admin User") },
      { name: "Receptionist", email: "reception@reception.rw", passwordHash: receptionistPassword, role: "receptionist", status: "active", avatarUrl: avatarFor("Receptionist") }
    ];
    await User.insertMany(demoUsers);
  }
  // Do not delete any data, so form submissions persist
}

module.exports = { seedIfEmpty };