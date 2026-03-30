const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const { connectDb } = require("./config/db");
const { seedIfEmpty } = require("./seed");
const routes = require("./routes");

const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => res.send('Hello World'));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api", routes);


const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

async function start() {
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment variables");
  }
  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET in environment variables");
  }
  await connectDb(uri);
  await seedIfEmpty();
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start backend:", err);
  process.exit(1);
});
