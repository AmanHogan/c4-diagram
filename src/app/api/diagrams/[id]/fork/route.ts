import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Diagram } from "@/lib/models/diagram";
import { requireUserId } from "@/lib/require-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Duplicate a public diagram into the current user's account as a private,
 * editable copy.
 */
export async function POST(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const original = await Diagram.findById(id).lean();
  if (!original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (original.visibility !== "public" && original.ownerId.toString() !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let copyName = `${original.name} (copy)`;
  let suffix = 2;
  while (await Diagram.findOne({ ownerId: userId, name: copyName }).lean()) {
    copyName = `${original.name} (copy ${suffix})`;
    suffix += 1;
  }

  const fork = await Diagram.create({
    name: copyName,
    ownerId: userId,
    visibility: "private",
    folderId: null,
    forkedFrom: original._id,
    nodes: original.nodes,
    edges: original.edges,
  });

  return NextResponse.json({ id: fork._id.toString() });
}
