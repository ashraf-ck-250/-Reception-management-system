const mongoose = require("mongoose");

async function connectDb(uri) {
  await mongoose.connect(uri);
}

module.exports = { connectDb };
