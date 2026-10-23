import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Inline UserSchema definition to avoid TypeScript/ESM module resolution issues in standalone Node script
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["admin", "intern"], required: true },
    status: { type: String, enum: ["active", "inactive", "pending_setup"], default: "active" },
    internId: { type: String, trim: true, sparse: true, unique: true },
    department: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

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

  const maskedUri = mongoUri.replace(/(:\/\/)([^@]+)@/, "$1***:***@");
  console.log(`Connecting to MongoDB at ${maskedUri}...`);
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 25000 });
  } catch (err) {
    console.error("Could not connect to MongoDB:", err.message);
    console.error("Please ensure MongoDB is running or configure a valid MONGODB_URI in .env.local.");
    process.exit(1);
  }

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
    console.error("Bootstrap failed with error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

bootstrapAdmin();
