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
  const userCount = await User.countDocuments();
  if (userCount < 8) {
    const adminPassword = await bcrypt.hash("admin123", 10);
    const receptionistPassword = await bcrypt.hash("reception123", 10);

    const demoUsers = [
      { name: "Admin User", email: "admin@reception.rw", passwordHash: adminPassword, role: "admin", status: "active", avatarUrl: avatarFor("Admin User") },
      { name: "Receptionist", email: "reception@reception.rw", passwordHash: receptionistPassword, role: "receptionist", status: "active", avatarUrl: avatarFor("Receptionist") },
      { name: "Amina Uwase", email: "amina@reception.rw", passwordHash: receptionistPassword, role: "receptionist", status: "pending", avatarUrl: avatarFor("Amina Uwase") },
      { name: "Eric Mugabo", email: "eric@reception.rw", passwordHash: receptionistPassword, role: "receptionist", status: "pending", avatarUrl: avatarFor("Eric Mugabo") },
      { name: "Sandrine Ingabire", email: "sandrine@reception.rw", passwordHash: receptionistPassword, role: "receptionist", status: "active", avatarUrl: avatarFor("Sandrine Ingabire") },
      { name: "Claude Niyitegeka", email: "claude.niyitegeka@reception.rw", passwordHash: receptionistPassword, role: "receptionist", status: "active", avatarUrl: avatarFor("Claude Niyitegeka") },
      { name: "Belise Uwimana", email: "belise.uwimana@reception.rw", passwordHash: receptionistPassword, role: "receptionist", status: "rejected", avatarUrl: avatarFor("Belise Uwimana") },
      { name: "System Supervisor", email: "supervisor@reception.rw", passwordHash: receptionistPassword, role: "admin", status: "active", avatarUrl: avatarFor("System Supervisor") }
    ];

    for (const user of demoUsers) {
      const exists = await User.findOne({ email: user.email });
      if (!exists) await User.create(user);
    }
  }

  const usersWithoutAvatar = await User.find({
    $or: [{ avatarUrl: { $exists: false } }, { avatarUrl: "" }]
  }).select("_id name");
  for (const u of usersWithoutAvatar) {
    await User.findByIdAndUpdate(u._id, { avatarUrl: avatarFor(u.name) });
  }

  const attendanceCount = await Attendance.countDocuments();
  if (attendanceCount < 80) {
    const names = [
      "Jean Baptiste", "Alice Uwimana", "Patrick Habimana", "Grace Mukamana", "Emmanuel Niyonzima",
      "Diane Ishimwe", "Claude Mugisha", "Marie Claire", "David Kamanzi", "Yvette Uwera",
      "Alex Mugabo", "Pacifique Ndayisaba", "Nadine Umutoni", "Didier Nsengimana", "Carine Nyiramana"
    ];
    const positions = ["Director", "Secretary", "Legal Advisor", "Analyst", "Engineer", "Coordinator", "Officer"];
    const institutions = ["MINIJUST", "MININFRA", "Rwanda Law Reform Commission", "Prime Minister Head Office"];

    const records = [];
    const now = new Date();
    for (let d = 0; d < 30; d += 1) {
      const day = addDays(now, -d);
      const visitorsPerDay = 6 + (d % 5); // 6-10 visitors/day
      for (let i = 0; i < visitorsPerDay; i += 1) {
        const hour = 8 + ((i + d) % 9);
        const minute = (i * 11 + d * 7) % 60;
        const createdAt = setTime(day, hour, minute);
        const name = names[(d + i) % names.length];
        const contactType = i % 4 === 0 ? "passport" : "phone";
        records.push({
          date: createdAt.toISOString().split("T")[0],
          fullName: name,
          position: positions[(d + i) % positions.length],
          institution: institutions[(i + d * 2) % institutions.length],
          contactType,
          phonePassport: contactType === "passport" ? `RW${100000 + d * 20 + i}` : `+250 78${(100000 + d * 200 + i * 13).toString().slice(-6)}`,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          createdAt,
          updatedAt: createdAt
        });
      }
    }

    await Attendance.insertMany(records);
  }

  const requestCount = await ServiceRequest.countDocuments();
  if (requestCount < 50) {
    const services = ["MINIJUST", "MININFRA", "Rwanda Law Reform Commission", "Prime Minister Head Office"];
    const messages = [
      "Request for legal consultation",
      "Document certification needed",
      "Infrastructure project inquiry",
      "Official appointment request",
      "Follow-up on submitted case",
      "Seeking administrative clearance"
    ];
    const names = ["Diane Ishimwe", "Claude Mugisha", "Marie Claire", "David Kamanzi", "Aline Murekatete", "Patrick Rukundo"];

    const requests = [];
    const now = new Date();
    for (let d = 0; d < 45; d += 1) {
      const day = addDays(now, -d);
      const perDay = 2 + (d % 2); // 2-3 requests/day
      for (let i = 0; i < perDay; i += 1) {
        const createdAt = setTime(day, 9 + ((i + d) % 7), (d * 9 + i * 17) % 60);
        const fullName = names[(d + i) % names.length];
        const statusCycle = (d + i) % 6;
        const status = statusCycle < 3 ? "Completed" : statusCycle < 5 ? "Pending" : "Rejected";
        requests.push({
          fullName,
          phoneNumber: `+250 78${(200000 + d * 147 + i * 31).toString().slice(-6)}`,
          passportNumber: i % 2 === 0 ? `RW${600000 + d * 10 + i}` : "",
          email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@email.com`,
          service: services[(d + i) % services.length],
          eventDate: addDays(createdAt, 5 + (i % 4)).toISOString().split("T")[0],
          message: messages[(d + i) % messages.length],
          status,
          createdAt,
          updatedAt: createdAt
        });
      }
    }

    await ServiceRequest.insertMany(requests);
  }
}

module.exports = { seedIfEmpty };