import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Diagram } from "@/lib/models/diagram";
import { DEFAULT_DIAGRAM_NAME, type DiagramDocument } from "@/lib/diagram-types";

/**
 * Load the named diagram (`?name=`), or null if it hasn't been created yet.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = new URL(request.url).searchParams.get("name") ?? DEFAULT_DIAGRAM_NAME;
  await connectToDatabase();
  const diagram = await Diagram.findOne({ name }).lean();
  return NextResponse.json(diagram ? { nodes: diagram.nodes, edges: diagram.edges } : null);
}

/**
 * Replace the named diagram's (`?name=`) nodes and edges wholesale, creating
 * it if it doesn't exist yet.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = new URL(request.url).searchParams.get("name") ?? DEFAULT_DIAGRAM_NAME;
  const body = (await request.json()) as DiagramDocument;

  await connectToDatabase();
  await Diagram.findOneAndUpdate(
    { name },
    { name, nodes: body.nodes, edges: body.edges },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}

/**
 * Delete the named diagram (`?name=`).
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = new URL(request.url).searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  await connectToDatabase();
  await Diagram.deleteOne({ name });
  return NextResponse.json({ ok: true });
}
