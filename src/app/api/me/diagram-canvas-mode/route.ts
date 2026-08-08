import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/user";
import { requireUserId } from "@/lib/require-user";

type CanvasMode = "dark" | "light";

/**
 * Load the current user's saved diagram canvas mode (light/dark), defaulting
 * to dark if never set.
 */
export async function GET(): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findById(userId, { diagramCanvasMode: 1 }).lean();
  return NextResponse.json({ mode: user?.diagramCanvasMode ?? "dark" });
}

/**
 * Save the current user's diagram canvas mode. Uses $set on this one field
 * so it never touches the separate accent/background/card theme override.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode } = (await request.json()) as { mode?: CanvasMode };
  if (mode !== "dark" && mode !== "light") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  await connectToDatabase();
  await User.updateOne({ _id: userId }, { $set: { diagramCanvasMode: mode } });
  return NextResponse.json({ ok: true });
}
