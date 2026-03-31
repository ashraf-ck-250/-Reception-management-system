const mongoose = require('mongoose');
require('dotenv').config();

// Use lowercase 'b' to match your server.js call: connectDb
const connectDb = async (uri) => {
  try {
    // Use the uri passed from server.js
    await mongoose.connect(uri);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

// This is the most important part! 
// Your server.js does: const { connectDb } = require("./config/db");
// So we MUST export it as an object property.
module.exports = { connectDb };