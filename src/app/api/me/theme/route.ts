import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/user";
import { requireUserId } from "@/lib/require-user";

interface ThemePrefs {
  accent?: string;
  background?: string;
  card?: string;
}

/**
 * Load the current user's saved theme color overrides, if any.
 */
export async function GET(): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findById(userId, { theme: 1 }).lean();
  return NextResponse.json(user?.theme ?? {});
}

/**
 * Save the current user's theme color overrides (accent / background /
 * card). Passing an empty object for a field clears that override.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const theme = (await request.json()) as ThemePrefs;
  await connectToDatabase();
  await User.updateOne({ _id: userId }, { theme });
  return NextResponse.json({ ok: true });
}
