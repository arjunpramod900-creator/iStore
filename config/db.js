import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log("MongoDB Connected ✅");

      return;
    } catch (error) {
      console.log(`Database Error ❌ (Attempt ${attempt}/${MAX_RETRIES})`);

      console.error(error);

      if (attempt === MAX_RETRIES) {
        console.log("Maximum retry attempts reached. Exiting...");
        process.exit(1);
      }

      console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...\n`);

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
};

mongoose.connection.on("connected", () => {
  console.log("🟢 MongoDB connection established.");
});

mongoose.connection.on("disconnected", () => {
  console.log("🟡 MongoDB connection lost.");
});

mongoose.connection.on("reconnected", () => {
  console.log("🟢 MongoDB reconnected.");
});

mongoose.connection.on("error", (error) => {
  console.error("🔴 MongoDB Error:", error.message);
});

export default connectDB;
