import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Folder } from "@/lib/models/folder";
import { Diagram } from "@/lib/models/diagram";
import { FlashcardSet } from "@/lib/models/flashcard-set";
import { requireUserId } from "@/lib/require-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Load a folder and the diagrams/flashcard sets it contains. Owner only.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const folder = await Folder.findById(id).lean();
  if (!folder || folder.ownerId.toString() !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [diagrams, flashcardSets] = await Promise.all([
    Diagram.find({ folderId: id, ownerId: userId }, { name: 1, visibility: 1, updatedAt: 1 }).lean(),
    FlashcardSet.find(
      { folderId: id, ownerId: userId },
      { name: 1, visibility: 1, updatedAt: 1, cards: 1 },
    ).lean(),
  ]);

  return NextResponse.json({
    id: folder._id.toString(),
    name: folder.name,
    diagrams: diagrams.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      visibility: d.visibility,
      updatedAt: d.updatedAt,
    })),
    flashcardSets: flashcardSets.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      visibility: s.visibility,
      updatedAt: s.updatedAt,
      cardCount: s.cards.length,
    })),
  });
}

/**
 * Rename a folder. Owner only.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const folder = await Folder.findById(id);
  if (!folder || folder.ownerId.toString() !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { name } = (await request.json()) as { name?: string };
  if (name) folder.name = name;
  await folder.save();
  return NextResponse.json({ ok: true });
}

/**
 * Delete a folder. Contained diagrams/flashcard sets are detached (kept,
 * folderId cleared), not deleted. Owner only.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const folder = await Folder.findById(id);
  if (!folder || folder.ownerId.toString() !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await Promise.all([
    Diagram.updateMany({ folderId: id }, { folderId: null }),
    FlashcardSet.updateMany({ folderId: id }, { folderId: null }),
    folder.deleteOne(),
  ]);
  return NextResponse.json({ ok: true });
}
