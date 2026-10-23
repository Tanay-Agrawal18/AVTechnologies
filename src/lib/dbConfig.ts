/**
 * Server-side Environment Validation for Database & Core Runtime
 */

export interface DbValidationResult {
  isValid: boolean;
  uri?: string;
  isAtlas: boolean;
  errors: string[];
}

export function validateDatabaseEnv(): DbValidationResult {
  const errors: string[] = [];
  const uri = (process.env.MONGODB_URI || "").trim();

  if (!uri) {
    if (process.env.NODE_ENV === "production") {
      errors.push("Missing required MONGODB_URI environment variable in production.");
    }
  } else {
    // Validate URI schema
    if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
      errors.push("MONGODB_URI must start with either 'mongodb://' or 'mongodb+srv://'.");
    }

    if (uri.startsWith("mongodb+srv://")) {
      // Atlas connection checks
      if (!uri.includes("@")) {
        errors.push("MongoDB Atlas connection string requires authentication credentials (user:password@cluster).");
      }
    }
  }

  const effectiveUri = uri || (process.env.NODE_ENV === "production" ? "" : "mongodb://127.0.0.1:27017/iwms_dev");
  const isAtlas = effectiveUri.startsWith("mongodb+srv://");

  return {
    isValid: errors.length === 0 && Boolean(effectiveUri),
    uri: effectiveUri,
    isAtlas,
    errors,
  };
}
