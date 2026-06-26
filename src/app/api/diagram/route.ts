import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Diagram } from "@/lib/models/diagram";
import type { DiagramDocument } from "@/lib/diagram-types";

const DIAGRAM_NAME = "k3s-platform";

/**
 * Load the single saved diagram, or null if it hasn't been created yet.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const diagram = await Diagram.findOne({ name: DIAGRAM_NAME }).lean();
  return NextResponse.json(diagram ? { nodes: diagram.nodes, edges: diagram.edges } : null);
}

/**
 * Replace the saved diagram's nodes and edges wholesale.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as DiagramDocument;

  await connectToDatabase();
  await Diagram.findOneAndUpdate(
    { name: DIAGRAM_NAME },
    { name: DIAGRAM_NAME, nodes: body.nodes, edges: body.edges },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}
