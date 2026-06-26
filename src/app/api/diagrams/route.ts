import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Diagram } from "@/lib/models/diagram";

/**
 * List every saved diagram's name, most recently updated first.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const diagrams = await Diagram.find({}, { name: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).lean();
  return NextResponse.json(diagrams.map((d) => ({ name: d.name, updatedAt: d.updatedAt })));
}

/**
 * Create a new, empty diagram with the given name.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = (await request.json()) as { name?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectToDatabase();
  const existing = await Diagram.findOne({ name: name.trim() }).lean();
  if (existing) {
    return NextResponse.json({ error: "A project with that name already exists" }, { status: 409 });
  }
  await Diagram.create({ name: name.trim(), nodes: [], edges: [] });
  return NextResponse.json({ ok: true });
}
