import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Diagram } from "@/lib/models/diagram";
import { requireUserId } from "@/lib/require-user";
import type { DiagramDocument } from "@/lib/diagram-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Load a diagram by id. Owners get full access; anyone else only if it's
 * public (read-only on the client).
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const diagram = await Diagram.findById(id).populate("ownerId", "name").lean();
  if (!diagram) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const owner = diagram.ownerId as unknown as { _id: { toString(): string }; name: string };
  const isOwner = owner._id.toString() === userId;
  if (!isOwner && diagram.visibility !== "public") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isOwner) {
    await Diagram.updateOne({ _id: id }, { lastOpenedAt: new Date() });
  }

  return NextResponse.json({
    id: diagram._id.toString(),
    name: diagram.name,
    visibility: diagram.visibility,
    folderId: diagram.folderId,
    nodes: diagram.nodes,
    edges: diagram.edges,
    isOwner,
    ownerName: owner.name,
  });
}

/**
 * Update a diagram's contents/name/visibility/folder. Owner only.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const diagram = await Diagram.findById(id);
  if (!diagram || diagram.ownerId.toString() !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<DiagramDocument> & {
    name?: string;
    visibility?: "public" | "private";
    folderId?: string | null;
  };
  if (body.nodes) diagram.nodes = body.nodes as typeof diagram.nodes;
  if (body.edges) diagram.edges = body.edges as typeof diagram.edges;
  if (body.name) diagram.name = body.name;
  if (body.visibility) diagram.visibility = body.visibility;
  if (body.folderId !== undefined) diagram.folderId = body.folderId as never;
  diagram.lastOpenedAt = new Date();
  await diagram.save();

  return NextResponse.json({ ok: true });
}

/**
 * Delete a diagram. Owner only.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const diagram = await Diagram.findById(id);
  if (!diagram || diagram.ownerId.toString() !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await diagram.deleteOne();
  return NextResponse.json({ ok: true });
}
