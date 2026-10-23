import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models/User";

async function bootstrapAdmin() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGODB_URI environment variable is not defined.");
    process.exit(1);
  }

  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const adminName = process.env.INITIAL_ADMIN_NAME || "System Administrator";

  if (!adminEmail || !adminPassword) {
    console.error("Error: INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be configured.");
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error("Error: INITIAL_ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri);

  try {
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      console.log(`Notice: Admin account '${adminEmail}' already exists. No duplicate bootstrap performed.`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      role: "admin",
      status: "active",
      passwordHash,
    });

    console.log(`Success: Initial admin account '${adminEmail}' successfully bootstrapped.`);
  } catch (error) {
    console.error("Bootstrap failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

bootstrapAdmin();
