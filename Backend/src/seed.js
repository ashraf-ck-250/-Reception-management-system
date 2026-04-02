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
  const adminPassword = await bcrypt.hash("321askmininfra@250", 10);
  const receptionistPassword = await bcrypt.hash("321askreception@250", 10);
  
  // Upsert admin user
  const adminUser = await User.findOneAndUpdate(
    { role: "admin" },
    {
      name: "Admin User",
      email: "info@mininfra.gov.rw",
      passwordHash: adminPassword,
      role: "admin",
      status: "active",
      avatarUrl: avatarFor("Admin User")
    },
    { upsert: true, new: true }
  );
  
  // Upsert receptionist user
  const receptionistUser = await User.findOneAndUpdate(
    { role: "receptionist", email: "reception@reception.rw" },
    {
      name: "Receptionist",
      email: "reception@reception.rw",
      passwordHash: receptionistPassword,
      role: "receptionist",
      status: "active",
      avatarUrl: avatarFor("Receptionist")
    },
    { upsert: true, new: true }
  );
  
  console.log("✓ Database seeded successfully!");
  console.log(`✓ Admin user: ${adminUser.email} (ID: ${adminUser._id})`);
  console.log(`✓ Receptionist user: ${receptionistUser.email} (ID: ${receptionistUser._id})`);
  console.log("\nAdmin credentials for login:");
  console.log(`  Email: info@mininfra.gov.rw`);
  console.log(`  Password: 321askmininfra@250`);
  // Do not delete any data, so form submissions persist
}

module.exports = { seedIfEmpty };