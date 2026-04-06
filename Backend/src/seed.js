const bcrypt = require("bcryptjs");
const User = require("./models/User");

function avatarFor(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=128`;
}

async function seedIfEmpty() {
  const adminPassword = await bcrypt.hash("321askmininfra@250", 10);
  const receptionistPassword = await bcrypt.hash("321askreception@250", 10);

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

  console.log("✓ Default staff users ensured (admin + receptionist).");
  console.log(`  Admin: ${adminUser.email}  Receptionist: ${receptionistUser.email}`);
  console.log("  Initial passwords are defined in src/seed.js — change them for production.");
}

module.exports = { seedIfEmpty };
