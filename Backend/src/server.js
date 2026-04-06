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
const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

let initPromise = null;

async function initializeApp() {
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment variables");
  }
  if (!jwtSecret) {
    throw new Error("Missing JWT_SECRET in environment variables");
  }
  await connectDb(uri);
  await seedIfEmpty();
}

function ensureInitialized() {
  if (!initPromise) {
    initPromise = initializeApp().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

app.use(async (_req, res, next) => {
  try {
    await ensureInitialized();
    next();
  } catch (err) {
    console.error("Failed to initialize backend:", err);
    res.status(500).json({ message: "Backend initialization failed" });
  }
});

app.use("/api", routes);

if (!process.env.VERCEL) {
  ensureInitialized()
    .then(() => {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
    })
    .catch((err) => {
      console.error("Failed to start backend:", err);
      process.exit(1);
    });
}

module.exports = app;
