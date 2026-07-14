import dotenv from "dotenv";
import User from "../models/User.model";
import { connectDB } from "../config/database";

dotenv.config();

async function runMigration() {
  console.log("=== Starting MongoDB Email Verification Migration for Existing Users ===");
  try {
    await connectDB();

    // Find all users who are not verified and do NOT have a verification token hash
    // (This signifies they were registered prior to the email verification feature implementation)
    const query = {
      emailVerified: false,
      $or: [
        { emailVerificationTokenHash: { $exists: false } },
        { emailVerificationTokenHash: null }
      ]
    };

    const usersToMigrate = await User.find(query);
    console.log(`Found ${usersToMigrate.length} user(s) to grandfather/migrate.`);

    if (usersToMigrate.length > 0) {
      const result = await User.updateMany(query, {
        $set: { emailVerified: true }
      });
      console.log(`Successfully migrated ${result.modifiedCount} user(s).`);
    } else {
      console.log("No users need migration.");
    }

    console.log("=== Migration Completed Successfully ===");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
