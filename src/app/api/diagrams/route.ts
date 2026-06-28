import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Diagram } from "@/lib/models/diagram";
import { requireUserId } from "@/lib/require-user";

/**
 * List the current user's diagrams, most recently opened first.
 */
export async function GET(): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const diagrams = await Diagram.find(
    { ownerId: userId },
    { name: 1, visibility: 1, updatedAt: 1, lastOpenedAt: 1, folderId: 1 },
  )
    .sort({ lastOpenedAt: -1 })
    .lean();
  return NextResponse.json(
    diagrams.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      visibility: d.visibility,
      updatedAt: d.updatedAt,
      folderId: d.folderId,
    })),
  );
}

/**
 * Create a new, empty diagram owned by the current user.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, visibility, folderId } = (await request.json()) as {
    name?: string;
    visibility?: "public" | "private";
    folderId?: string | null;
  };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await Diagram.findOne({ ownerId: userId, name: name.trim() }).lean();
  if (existing) {
    return NextResponse.json({ error: "You already have a diagram with that name" }, { status: 409 });
  }
  const diagram = await Diagram.create({
    name: name.trim(),
    ownerId: userId,
    visibility: visibility ?? "private",
    folderId: folderId ?? null,
    nodes: [],
    edges: [],
  });
  return NextResponse.json({ id: diagram._id.toString() });
}
