import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET_KEY } from "./jwtConfig";

export interface VerificationTokenPayload {
  internId?: string;
  userId?: string;
  type: "id_card_verification";
}

/**
 * Creates a signed verification token for an intern ID card
 */
export async function createIdVerificationToken(
  identifier: { internId?: string; userId?: string }
): Promise<string> {
  const token = await new SignJWT({
    internId: identifier.internId || "",
    userId: identifier.userId || "",
    type: "id_card_verification",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // Verification tokens are valid for 2 years
    .setExpirationTime("730d")
    .sign(JWT_SECRET_KEY);

  return token;
}

/**
 * Verifies and decodes an ID card verification token
 */
export async function verifyIdVerificationToken(
  token: string
): Promise<{ valid: boolean; payload?: VerificationTokenPayload; error?: string }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    if (payload.type !== "id_card_verification") {
      return { valid: false, error: "Invalid token type" };
    }
    return {
      valid: true,
      payload: {
        internId: payload.internId as string | undefined,
        userId: payload.userId as string | undefined,
        type: "id_card_verification",
      },
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid or expired token";
    return { valid: false, error: errorMessage };
  }
}
