import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/services/userService";
import { PasswordSetupSchema } from "@/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PasswordSetupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    await UserService.activateAccount(parsed.data.token, parsed.data.password);

    const res = NextResponse.json({
      success: true,
      message: "Password configured successfully. You may now log in.",
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Password setup failed";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
