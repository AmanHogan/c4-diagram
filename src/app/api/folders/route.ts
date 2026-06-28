import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Folder } from "@/lib/models/folder";
import { requireUserId } from "@/lib/require-user";

/**
 * List the current user's folders.
 */
export async function GET(): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const folders = await Folder.find({ ownerId: userId }).sort({ name: 1 }).lean();
  return NextResponse.json(folders.map((f) => ({ id: f._id.toString(), name: f.name })));
}

/**
 * Create a new folder owned by the current user.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = (await request.json()) as { name?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectToDatabase();
  const folder = await Folder.create({ name: name.trim(), ownerId: userId });
  return NextResponse.json({ id: folder._id.toString(), name: folder.name });
}
