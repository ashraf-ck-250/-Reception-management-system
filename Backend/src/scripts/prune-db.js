/**
 * Optional database cleanup. Does not run automatically.
 *
 * Usage (from Backend folder):
 *   node src/scripts/prune-db.js --meetings
 *   node src/scripts/prune-db.js --legacy-attendance
 *   node src/scripts/prune-db.js --meetings --legacy-attendance
 *
 * --meetings           Delete all documents in meetingattendances collection
 * --legacy-attendance  Delete all documents in attendances collection (old visitor check-in flow)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const mongoose = require("mongoose");
const MeetingAttendance = require("../models/MeetingAttendance");
const Attendance = require("../models/Attendance");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  const args = new Set(process.argv.slice(2));
  const meetings = args.has("--meetings");
  const attendance = args.has("--legacy-attendance");

  if (!meetings && !attendance) {
    console.error("Specify at least one of: --meetings, --legacy-attendance");
    process.exit(1);
  }

  await mongoose.connect(uri);

  if (meetings) {
    const r = await MeetingAttendance.deleteMany({});
    console.log(`Removed ${r.deletedCount} meeting attendance record(s).`);
  }
  if (attendance) {
    const r = await Attendance.deleteMany({});
    console.log(`Removed ${r.deletedCount} legacy attendance record(s).`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
